/**
 * RUN CROSS-VERIFICATION TEST
 * 
 * This script runs the accuracy test on top 50 anime
 */

const CrossVerificationTester = require('./cross-verification-tester');
const fs = require('fs');

async function runTest() {
    console.log('🚀 Starting Cross-Verification Accuracy Test\n');

    // Load anime list
    const animeList = JSON.parse(fs.readFileSync('./top-anime-list.json', 'utf8'));

    // Create tester
    const tester = new CrossVerificationTester();

    // Run test on first 50 anime (to avoid rate limits)
    await tester.testAll(animeList, 50);

    console.log('\n✅ Test complete!');
}

runTest();
