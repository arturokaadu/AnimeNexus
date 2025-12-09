/**
 * Vercel Serverless Function - INTELLIGENT Hybrid Manga Resolver
 * 
 * COMPLETE ALGORITHM:
 * 1. Check if anime is in verified DB
 * 2. If yes: Calculate adaptation ratio and predict for ANY episode
 * 3. If no: Fallback to Gemini AI
 * 
 * KEY FEATURE: Can predict chapters for episodes we don't have explicit data for!
 * Example: If we know JJK S1 (ep 24 → ch 64) and S2 (ep 47 → ch 137),
 * we can predict ep 30, ep 35, ep 40, etc. automatically!
 */

import verifiedDB from '../src/data/verified-anime-reference.json';

export default async function handler(req, res) {
    const { anime, episode } = req.query;

    if (!anime || !episode) {
        return res.status(400).json({ error: 'Missing anime or episode parameters' });
    }

    try {
        console.log(`[Intelligent Resolver] Query: "${anime}" Episode ${episode}`);

        // STEP 1: Try intelligent prediction with mathematical ratios
        const intelligentResult = intelligentPredict(anime, parseInt(episode));

        if (intelligentResult) {
            console.log(`[✅ ${intelligentResult.method}] Ch ${intelligentResult.continueFromChapter}, Vol ${intelligentResult.continueFromVolume}`);
            return res.status(200).json(intelligentResult);
        }

        // STEP 2: Fallback to Gemini AI
        console.log('[Gemini Fallback] Anime not in verified database, using AI...');

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const geminiResult = await queryGeminiAI(anime, episode, apiKey);
        return res.status(200).json(geminiResult);

    } catch (error) {
        console.error('[Resolver Error]', error);
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
 * INTELLIGENT PREDICTION - The Core Algorithm
 * Uses mathematical adaptation ratios to predict ANY episode
 */
function intelligentPredict(animeTitle, episodeNumber) {
    // Find anime in database (with fuzzy matching + aliases)
    const animeData = findAnimeInDB(animeTitle);

    if (!animeData) {
        console.log('[Intelligent Predict] Anime not in database');
        return null;
    }

    console.log(`[Intelligent Predict] Found "${animeData.matchedName}"`);

    // Calculate adaptation ratio
    const ratio = calculateAdaptationRatio(animeData.data);

    if (!ratio) {
        console.log('[Intelligent Predict] Could not calculate ratio');
        return null;
    }

    console.log(`[Ratio Info] ${ratio.avgRatio} ch/ep | Consistency: ${(ratio.consistency * 100).toFixed(0)}%`);

    // Check if we have exact data for this episode
    const exactMatch = animeData.data.verifiedSeasons.find(s => s.finalEpisode === episodeNumber);

    if (exactMatch) {
        // Perfect! We have verified data for this exact episode
        return {
            continueFromChapter: exactMatch.continueFromChapter,
            continueFromVolume: exactMatch.continueFromVolume,
            buyVolume: exactMatch.continueFromVolume,
            confidence: 'high',
            reasoning: `Episode ${episodeNumber} of ${animeData.matchedName}: ${exactMatch.notes}. Continue from chapter ${exactMatch.continueFromChapter}, volume ${exactMatch.continueFromVolume}.`,
            sourceMaterial: 'Manga',
            specialNotes: 'Verified data',
            verified: true,
            method: 'exact_match'
        };
    }

    // No exact match - USE MATHEMATICAL PREDICTION!
    const predictedChapter = Math.round(episodeNumber * ratio.avgRatio);
    const continueFromChapter = predictedChapter + 1; // Next chapter to read
    const predictedVolume = Math.round(continueFromChapter / ratio.avgChaptersPerVolume);

    // Confidence based on consistency of ratio
    let confidence = 'medium';
    if (ratio.consistency > 0.9) confidence = 'high';
    else if (ratio.consistency < 0.7) confidence = 'low';

    return {
        continueFromChapter: continueFromChapter,
        continueFromVolume: predictedVolume,
        buyVolume: predictedVolume,
        confidence: confidence,
        reasoning: `Calculated using ${animeData.matchedName}'s adaptation ratio of ${ratio.avgRatio} chapters/episode (${(ratio.consistency * 100).toFixed(0)}% consistent across ${ratio.dataPoints.length} verified season${ratio.dataPoints.length > 1 ? 's' : ''}). Episode ${episodeNumber} likely ends around chapter ${predictedChapter}.`,
        sourceMaterial: 'Manga',
        specialNotes: `Mathematical prediction - based on verified ${ratio.dataPoints.length} data point${ratio.dataPoints.length > 1 ? 's' : ''}`,
        verified: false,
        method: 'ratio_calculation'
    };
}

/**
 * Find anime in database with fuzzy matching + aliases
 */
function findAnimeInDB(animeTitle) {
    // Try exact match
    if (verifiedDB[animeTitle]) {
        return { matchedName: animeTitle, data: verifiedDB[animeTitle] };
    }

    // Try fuzzy match with aliases
    const normalizedSearch = animeTitle.toLowerCase();

    for (const [key, data] of Object.entries(verifiedDB)) {
        // Check main title
        if (key.toLowerCase() === normalizedSearch ||
            key.toLowerCase().includes(normalizedSearch) ||
            normalizedSearch.includes(key.toLowerCase())) {
            return { matchedName: key, data: data };
        }

        // Check aliases
        const aliases = data.aliases || [];
        const matchesAlias = aliases.some(alias =>
            alias.toLowerCase() === normalizedSearch ||
            alias.toLowerCase().includes(normalizedSearch) ||
            normalizedSearch.includes(alias.toLowerCase())
        );

        if (matchesAlias) {
            return { matchedName: key, data: data };
        }
    }

    return null;
}

/**
 * Calculate adaptation ratio from verified data
 */
function calculateAdaptationRatio(animeData) {
    if (!animeData?.verifiedSeasons || animeData.verifiedSeasons.length === 0) {
        return null;
    }

    // Extract data points
    const dataPoints = animeData.verifiedSeasons.map(season => {
        const chapterEnds = season.continueFromChapter - 1; // Chapter it ends at
        const ratio = chapterEnds / season.finalEpisode;
        return {
            episodes: season.finalEpisode,
            chapter: chapterEnds,
            ratio: ratio
        };
    });

    // Calculate average ratio
    const avgRatio = dataPoints.reduce((sum, dp) => sum + dp.ratio, 0) / dataPoints.length;

    // Calculate consistency (standard deviation)
    const variance = dataPoints.reduce((sum, dp) =>
        sum + Math.pow(dp.ratio - avgRatio, 2), 0
    ) / dataPoints.length;

    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, 1 - (stdDev / avgRatio)); // 0-1 scale

    // Average chapters per volume
    const volumeData = animeData.verifiedSeasons.filter(s => s.continueFromVolume);
    const avgChPerVol = volumeData.length > 0 ?
        Math.round(volumeData.reduce((sum, s) =>
            sum + ((s.continueFromChapter - 1) / s.continueFromVolume), 0
        ) / volumeData.length) : 9; // Default: 9 ch/vol

    return {
        avgRatio: parseFloat(avgRatio.toFixed(2)),
        consistency: parseFloat(consistency.toFixed(2)),
        dataPoints: dataPoints,
        avgChaptersPerVolume: avgChPerVol
    };
}

/**
 * Gemini AI fallback (for anime not in DB)
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

RESPOND IN EXACT JSON FORMAT:
{
    "continueFromChapter": number,
    "continueFromVolume": number,
    "buyVolume": number,
    "confidence": "medium",
    "reasoning": "Episode ${episode} is in [Season X/Arc Y]. This episode ends at chapter Z. Continue reading from chapter W.",
    "sourceMaterial": "Manga",
    "specialNotes": "Any important notes" or null
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
    result.verified = false;
    result.method = 'gemini_ai';

    console.log('[Gemini AI] Response:', result);
    return result;
}
