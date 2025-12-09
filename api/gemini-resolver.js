/**
 * Vercel Serverless Function - Gemini AI Manga Resolver
 * 
 * Given an anime title and episode number, returns exactly where to continue
 * reading the manga (chapter, volume, and purchase recommendation).
 * 
 * Requires GEMINI_API_KEY environment variable.
 */

export default async function handler(req, res) {
    const { anime, episode } = req.query;

    if (!anime || !episode) {
        return res.status(400).json({ error: 'Missing anime or episode parameters' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error: 'Server Misconfiguration',
            details: 'GEMINI_API_KEY is not set on the server.'
        });
    }

    try {
        console.log(`[Gemini API] Query: "${anime}" Episode ${episode}`);

        const prompt = `You are an expert on anime-to-manga chapter mapping. Your job is to tell the user EXACTLY which manga chapter and volume to continue reading after watching a specific anime episode.

ANIME TITLE: "${anime}"
EPISODE WATCHED: ${episode}

YOUR TASK:
1. Identify which manga chapter corresponds to episode ${episode} of "${anime}"
2. Tell me the NEXT chapter to read (the one AFTER what the anime covered)
3. Tell me which VOLUME contains that chapter
4. Recommend which volume to buy

VERIFIED REFERENCE DATA (use as calibration):
- Frieren: Beyond Journey's End (28 eps) ends at Chapter 60 → Continue from Ch 61, Volume 7
- Chainsaw Man Part 1 (12 eps) ends at Chapter 38 → Continue from Ch 39, Volume 5
- Jujutsu Kaisen S1 (24 eps) ends at Chapter 63 → Continue from Ch 64, Volume 8
- Jujutsu Kaisen S2 (23 eps, total 47 eps) ends at Chapter 136 → Continue from Ch 137, Volume 16
- Attack on Titan S1 (25 eps) ends at Chapter 33 → Continue from Ch 34, Volume 9
- Attack on Titan FULL (87 eps) ends at Chapter 139 (manga complete)
- Demon Slayer S1 (26 eps) ends at Chapter 53 → Continue from Ch 54, Volume 7
- Demon Slayer FULL (55 eps + movies) covers entire manga to Ch 205
- My Hero Academia S7 (~153 total eps) ends at Chapter 423 (manga complete)
- Spy x Family S1 (25 eps) ends at Chapter 38 → Continue from Ch 39, Volume 7
- Vinland Saga S1 (24 eps) ends at Chapter 54 → Continue from Ch 55, Volume 8
- Vinland Saga S2 (24 eps, total 48 eps) ends at Chapter 99 → Continue from Ch 100, Volume 14
- One Punch Man S1 (12 eps) ends at Chapter 37 → Continue from Ch 38, Volume 8
- One Punch Man S2 (12 eps, total 24 eps) ends at Chapter 84 → Continue from Ch 85, Volume 17
- Blue Lock (24 eps) ends at Chapter 108 → Continue from Ch 109, Volume 13
- Solo Leveling S1 (12 eps) ends at Chapter 45 → Continue from Ch 46
- Tokyo Revengers S1 (24 eps) ends at Chapter 73 → Continue from Ch 74, Volume 9
- Naruto (220 eps) ends at Chapter 238 → Continue from Ch 239 or start Shippuden
- Naruto Shippuden (500 eps) ends at Chapter 700 (manga complete)
- One Piece (1000+ eps) - approximately 2 chapters per episode
- Dragon Ball Z (291 eps) covers entire manga from Ch 195-519
- Bleach TYBW (26 eps S1) starts at Chapter 480
- Death Note (37 eps) covers entire manga (108 chapters)
- Fullmetal Alchemist Brotherhood (64 eps) covers entire manga (108 chapters)
- Hunter x Hunter 2011 (148 eps) ends at Chapter 339 → Continue from Ch 340

IMPORTANT RULES:
1. For episodes in-between seasons, calculate proportionally using ~2-3 chapters per episode
2. If the anime is ORIGINAL (no manga source, like Cowboy Bebop, Code Geass, Steins;Gate), say so clearly
3. If based on a Light Novel (like Sword Art Online, Re:Zero, Konosuba), indicate it's a Light Novel, not manga
4. If the anime FULLY adapted the manga, mention that no continuation is needed
5. BE PRECISE - users rely on this to not miss or repeat content

RESPOND ONLY IN THIS JSON FORMAT:
{
    "continueFromChapter": number or null,
    "continueFromVolume": number or null,
    "buyVolume": number or null,
    "confidence": "high" | "medium" | "low",
    "reasoning": "Episode ${episode} of ${anime} covers up to manga chapter X. Continue reading from chapter Y, which is in Volume Z.",
    "sourceMaterial": "Manga" | "Light Novel" | "Web Novel" | "Original" | "Visual Novel",
    "specialNotes": "Any special notes about movies, OVAs, or if the anime is complete" or null
}`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.1, // Muy bajo para máxima consistencia
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

        // Clean and parse JSON response
        const cleanJson = aiText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const result = JSON.parse(cleanJson);

        console.log('[Gemini API] Response:', result);
        return res.status(200).json(result);

    } catch (error) {
        console.error('[Gemini Resolver Error]', error);
        return res.status(500).json({
            error: error.message,
            continueFromChapter: null,
            continueFromVolume: null,
            confidence: 'low',
            reasoning: 'Error al obtener datos del servicio AI.'
        });
    }
}
