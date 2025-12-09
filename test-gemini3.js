/**
 * Test Gemini 3 Pro with Jujutsu Kaisen
 */

const API_KEY = 'AIzaSyD-CH4S6YpzZW_b9vdKwvwfkLsNtzjGIx8';

async function testGemini3Pro() {
    console.log('🧪 Testing Gemini 3 Pro Preview...\n');

    const prompt = `You are an expert on anime-to-manga chapter mapping. Your job is to tell the user EXACTLY which manga chapter and volume to continue reading after watching a specific anime episode.

ANIME TITLE: "Jujutsu Kaisen"
EPISODE WATCHED: 24

YOUR TASK:
1. Identify which manga chapter corresponds to episode 24 of "Jujutsu Kaisen"
2. Tell me the NEXT chapter to read (the one AFTER what the anime covered)
3. Tell me which VOLUME contains that chapter
4. Recommend which volume to buy

VERIFIED REFERENCE DATA (use as calibration):
- Jujutsu Kaisen S1 (24 eps) ends at Chapter 63 → Continue from Ch 64, Volume 8

IMPORTANT RULES:
1. BE PRECISE - verify the exact volume number for the chapter
2. Double-check your volume calculation

RESPOND ONLY IN THIS JSON FORMAT:
{
    "continueFromChapter": number or null,
    "continueFromVolume": number or null,
    "buyVolume": number or null,
    "confidence": "high" | "medium" | "low",
    "reasoning": "Episode 24 of Jujutsu Kaisen covers up to manga chapter X. Continue reading from chapter Y, which is in Volume Z.",
    "sourceMaterial": "Manga" | "Light Novel" | "Web Novel" | "Original" | "Visual Novel",
    "specialNotes": "Any special notes about movies, OVAs, or if the anime is complete" or null
}`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${API_KEY}`,
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

        console.log(`📡 Status: ${response.status}\n`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Error:\n${errorText}`);
            return;
        }

        const data = await response.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!aiText) {
            console.error('❌ Empty response');
            return;
        }

        const cleanJson = aiText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const result = JSON.parse(cleanJson);

        console.log('✅ Gemini 3 Pro Response:');
        console.log(JSON.stringify(result, null, 2));
        console.log('\n');

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

testGemini3Pro();
