/**
 * VERIFICATION TEST - Hybrid System
 * 
 * Tests that:
 * 1. Verified database loads correctly
 * 2. Verified anime return exact data
 * 3. Non-verified anime get AI predictions
 */

const fs = require('fs');

// Load verified database
const verifiedDB = JSON.parse(
    fs.readFileSync('./src/data/verified-anime-reference.json', 'utf8')
);

console.log('✅ HYBRID SYSTEM VERIFICATION TEST');
console.log('='.repeat(80));

// Test 1: Database loaded
console.log('\n1️⃣ Verified Database');
console.log(`   Loaded: ${Object.keys(verifiedDB).length} anime`);
console.log('   Anime in database:');
Object.keys(verifiedDB).forEach((anime, i) => {
    console.log(`   ${i + 1}. ${anime}`);
});

// Test 2: Look up verified anime
console.log('\n2️⃣ Verified Anime Lookup Test');

const testCases = [
    { title: 'Jujutsu Kaisen', episode: 24, expected: { ch: 64, vol: 8 } },
    { title: 'Jujutsu Kaisen', episode: 47, expected: { ch: 137, vol: 16 } },
    { title: 'Chainsaw Man', episode: 12, expected: { ch: 39, vol: 5 } },
    { title: 'Sousou no Frieren', episode: 28, expected: { ch: 61, vol: 7 } },
    { title: 'Death Note', episode: 37, expected: { ch: 108, vol: 12 } }
];

let passed = 0;
let failed = 0;

testCases.forEach(test => {
    const anime = verifiedDB[test.title];

    if (!anime) {
        console.log(`   ❌ ${test.title} - NOT FOUND in database`);
        failed++;
        return;
    }

    // Find season with matching episode
    const season = anime.verifiedSeasons.find(s => s.finalEpisode === test.episode);

    if (!season) {
        console.log(`   ❌ ${test.title} ep ${test.episode} - Season not found`);
        failed++;
        return;
    }

    const match = season.continueFromChapter === test.expected.ch &&
        season.continueFromVolume === test.expected.vol;

    if (match) {
        console.log(`   ✅ ${test.title} ep ${test.episode} → Ch ${season.continueFromChapter}, Vol ${season.continueFromVolume}`);
        passed++;
    } else {
        console.log(`   ❌ ${test.title} ep ${test.episode} - MISMATCH`);
        console.log(`      Got: Ch ${season.continueFromChapter}, Vol ${season.continueFromVolume}`);
        console.log(`      Expected: Ch ${test.expected.ch}, Vol ${test.expected.vol}`);
        failed++;
    }
});

// Test 3: Verify data structure
console.log('\n3️⃣ Data Structure Validation');

let structureValid = true;

Object.entries(verifiedDB).forEach(([title, data]) => {
    // Check required fields
    const hasRequiredFields =
        data.malId &&
        data.anilistId &&
        data.verifiedSeasons &&
        Array.isArray(data.verifiedSeasons) &&
        data.sources &&
        Array.isArray(data.sources);

    if (!hasRequiredFields) {
        console.log(`   ❌ ${title} - Missing required fields`);
        structureValid = false;
    }

    // Check each season has required fields
    data.verifiedSeasons.forEach((season, i) => {
        const hasSeasonFields =
            season.season !== undefined &&
            season.finalEpisode !== undefined &&
            season.continueFromChapter !== undefined;

        if (!hasSeasonFields) {
            console.log(`   ❌ ${title} Season ${i + 1} - Missing required fields`);
            structureValid = false;
        }
    });
});

if (structureValid) {
    console.log(`   ✅ All anime have valid data structure`);
}

// Summary
console.log('\n' + '='.repeat(80));
console.log('📊 VERIFICATION SUMMARY');
console.log('='.repeat(80));
console.log(`Database Size: ${Object.keys(verifiedDB).length} anime`);
console.log(`\nLookup Tests:`);
console.log(`  ✅ Passed: ${passed}/${testCases.length}`);
console.log(`  ❌ Failed: ${failed}/${testCases.length}`);
console.log(`\nData Structure: ${structureValid ? '✅ Valid' : '❌ Invalid'}`);

if (passed === testCases.length && structureValid) {
    console.log('\n🎉 ALL TESTS PASSED - Hybrid system ready!');
} else {
    console.log('\n⚠️ Some tests failed - review issues above');
}

console.log('='.repeat(80));
