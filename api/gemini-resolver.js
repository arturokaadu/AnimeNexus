/**
 * Vercel Serverless Function - Hybrid Manga Resolver
 * 
 * STRATEGY:
 * 1. Check verified database first (100% accurate)
 * 2. If not found, use Gemini AI (estimated)
 */

// Import verified database directly (works in Vercel)
import verifiedDB from '../src/data/verified-anime-reference.json';

export default async function handler(req, res) {
    const { anime, episode } = req.query;

    if (!anime || !episode) {
        return res.status(400).json({ error: 'Missing anime or episode parameters' });
    }

    try {
        console.log(`[Manga Resolver] Query: "${anime}" Episode ${episode}`);

        // STEP 1: Check verified database
        const verifiedResult = checkVerifiedDatabase(anime, parseInt(episode));

        if (verifiedResult) {
            console.log('[Verified DB] ✅ Found exact match');
            return res.status(200).json(verifiedResult);
        }

        // STEP 2: Fallback to Gemini AI
        console.log('[Verified DB] Not found, using Gemini AI fallback');

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const geminiResult = await queryGeminiAI(anime, episode, apiKey);
        return res.status(200).json(geminiResult);

    } catch (error) {
        console.error('[Manga Resolver Error]', error);
        return res.status(500).json({
            error: error.message,
            continueFromChapter: null,
            continueFromVolume: null,
            confidence: 'low',
            reasoning: 'Error al obtener datos del servicio.'
        });
    }
}

/**
 * Check verified database for exact match
 */
function checkVerifiedDatabase(animeTitle, episodeNumber) {
    console.log(`[Verified DB] Searching for "${animeTitle}" episode ${episodeNumber}`);

    // Try exact match first
    let animeData = verifiedDB[animeTitle];

    // If not found, try fuzzy match with aliases
    if (!animeData) {
        const normalizedSearch = animeTitle.toLowerCase();
        const matchingKey = Object.keys(verifiedDB).find(key => {
            // Check main title
            if (key.toLowerCase() === normalizedSearch ||
                key.toLowerCase().includes(normalizedSearch) ||
                normalizedSearch.includes(key.toLowerCase())) {
                return true;
            }

            // Check aliases
            const aliases = verifiedDB[key].aliases || [];
            return aliases.some(alias =>
                alias.toLowerCase() === normalizedSearch ||
                alias.toLowerCase().includes(normalizedSearch) ||
                normalizedSearch.includes(alias.toLowerCase())
            );
        });

        if (matchingKey) {
            console.log(`[Verified DB] Fuzzy matched: "${matchingKey}"`);
            animeData = verifiedDB[matchingKey];
        }
    }

    if (!animeData) {
        console.log('[Verified DB] Anime not in database');
        return null;
    }

    // Find season matching episode number
    const season = animeData.verifiedSeasons.find(s => s.finalEpisode === episodeNumber);

    if (!season) {
        console.log(`[Verified DB] Episode ${episodeNumber} not found for this anime`);
        return null;
    }

    // Return verified data
    console.log(`[Verified DB] ✅ Match found: Ch ${season.continueFromChapter}, Vol ${season.continueFromVolume}`);

    return {
        continueFromChapter: season.continueFromChapter,
        continueFromVolume: season.continueFromVolume,
        buyVolume: season.continueFromVolume,
        confidence: 'high',
        reasoning: `Episode ${episodeNumber} of ${animeTitle} ends at chapter ${season.continueFromChapter - 1}. Continue reading from chapter ${season.continueFromChapter}, which is in Volume ${season.continueFromVolume}. ${season.notes}`,
        sourceMaterial: 'Manga',
        specialNotes: season.notes,
        verified: true
    };
}

/**
 * Query Gemini AI for prediction (fallback)
 */
async function queryGeminiAI(anime, episode, apiKey) {
    console.log('[Gemini AI] Generating prediction...');

    const prompt = `You are an EXPERT on anime-to-manga chapter mapping.

ANIME TITLE: "${anime}"
EPISODE NUMBER: ${episode}

CRITICAL INSTRUCTIONS:
1. If this anime has multiple seasons, FIRST determine which season episode ${episode} belongs to
2. ONLY provide information for THAT SPECIFIC SEASON/ARC 
3. Do NOT provide information about other seasons
4. Provide the EXACT manga chapter where episode ${episode} ends
5. Tell me the NEXT chapter to start reading (chapter AFTER that episode)

Example: If asked about "Jujutsu Kaisen Episode 47":
- Episode 47 is in Season 2 (episodes 25-47)
- Season 2 ends at Chapter 136
- Continue from: Chapter 137, Volume 16
- DO NOT mention Season 1 info

RESPOND IN EXACT JSON FORMAT:
{
    "continueFromChapter": number,
    "continueFromVolume": number,
    "buyVolume": number,
    "confidence": "medium",
    "reasoning": "Episode ${episode} is in [Season X/Arc Y]. This episode ends at chapter Z. Continue reading from chapter W.",
    "sourceMaterial": "Manga",
    "specialNotes": "Any important notes about this specific season" or null
}

REMEMBER: Only provide info for the season containing episode ${episode}. Never mention other seasons.`;


    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.9
                }
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[Gemini API Error]', response.status, errorText);
        throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
        throw new Error('Empty response from AI');
    }

    const cleanJson = aiText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

    const result = JSON.parse(cleanJson);
    result.verified = false; // Mark as AI prediction

    console.log('[Gemini AI] Response:', result);
    return result;
}
