/**
 * Test specific anime cases that are failing
 */

const API_KEY = 'AIzaSyD-CH4S6YpzZW_b9vdKwvwfkLsNtzjGIx8';

async function testAnimeCase(animeName, episode) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 Testing: "${animeName}" - Episode ${episode}`);
    console.log('='.repeat(70));

    const prompt = `You are an expert on anime-to-manga chapter mapping. Your job is to tell the user EXACTLY which manga chapter and volume to continue reading after watching a specific anime episode.

ANIME TITLE: "${animeName}"
EPISODE WATCHED: ${episode}

YOUR TASK:
1. Identify which manga chapter corresponds to episode ${episode} of "${animeName}"
2. Tell me the NEXT chapter to read (the one AFTER what the anime covered)
3. Tell me which VOLUME contains that chapter
4. Recommend which volume to buy

VERIFIED REFERENCE DATA (use as calibration):
- Frieren: Beyond Journey's End (28 eps) ends at Chapter 60 → Continue from Ch 61, Volume 7
- Chainsaw Man Part 1 (12 eps) ends at Chapter 38 → Continue from Ch 39, Volume 5
- Jujutsu Kaisen S1 (24 eps) ends at Chapter 63 → Continue from Ch 64, Volume 8
- Jujutsu Kaisen S2 (23 eps, total 47 eps) ends at Chapter 136 → Continue from Ch 137, Volume 16

IMPORTANT RULES:
1. For episodes in-between seasons, calculate proportionally using ~2-3 chapters per episode
2. If the anime is ORIGINAL (no manga source), say so clearly
3. If based on a Light Novel, indicate it's a Light Novel, not manga
4. If the anime FULLY adapted the manga, mention that no continuation is needed
5. BE PRECISE - users rely on this to not miss or repeat content

RESPOND ONLY IN THIS JSON FORMAT:
{
    "continueFromChapter": number or null,
    "continueFromVolume": number or null,
    "buyVolume": number or null,
    "confidence": "high" | "medium" | "low",
    "reasoning": "Episode ${episode} of ${animeName} covers up to manga chapter X. Continue reading from chapter Y, which is in Volume Z.",
    "sourceMaterial": "Manga" | "Light Novel" | "Web Novel" | "Original" | "Visual Novel",
    "specialNotes": "Any special notes about movies, OVAs, or if the anime is complete" or null
}`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
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

        console.log(`\n📡 Status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API Error:\n${errorText}`);
            return;
        }

        const data = await response.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!aiText) {
            console.error('❌ Empty response from AI');
            return;
        }

        // Clean and parse JSON
        const cleanJson = aiText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const result = JSON.parse(cleanJson);

        console.log('\n✅ Response:');
        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        if (error.stack) {
            console.error(error.stack);
        }
    }
}

async function runTests() {
    console.log('\n🔬 Testing Problematic Cases\n');

    // Test Jujutsu Kaisen
    await testAnimeCase('Jujutsu Kaisen', 24);

    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test Chainsaw Man
    await testAnimeCase('Chainsaw Man', 12);

    console.log('\n' + '='.repeat(70));
    console.log('✅ Tests Complete');
    console.log('='.repeat(70) + '\n');
}

runTests();
