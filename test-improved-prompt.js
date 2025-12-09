/**
 * Test improved prompt with JJK edge cases
 */

const API_KEY = 'AIzaSyD-CH4S6YpzZW_b9vdKwvwfkLsNtzjGIx8';

async function testImprovedPrompt() {
    console.log('🧪 Testing Improved Prompt\n');
    console.log('='.repeat(70));

    const testCases = [
        { anime: 'Jujutsu Kaisen', episode: 24, expected: 'Vol 8' },
        { anime: 'Jujutsu Kaisen', episode: 47, expected: 'Vol 16' },
        { anime: 'My Hero Academia', episode: 24, expected: 'Not Vigilantes' }
    ];

    for (const test of testCases) {
        console.log(`\n📺 Test: ${test.anime} - Episode ${test.episode}`);
        console.log(`   Expected: ${test.expected}`);
        console.log('-'.repeat(70));

        const prompt = `You are an EXPERT on anime-to-manga chapter mapping. Users RELY on your accuracy to avoid missing or repeating content.

ANIME TITLE: "${test.anime}"
EPISODE NUMBER: ${test.episode}

CRITICAL TASK:
1. FIRST: Determine if this anime has multiple seasons
2. THEN: Figure out which season/arc episode ${test.episode} belongs to based on TOTAL episode count
3. Find the EXACT manga chapter where that episode ends
4. Tell me the NEXT chapter to read (chapter AFTER the anime covered)
5. Tell me the EXACT VOLUME number for that chapter
6. Recommend which volume to purchase

VERIFIED REFERENCE DATA - USE THESE AS TRUTH:
- Jujutsu Kaisen S1 (eps 1-24) ends at Ch 63 → Continue from Ch 64, Vol 8
- Jujutsu Kaisen S2 (eps 25-47 total) ends at Ch 136 → Continue from Ch 137, Vol 16
- My Hero Academia S1 (13 eps) → Ch 21, Vol 3
- My Hero Academia S2 (eps 14-38 total) → Ch 70, Vol 8

CRITICAL RULES:
1. **SEASON DETECTION**: If user says "episode 47" for Jujutsu Kaisen, that means S2 final → Vol 16, NOT S1
2. **EPISODE COUNTING**: Episode numbers continue across seasons (ep 25 = S2 ep 1)
3. **SPIN-OFFS**: My Hero Academia Vigilantes is DIFFERENT from My Hero Academia - don't confuse them
4. **If UNCERTAIN** about season: Provide answer for MOST LIKELY season based on episode count

RESPOND IN THIS EXACT JSON FORMAT:
{
    "continueFromChapter": number or null,
    "continueFromVolume": number or null,
    "buyVolume": number or null,
    "confidence": "high" | "medium" | "low",
    "reasoning": "Episode ${test.episode} of ${test.anime} is in [Season X]. This covers up to manga chapter Y. Continue reading from chapter Z, which is in Volume W.",
    "sourceMaterial": "Manga" | "Light Novel" | "Web Novel" | "Original" | "Visual Novel",
    "specialNotes": "Important context" or null
}`;

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.1, topP: 0.9 }
                    })
                }
            );

            if (!response.ok) {
                console.error(`❌ API Error: ${response.status}`);
                continue;
            }

            const data = await response.json();
            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            const cleanJson = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const result = JSON.parse(cleanJson);

            console.log(`✅ Volume: ${result.continueFromVolume}`);
            console.log(`   Chapter: ${result.continueFromChapter}`);
            console.log(`   Confidence: ${result.confidence}`);
            console.log(`   Reasoning: ${result.reasoning.substring(0, 100)}...`);

        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n' + '='.repeat(70));
}

testImprovedPrompt();
