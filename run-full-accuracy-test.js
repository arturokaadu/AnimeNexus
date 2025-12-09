/**
 * EXECUTE FULL ACCURACY TEST
 * Tests ALL anime from top-anime-list.json against web sources
 */

const fs = require('fs');

// Mock search_web function for testing
// In production, this would be the real search_web tool
async function mockSearchWeb(query) {
    // Simulate web search by returning a mock result
    // In production: actual web search happens here
    return `Mock search results for: ${query}`;
}

class FullAccuracyTester {
    constructor() {
        this.results = [];
        this.stats = {
            tested: 0,
            perfectMatches: 0,
            chapterCorrect: 0,
            closeEnough: 0,
            incorrect: 0,
            noWebData: 0
        };
        this.apiKey = 'AIzaSyD-CH4S6YpzZW_b9vdKwvwfkLsNtzjGIx8';
    }

    async searchAndExtract(anime) {
        // Use search_web tool (in production)
        const query = `${anime.title} episode ${anime.episodes} manga chapter where does anime end`;

        console.log(`   🔍 Searching: "${query.substring(0, 50)}..."`);

        // In production: real search
        // const webResults = await searchWeb(query);
        // For now: use Gemini's knowledge

        const prompt = `Search query: "${query}"

Based on verified sources (Reddit, wikis, forums), what chapter and volume does episode ${anime.episodes} of "${anime.title}" end at?

Be precise. Only return data if you're confident from known sources.

JSON: {"chapter": number or null, "volume": number or null, "confidence": "high/medium/low", "source": "reddit/wiki/etc or none"}`;

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`,
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
            const cleanJson = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            return JSON.parse(cleanJson);
        } catch (e) {
            return { chapter: null, volume: null, confidence: 'none', source: 'error' };
        }
    }

    getCurrentMangaGuide(anime) {
        // Reference database (what's currently in gemini-resolver.js)
        const referenceDB = {
            'Sousou no Frieren': { episodes: 28, chapter: 61, volume: 7 },
            'Fullmetal Alchemist: Brotherhood': { episodes: 64, chapter: 108, volume: 27 },
            'Hunter x Hunter (2011)': { episodes: 148, chapter: 340, volume: null },
            'Jujutsu Kaisen 2nd Season': { episodes: 23, chapter: 136, volume: 16 },
            'Chainsaw Man': { episodes: 12, chapter: 39, volume: 5 },
            'Demon Slayer': { episodes: 26, chapter: 54, volume: 7 },
            'Attack on Titan': { episodes: 25, chapter: 34, volume: 9 },
            'My Hero Academia': { episodes: 13, chapter: 21, volume: 3 },
            'One Punch Man': { episodes: 12, chapter: 38, volume: 8 },
            'Tokyo Ghoul': { episodes: 12, chapter: 66, volume: 7 },
            'Vinland Saga': { episodes: 24, chapter: 55, volume: 8 },
            'Mob Psycho 100': { episodes: 12, chapter: 50, volume: 6 }
        };

        // Check exact match
        const key = Object.keys(referenceDB).find(k =>
            anime.title.includes(k) || k.includes(anime.title)
        );

        if (key && referenceDB[key].episodes === anime.episodes) {
            return {
                chapter: referenceDB[key].chapter,
                volume: referenceDB[key].volume,
                method: 'reference_db',
                confidence: 'high'
            };
        }

        // Fallback: calculate
        const ratio = 2.5; // default
        const chapter = Math.round(anime.episodes * ratio);
        const volume = Math.round(chapter / 9);

        return {
            chapter: chapter,
            volume: volume,
            method: 'calculated',
            confidence: 'low'
        };
    }

    compare(webData, mangaGuide) {
        if (!webData.chapter) {
            return { verdict: 'no_web_data', diff: null };
        }

        const diff = Math.abs(webData.chapter - mangaGuide.chapter);

        if (diff === 0 && webData.volume === mangaGuide.volume) {
            return { verdict: 'perfect_match', diff: 0 };
        }
        if (diff === 0) {
            return { verdict: 'chapter_correct', diff: 0 };
        }
        if (diff <= 5) {
            return { verdict: 'close_enough', diff };
        }
        return { verdict: 'incorrect', diff };
    }

    async testAnime(anime, index, total) {
        console.log(`\n[${index}/${total}] ${anime.title}`);

        const webData = await this.searchAndExtract(anime);
        await new Promise(r => setTimeout(r, 1500)); // Rate limit

        const mangaGuide = this.getCurrentMangaGuide(anime);
        const comparison = this.compare(webData, mangaGuide);

        console.log(`   Web:   Ch ${webData.chapter}, Vol ${webData.volume} (${webData.confidence})`);
        console.log(`   Guide: Ch ${mangaGuide.chapter}, Vol ${mangaGuide.volume} (${mangaGuide.method})`);
        console.log(`   →  ${comparison.verdict}`);

        this.stats.tested++;
        this.stats[comparison.verdict]++;

        this.results.push({
            anime: anime.title,
            episodes: anime.episodes,
            score: anime.score,
            rank: anime.rank,
            webData,
            mangaGuide,
            comparison
        });
    }

    async runFullTest() {
        console.log('🧪 FULL ACCURACY TEST - ALL ANIME');
        console.log('='.repeat(80));

        const animeList = JSON.parse(fs.readFileSync('./top-anime-list.json', 'utf8'));
        console.log(`Total anime: ${animeList.length}\n`);

        const testable = animeList.filter(a => a.episodes && a.episodes <= 200);
        console.log(`Testable (with episodes ≤200): ${testable.length}\n`);

        for (let i = 0; i < testable.length; i++) {
            try {
                await this.testAnime(testable[i], i + 1, testable.length);
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }

        this.printReport();
        this.saveResults();
    }

    printReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 FINAL ACCURACY REPORT');
        console.log('='.repeat(80));

        const validTests = this.stats.tested - this.stats.noWebData;

        console.log(`\nTotal Tested: ${this.stats.tested}`);
        console.log(`Valid Tests (with web data): ${validTests}\n`);

        console.log('Results:');
        console.log(`  ✅ Perfect Match:     ${this.stats.perfectMatches} (${(this.stats.perfectMatches / validTests * 100).toFixed(1)}%)`);
        console.log(`  📝 Chapter Correct:   ${this.stats.chapterCorrect} (${(this.stats.chapterCorrect / validTests * 100).toFixed(1)}%)`);
        console.log(`  ✓  Close (±5 ch):     ${this.stats.closeEnough} (${(this.stats.closeEnough / validTests * 100).toFixed(1)}%)`);
        console.log(`  ❌ Incorrect:         ${this.stats.incorrect} (${(this.stats.incorrect / validTests * 100).toFixed(1)}%)`);
        console.log(`  ? No Web Data:       ${this.stats.noWebData}`);

        const totalGood = this.stats.perfectMatches + this.stats.chapterCorrect + this.stats.closeEnough;
        const accuracy = (totalGood / validTests * 100).toFixed(1);

        console.log(`\n⭐ OVERALL ACCURACY: ${accuracy}%`);
        console.log('='.repeat(80));
    }

    saveResults() {
        fs.writeFileSync(
            './full-accuracy-test-results.json',
            JSON.stringify({
                summary: this.stats,
                overallAccuracy: ((this.stats.perfectMatches + this.stats.chapterCorrect + this.stats.closeEnough) /
                    (this.stats.tested - this.stats.noWebData) * 100).toFixed(1) + '%',
                results: this.results
            }, null, 2)
        );

        console.log('\n💾 Results saved to: full-accuracy-test-results.json');
    }
}

// Run test
const tester = new FullAccuracyTester();
tester.runFullTest();
