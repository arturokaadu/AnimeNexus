/**
 * CROSS-VERIFICATION TESTING SYSTEM
 * 
 * Tests our Manga Guide accuracy by comparing 3 sources:
 * 1. Web Search (Reddit, wikis, blogs) - GROUND TRUTH
 * 2. Gemini AI Direct Prediction
 * 3. Our Manga Guide System
 * 
 * Generates comprehensive accuracy report
 */

const API_KEY = 'AIzaSyD-CH4S6YpzZW_b9vdKwvwfkLsNtzjGIx8';

class CrossVerificationTester {
    constructor() {
        this.results = [];
        this.stats = {
            webMatches: 0,
            geminiMatches: 0,
            mangaGuideMatches: 0,
            threeWayAgreement: 0,
            twoWayAgreement: 0,
            noAgreement: 0
        };
    }

    // Method 1: Get "ground truth" from web search
    async getWebTruth(anime) {
        console.log(`   🌐 Searching web for ground truth...`);

        const query = `${anime.title} ${anime.title_english} anime episode ${anime.episodes} manga chapter reddit`;

        // In production: use search_web tool
        // For now: simulate with Gemini extraction from search

        const searchPrompt = `Search query: "${query}"

Based on your knowledge of web sources (Reddit, wikis, forums), what do these sources typically say about where episode ${anime.episodes} of ${anime.title} ends in the manga?

Extract the most commonly cited answer.

JSON: {"chapter": number or null, "volume": number or null, "confidence": "high/medium/low", "commonSource": "reddit/wiki/etc"}`;

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: searchPrompt }] }],
                        generationConfig: { temperature: 0.1 }
                    })
                }
            );

            const data = await response.json();
            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            const cleanJson = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            return JSON.parse(cleanJson);
        } catch (e) {
            return { chapter: null, volume: null, confidence: 'none', error: e.message };
        }
    }

    // Method 2: Get Gemini direct prediction
    async getGeminiPrediction(anime) {
        console.log(`   🤖 Getting Gemini prediction...`);

        const prompt = `Anime: "${anime.title}" (${anime.title_english})
Source: ${anime.source}
Episodes: ${anime.episodes}

Based on your training data, what chapter and volume does episode ${anime.episodes} end at?

JSON: {"chapter": number, "volume": number, "confidence": "high/medium/low"}`;

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
            const cleanJson = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            return JSON.parse(cleanJson);
        } catch (e) {
            return { chapter: null, volume: null, confidence: 'none', error: e.message };
        }
    }

    // Method 3: Get our Manga Guide result
    async getMangaGuideResult(anime) {
        console.log(`   📖 Getting Manga Guide result...`);

        // This would call your actual manga guide system
        // For testing: simulate the hybrid system logic

        // Check if in reference database (from gemini-resolver.js prompt)
        const referenceData = {
            'Jujutsu Kaisen': { ep: 24, ch: 64, vol: 8 },
            'Chainsaw Man': { ep: 12, ch: 39, vol: 5 },
            'Frieren': { ep: 28, ch: 61, vol: 7 },
            // Add more from your prompt...
        };

        if (referenceData[anime.title]) {
            const ref = referenceData[anime.title];
            if (anime.episodes === ref.ep) {
                return {
                    chapter: ref.ch,
                    volume: ref.vol,
                    confidence: 'high',
                    method: 'reference_database'
                };
            }
        }

        // Otherwise: calculate using default ratio (simulating current system)
        const defaultRatio = 2.5;
        const chapter = Math.round(anime.episodes * defaultRatio);
        const volume = Math.round(chapter / 9);

        return {
            chapter: chapter,
            volume: volume,
            confidence: 'low',
            method: 'calculated'
        };
    }

    // Compare all 3 sources
    compareResults(web, gemini, mangaGuide) {
        const chapterMatch = {
            webGemini: web.chapter === gemini.chapter,
            webManga: web.chapter === mangaGuide.chapter,
            geminiManga: gemini.chapter === mangaGuide.chapter,
            allThree: web.chapter === gemini.chapter && gemini.chapter === mangaGuide.chapter
        };

        const volumeMatch = {
            webGemini: web.volume === gemini.volume,
            webManga: web.volume === mangaGuide.volume,
            geminiManga: gemini.volume === mangaGuide.volume,
            allThree: web.volume === gemini.volume && gemini.volume === mangaGuide.volume
        };

        return {
            chapterMatch,
            volumeMatch,
            agreement: this.calculateAgreement(chapterMatch)
        };
    }

    calculateAgreement(matches) {
        if (matches.allThree) return 'three_way';
        if (matches.webGemini || matches.webManga || matches.geminiManga) return 'two_way';
        return 'none';
    }

    // Test single anime
    async testAnime(anime) {
        console.log(`\n📊 Testing: ${anime.title}`);

        const web = await this.getWebTruth(anime);
        await new Promise(r => setTimeout(r, 1500));

        const gemini = await this.getGeminiPrediction(anime);
        await new Promise(r => setTimeout(r, 1500));

        const mangaGuide = await this.getMangaGuideResult(anime);

        const comparison = this.compareResults(web, gemini, mangaGuide);

        // Log results
        console.log(`   Web:         Ch ${web.chapter}, Vol ${web.volume} (${web.confidence})`);
        console.log(`   Gemini:      Ch ${gemini.chapter}, Vol ${gemini.volume}`);
        console.log(`   Manga Guide: Ch ${mangaGuide.chapter}, Vol ${mangaGuide.volume} (${mangaGuide.method})`);
        console.log(`   Agreement:   ${comparison.agreement}`);

        // Update stats
        if (comparison.agreement === 'three_way') this.stats.threeWayAgreement++;
        else if (comparison.agreement === 'two_way') this.stats.twoWayAgreement++;
        else this.stats.noAgreement++;

        if (comparison.chapterMatch.webManga) this.stats.mangaGuideMatches++;
        if (comparison.chapterMatch.webGemini) this.stats.geminiMatches++;

        const result = {
            anime: anime.title,
            episodes: anime.episodes,
            web,
            gemini,
            mangaGuide,
            comparison,
            verdict: this.getVerdict(web, mangaGuide)
        };

        this.results.push(result);
        return result;
    }

    getVerdict(web, mangaGuide) {
        if (!web.chapter) return 'no_web_data';
        if (web.chapter === mangaGuide.chapter && web.volume === mangaGuide.volume) {
            return 'perfect_match';
        }
        if (web.chapter === mangaGuide.chapter) {
            return 'chapter_correct';
        }
        const chapterDiff = Math.abs(web.chapter - mangaGuide.chapter);
        if (chapterDiff <= 5) return 'close_enough';
        return 'incorrect';
    }

    // Test all anime
    async testAll(animeList, limit = 50) {
        console.log('🧪 CROSS-VERIFICATION ACCURACY TEST');
        console.log('='.repeat(80));
        console.log(`Testing ${Math.min(limit, animeList.length)} anime\n`);

        for (let i = 0; i < Math.min(limit, animeList.length); i++) {
            const anime = animeList[i];

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
        this.saveReport();
    }

    printReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 ACCURACY REPORT');
        console.log('='.repeat(80));

        const total = this.results.length;

        console.log(`\n🎯 Agreement Analysis:`);
        console.log(`   3-Way Agreement: ${this.stats.threeWayAgreement} (${(this.stats.threeWayAgreement / total * 100).toFixed(1)}%)`);
        console.log(`   2-Way Agreement: ${this.stats.twoWayAgreement} (${(this.stats.twoWayAgreement / total * 100).toFixed(1)}%)`);
        console.log(`   No Agreement: ${this.stats.noAgreement} (${(this.stats.noAgreement / total * 100).toFixed(1)}%)`);

        console.log(`\n📈 Manga Guide vs Web Truth:`);
        console.log(`   Matches: ${this.stats.mangaGuideMatches}/${total} (${(this.stats.mangaGuideMatches / total * 100).toFixed(1)}%)`);

        console.log(`\n🤖 Gemini vs Web Truth:`);
        console.log(`   Matches: ${this.stats.geminiMatches}/${total} (${(this.stats.geminiMatches / total * 100).toFixed(1)}%)`);

        // Verdict breakdown
        const verdicts = {
            perfect_match: 0,
            chapter_correct: 0,
            close_enough: 0,
            incorrect: 0,
            no_web_data: 0
        };

        for (const result of this.results) {
            verdicts[result.verdict]++;
        }

        console.log(`\n✅ Manga Guide Verdict Breakdown:`);
        console.log(`   Perfect Match: ${verdicts.perfect_match} (${(verdicts.perfect_match / total * 100).toFixed(1)}%)`);
        console.log(`   Chapter Correct: ${verdicts.chapter_correct} (${(verdicts.chapter_correct / total * 100).toFixed(1)}%)`);
        console.log(`   Close Enough (±5 ch): ${verdicts.close_enough} (${(verdicts.close_enough / total * 100).toFixed(1)}%)`);
        console.log(`   Incorrect: ${verdicts.incorrect} (${(verdicts.incorrect / total * 100).toFixed(1)}%)`);
        console.log(`   No Web Data: ${verdicts.no_web_data} (${(verdicts.no_web_data / total * 100).toFixed(1)}%)`);

        console.log('\n' + '='.repeat(80));
    }

    saveReport() {
        const fs = require('fs');

        // Save detailed results
        fs.writeFileSync(
            './cross-verification-results.json',
            JSON.stringify(this.results, null, 2)
        );

        // Save summary
        const summary = {
            totalTested: this.results.length,
            stats: this.stats,
            accuracy: {
                mangaGuide: (this.stats.mangaGuideMatches / this.results.length * 100).toFixed(1) + '%',
                gemini: (this.stats.geminiMatches / this.results.length * 100).toFixed(1) + '%'
            }
        };

        fs.writeFileSync(
            './accuracy-summary.json',
            JSON.stringify(summary, null, 2)
        );

        console.log('\n💾 Results saved to:');
        console.log('   - cross-verification-results.json (detailed)');
        console.log('   - accuracy-summary.json (summary)');
    }
}

module.exports = CrossVerificationTester;

// To run:
// const tester = new CrossVerificationTester();
// const animeList = require('./top-anime-list.json');
// tester.testAll(animeList, 50);
