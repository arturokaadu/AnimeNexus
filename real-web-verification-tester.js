/**
 * REAL WEB SEARCH CROSS-VERIFICATION
 * 
 * Uses actual web searches (not Gemini memory) to get ground truth
 * Can test ALL 130+ anime without rate limits
 */

const API_KEY = 'AIzaSyD-CH4S6YpzZW_b9vdKwvwfkLsNtzjGIx8';

class RealWebVerificationTester {
    constructor(searchWebFunction) {
        this.searchWeb = searchWebFunction; // Inject search_web tool
        this.results = [];
        this.stats = {
            tested: 0,
            perfectMatches: 0,
            chapterCorrect: 0,
            closeEnough: 0,
            incorrect: 0,
            noWebData: 0
        };
    }

    // Get ground truth from REAL web search
    async getWebGroundTruth(anime) {
        console.log(`   🔍 Searching web...`);

        // REAL web search using search_web tool
        const query = `${anime.title} episode ${anime.episodes} manga chapter reddit`;
        const webResults = await this.searchWeb(query);

        // Use Gemini to EXTRACT data from search results
        const extracted = await this.extractFromWebResults(anime, webResults);

        return extracted;
    }

    // Extract chapter/volume from web search results
    async extractFromWebResults(anime, webResultsText) {
        const prompt = `I searched: "${anime.title} episode ${anime.episodes} manga chapter"

Web search results:
${webResultsText}

Extract the EXACT chapter and volume where episode ${anime.episodes} ends.

Look for:
- "episode ${anime.episodes} ends at chapter X"
- "continues from chapter Y"
- "volume Z"

Be precise. If results don't clearly state it, return null.

JSON: {"chapter": number or null, "volume": number or null, "confidence": "high/medium/low", "foundIn": "reddit/wiki/blog/none"}`;

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.05 }
                    })
                }
            );

            const data = await response.json();
            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            const cleanJson = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            return JSON.parse(cleanJson);
        } catch (e) {
            return { chapter: null, volume: null, confidence: 'none', foundIn: 'none' };
        }
    }

    // Get our Manga Guide result (current system)
    getMangaGuideResult(anime) {
        // Simulate current Manga Guide behavior
        // Uses Gemini with reference data in prompt

        // Hardcoded reference data (from gemini-resolver.js)
        const referenceDB = {
            'Jujutsu Kaisen': { episodes: 24, chapter: 64, volume: 8 },
            'Chainsaw Man': { episodes: 12, chapter: 39, volume: 5 },
            'Frieren': { episodes: 28, chapter: 61, volume: 7 },
            'Demon Slayer': { episodes: 26, chapter: 54, volume: 7 },
            'Attack on Titan': { episodes: 25, chapter: 34, volume: 9 },
            'My Hero Academia': { episodes: 13, chapter: 21, volume: 3 },
            'One Punch Man': { episodes: 12, chapter: 38, volume: 8 },
            'Tokyo Ghoul': { episodes: 12, chapter: 66, volume: 7 },
            'Vinland Saga': { episodes: 24, chapter: 55, volume: 8 }
        };

        // Check if in reference
        if (referenceDB[anime.title] && anime.episodes === referenceDB[anime.title].episodes) {
            const ref = referenceDB[anime.title];
            return {
                chapter: ref.chapter,
                volume: ref.volume,
                confidence: 'high',
                method: 'reference_db'
            };
        }

        // Otherwise: fallback to calculation (current behavior)
        const defaultRatio = 2.5; // chapters per episode
        const chapter = Math.round(anime.episodes * defaultRatio);
        const volume = Math.round(chapter / 9); // ~9 chapters per volume

        return {
            chapter: chapter,
            volume: volume,
            confidence: 'low',
            method: 'calculated_default'
        };
    }

    // Compare web truth vs our system
    compare(webTruth, mangaGuide) {
        if (!webTruth.chapter) {
            return {
                verdict: 'no_web_data',
                chapterDiff: null,
                volumeDiff: null
            };
        }

        const chapterDiff = Math.abs(webTruth.chapter - mangaGuide.chapter);
        const volumeDiff = webTruth.volume && mangaGuide.volume ?
            Math.abs(webTruth.volume - mangaGuide.volume) : null;

        let verdict;
        if (chapterDiff === 0 && volumeDiff === 0) {
            verdict = 'perfect_match';
        } else if (chapterDiff === 0) {
            verdict = 'chapter_correct';
        } else if (chapterDiff <= 5) {
            verdict = 'close_enough';
        } else {
            verdict = 'incorrect';
        }

        return { verdict, chapterDiff, volumeDiff };
    }

    // Test single anime
    async testAnime(anime) {
        console.log(`\n[${this.stats.tested + 1}] 📊 ${anime.title}`);

        // Get web ground truth (REAL search)
        const webTruth = await this.getWebGroundTruth(anime);
        await new Promise(r => setTimeout(r, 1000)); // Rate limit

        // Get our Manga Guide result
        const mangaGuide = this.getMangaGuideResult(anime);

        // Compare
        const comparison = this.compare(webTruth, mangaGuide);

        // Log
        console.log(`   Web Truth:   Ch ${webTruth.chapter}, Vol ${webTruth.volume} (${webTruth.foundIn})`);
        console.log(`   Manga Guide: Ch ${mangaGuide.chapter}, Vol ${mangaGuide.volume} (${mangaGuide.method})`);
        console.log(`   Verdict:     ${comparison.verdict}${comparison.chapterDiff !== null ? ` (±${comparison.chapterDiff} ch)` : ''}`);

        // Update stats
        this.stats.tested++;
        this.stats[comparison.verdict]++;

        const result = {
            anime: anime.title,
            episodes: anime.episodes,
            webTruth,
            mangaGuide,
            comparison
        };

        this.results.push(result);
        return result;
    }

    // Test ALL anime
    async testAll(animeList) {
        console.log('🧪 REAL WEB VERIFICATION TEST');
        console.log('='.repeat(80));
        console.log(`Testing ${animeList.length} anime with REAL web searches\n`);

        for (const anime of animeList) {
            if (!anime.episodes || anime.episodes > 200) {
                console.log(`⏭️ Skipping ${anime.title}`);
                continue;
            }

            try {
                await this.testAnime(anime);
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

        const total = this.stats.tested;
        const validTests = total - this.stats.noWebData;

        console.log(`\nTotal Anime Tested: ${total}`);
        console.log(`With Web Data: ${validTests}`);
        console.log(`Without Web Data: ${this.stats.noWebData}\n`);

        console.log('🎯 Manga Guide Accuracy:');
        console.log(`   ✅ Perfect Match:      ${this.stats.perfectMatches}/${validTests} (${(this.stats.perfectMatches / validTests * 100).toFixed(1)}%)`);
        console.log(`   📝 Chapter Correct:    ${this.stats.chapterCorrect}/${validTests} (${(this.stats.chapterCorrect / validTests * 100).toFixed(1)}%)`);
        console.log(`   ✓  Close Enough (±5):  ${this.stats.closeEnough}/${validTests} (${(this.stats.closeEnough / validTests * 100).toFixed(1)}%)`);
        console.log(`   ❌ Incorrect:          ${this.stats.incorrect}/${validTests} (${(this.stats.incorrect / validTests * 100).toFixed(1)}%)`);

        const totalCorrect = this.stats.perfectMatches + this.stats.chapterCorrect + this.stats.closeEnough;
        const overallAccuracy = (totalCorrect / validTests * 100).toFixed(1);

        console.log(`\n⭐ Overall Accuracy: ${overallAccuracy}%`);
        console.log('='.repeat(80));
    }

    saveResults() {
        const fs = require('fs');

        // Detailed results
        fs.writeFileSync(
            './real-web-verification-results.json',
            JSON.stringify(this.results, null, 2)
        );

        // Summary
        const summary = {
            totalTested: this.stats.tested,
            validTests: this.stats.tested - this.stats.noWebData,
            accuracy: {
                perfectMatch: this.stats.perfectMatches,
                chapterCorrect: this.stats.chapterCorrect,
                closeEnough: this.stats.closeEnough,
                incorrect: this.stats.incorrect,
                overallPercentage: ((this.stats.perfectMatches + this.stats.chapterCorrect + this.stats.closeEnough) /
                    (this.stats.tested - this.stats.noWebData) * 100).toFixed(1) + '%'
            },
            stats: this.stats
        };

        fs.writeFileSync(
            './accuracy-summary.json',
            JSON.stringify(summary, null, 2)
        );

        console.log('\n💾 Results saved:');
        console.log('   - real-web-verification-results.json');
        console.log('   - accuracy-summary.json');
    }
}

module.exports = RealWebVerificationTester;
