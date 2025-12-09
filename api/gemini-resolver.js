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

        const prompt = `You are an EXPERT on anime-to-manga chapter mapping. Users RELY on your accuracy to avoid missing or repeating content.

ANIME TITLE: "${anime}"
EPISODE NUMBER: ${episode}

CRITICAL TASK:
1. FIRST: Determine if this anime has multiple seasons
2. THEN: Figure out which season/arc episode ${episode} belongs to based on TOTAL episode count
3. Find the EXACT manga chapter where that episode ends
4. Tell me the NEXT chapter to read (chapter AFTER the anime covered)
5. Tell me the EXACT VOLUME number for that chapter
6. Recommend which volume to purchase

VERIFIED REFERENCE DATA - USE THESE AS TRUTH:
- Jujutsu Kaisen S1 (eps 1-24) ends at Ch 63 → Continue from Ch 64, Vol 8
- Jujutsu Kaisen S2 (eps 25-47 total) ends at Ch 136 → Continue from Ch 137, Vol 16
- Chainsaw Man (12 eps) ends at Ch 38 → Continue from Ch 39, Vol 5
- Frieren (28 eps) ends at Ch 60 → Continue from Ch 61, Vol 7
- My Hero Academia S1 (13 eps) → Ch 21, Vol 3
- My Hero Academia S2 (eps 14-38 total) → Ch 70, Vol 8
- My Hero Academia S3 (eps 39-63 total) → Ch 124, Vol 14
- My Hero Academia S4 (eps 64-88 total) → Ch 190, Vol 21
- My Hero Academia S5 (eps 89-113 total) → Ch 257, Vol 27
- My Hero Academia S6 (eps 114-138 total) → Ch 328, Vol 33
- My Hero Academia S7 (eps 139-163+ total) → Ch 423, Vol 42 (FINAL)
- Attack on Titan S1 (25 eps) → Ch 33, Vol 9
- Attack on Titan FULL (87 eps total) → Ch 139 (complete)
- Demon Slayer S1 (26 eps) → Ch 53, Vol 7
- Demon Slayer FULL (~55 eps + movies) → Ch 205 (complete)
- Spy x Family S1 (25 eps) → Ch 38, Vol 7
- Vinland Saga S1 (24 eps) → Ch 54, Vol 8
- Vinland Saga S2 (eps 25-48 total) → Ch 99, Vol 14
- One Punch Man S1 (12 eps) → Ch 37, Vol 8
- One Punch Man  S2 (eps 13-24 total) → Ch 84, Vol 17
- Blue Lock (24 eps) → Ch 108, Vol 13
- Solo Leveling S1 (12 eps) → Ch 45
- Tokyo Revengers S1 (24 eps) → Ch 73, Vol 9

CRITICAL RULES:
1. **SEASON DETECTION**: If user says "episode 47" for Jujutsu Kaisen, that means S2 final → Vol 16, NOT S1
2. **EPISODE COUNTING**: Episode numbers continue across seasons (ep 25 = S2 ep 1 for most anime)
3. **SPIN-OFFS**: My Hero Academia Vigilantes is DIFFERENT from My Hero Academia - don't confuse them
4. **LIGHT NOVELS**: SAO, Re:Zero, Konosuba, etc. are Light Novels, NOT manga
5. **ORIGINALS**: Cowboy Bebop, Code Geass have NO manga source
6. **ACCURACY**: Double-check your volume numbers - this is CRITICAL
7. **If UNCERTAIN** about season: Provide answer for MOST LIKELY season based on episode count

RESPOND IN THIS EXACT JSON FORMAT:
{
    "continueFromChapter": number or null,
    "continueFromVolume": number or null,
    "buyVolume": number or null,
    "confidence": "high" | "medium" | "low",
    "reasoning": "Episode ${episode} of ${anime} is in [Season X]. This covers up to manga chapter Y. Continue reading from chapter Z, which is in Volume W.",
    "sourceMaterial": "Manga" | "Light Novel" | "Web Novel" | "Original" | "Visual Novel",
    "specialNotes": "Important context: season info, movies, OVAs, or if anime is complete" or null
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
