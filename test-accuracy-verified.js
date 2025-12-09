/**
 * Practical Accuracy Test - 30 Popular Anime
 * Tests Gemini AI against commonly verified anime
 */

const API_KEY = 'AIzaSyD-CH4S6YpzZW_b9vdKwvwfkLsNtzjGIx8';

// Curated list of popular anime with VERIFIED chapter data from web sources
const VERIFIED_ANIME = [
    // Source: wheredoestheanimeleaveoff.com + Reddit
    { name: 'Demon Slayer', episode: 26, verified: { ch: 54, vol: 7 } },
    { name: 'Chainsaw Man', episode: 12, verified: { ch: 39, vol: 5 } },
    { name: 'Jujutsu Kaisen', episode: 24, verified: { ch: 64, vol: 8 } },
    { name: 'Jujutsu Kaisen', episode: 47, verified: { ch: 137, vol: 16 } },
    { name: 'Tokyo Revengers', episode: 24, verified: { ch: 74, vol: 9 } },
    { name: 'Blue Lock', episode: 24, verified: { ch: 109, vol: 13 } },

    // Source: Reddit r/anime + MAL forums
    { name: 'Attack on Titan', episode: 25, verified: { ch: 34, vol: 9 } },
    { name: 'My Hero Academia', episode: 13, verified: { ch: 21, vol: 3 } },
    { name: 'One Punch Man', episode: 12, verified: { ch: 38, vol: 8 } },
    { name: 'Tokyo Ghoul', episode: 12, verified: { ch: 66, vol: 7 } },
    { name: 'Vinland Saga', episode: 24, verified: { ch: 55, vol: 8 } },
    { name: 'Mob Psycho 100', episode: 12, verified: { ch: 50, vol: 6 } },

    // Source: Official wikis + Stack Exchange
    { name: 'The Promised Neverland', episode: 12, verified: { ch: 38, vol: 5 } },
    { name: 'Dr. Stone', episode: 24, verified: { ch: 61, vol: 7 } },
    { name: 'Fire Force', episode: 24, verified: { ch: 90, vol: 11 } },
    { name: 'Spy x Family', episode: 25, verified: { ch: 39, vol: 7 } },

    // Classics - Source: Multiple forums
    { name: 'Death Note', episode: 37, verified: { ch: 108, vol: 12 } },
    { name: 'Fullmetal Alchemist Brotherhood', episode: 64, verified: { ch: 108, vol: 27 } },
    { name: 'Hunter x Hunter 2011', episode: 148, verified: { ch: 340, vol: null } },
    { name: 'Parasyte', episode: 24, verified: { ch: 64, vol: 8 } },

    // Recent hits
    { name: 'Solo Leveling', episode: 12, verified: { ch: 46, vol: null } },
    { name: 'Frieren', episode: 28, verified: { ch: 61, vol: 7 } },
    { name: 'Bocchi the Rock', episode: 12, verified: { ch: 26, vol: 3 } },

    // Long runners
    { name: 'Naruto', episode: 220, verified: { ch: 239, vol: 27 } },
    { name: 'Bleach', episode: 366, verified: { ch: 423, vol: 48 } },

    // Add more as verified...
];

async function testSingleAnime(anime, episode) {
    const prompt = `ANIME: "${anime}", EPISODE: ${episode}

What chapter should I read next? Response only {{ "continueFromChapter": X, "continueFromVolume": Y }}`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.1 }
                })
            }
        );

        const data = await response.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const cleanJson = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/{{/g, '{').replace(/}}/g, '}').trim();

        return JSON.parse(cleanJson);
    } catch (error) {
        return null;
    }
}

async function runAccuracyTest() {
    console.log('🔬 MANGA GUIDE ACCURACY TEST');
    console.log('='.repeat(80));
    console.log(`Testing ${VERIFIED_ANIME.length} anime with verified data\n`);

    const results = [];
    let exactMatches = 0;
    let chapterMatches = 0;
    let failures = 0;

    for (const test of VERIFIED_ANIME) {
        process.stdout.write(`Testing ${test.name} (Ep ${test.episode})... `);

        const gemini = await testSingleAnime(test.name, test.episode);

        if (!gemini) {
            console.log('❌ API Error');
            failures++;
            continue;
        }

        const chapterMatch = gemini.continueFromChapter === test.verified.ch;
        const volumeMatch = !test.verified.vol || gemini.continueFromVolume === test.verified.vol;
        const exactMatch = chapterMatch && volumeMatch;

        if (exactMatch) {
            console.log(`✅ PERFECT`);
            exactMatches++;
            chapterMatches++;
        } else if (chapterMatch) {
            console.log(`✅ Chapter correct, Vol off (Got ${gemini.continueFromVolume} vs ${test.verified.vol})`);
            chapterMatches++;
        } else {
            console.log(`❌ WRONG (Got Ch ${gemini.continueFromChapter}, Vol ${gemini.continueFromVolume})`);
        }

        results.push({
            anime: test.name,
            episode: test.episode,
            verified: test.verified,
            gemini: gemini,
            exactMatch,
            chapterMatch
        });

        await new Promise(r => setTimeout(r, 1500)); // Rate limit
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 ACCURACY REPORT');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${VERIFIED_ANIME.length}`);
    console.log(`✅ Exact Matches (Ch + Vol): ${exactMatches} (${(exactMatches / VERIFIED_ANIME.length * 100).toFixed(1)}%)`);
    console.log(`📝 Chapter Correct: ${chapterMatches} (${(chapterMatches / VERIFIED_ANIME.length * 100).toFixed(1)}%)`);
    console.log(`❌ Failures: ${failures}`);
    console.log('='.repeat(80));

    // Save full results
    const fs = require('fs');
    fs.writeFileSync('./accuracy_test_results.json', JSON.stringify(results, null, 2));
    console.log('\n✅ Full results saved to accuracy_test_results.json');
}

runAccuracyTest();
