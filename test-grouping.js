// Test to verify groupAnimeByBase works correctly
const { groupAnimeByBase } = require('./src/utils/animeGrouping');

const testAnime = [
    { mal_id: 1, title: 'One Punch Man', type: 'TV', episodes: 12, status: 'Finished Airing' },
    { mal_id: 2, title: 'One Punch Man 2nd Season', type: 'TV', episodes: 12, status: 'Finished Airing' },
    { mal_id: 3, title: 'Chainsaw Man', type: 'TV', episodes: 12, status: 'Finished Airing' },
    { mal_id: 4, title: 'Kimetsu no Yaiba', type: 'TV', episodes: 26, status: 'Finished Airing' },
    { mal_id: 5, title: 'Kimetsu no Yaiba: Mugen Train', type: 'Movie', episodes: 1, status: 'Finished Airing' },
    { mal_id: 6, title: 'Kimetsu no Yaiba Season 2', type: 'TV', episodes: 18, status: 'Finished Airing' }
];

const result = groupAnimeByBase(testAnime, '');

console.log('=== GROUP ANIME BY BASE TEST ===');
console.log(`\nTotal anime input: ${testAnime.length}`);
console.log(`Series results: ${result.series.length}`);
console.log(`Movies results: ${result.movies.length}`);

console.log('\n--- Series Entries ---');
result.series.forEach((anime, idx) => {
    console.log(`${idx + 1}. ${anime.title} (ID: ${anime.mal_id})`);
    console.log(`   Episodes: ${anime.episodes}`);
    console.log(`   Seasons: ${anime._seasonCount}`);
    if (anime._allSeasons) {
        console.log(`   All Seasons:`);
        anime._allSeasons.forEach(s => console.log(`     - ${s.title} (ID: ${s.mal_id})`));
    }
});

console.log('\n--- Movies ---');
result.movies.forEach((anime, idx) => {
    console.log(`${idx + 1}. ${anime.title} (ID: ${anime.mal_id})`);
});

console.log('\n=== EXPECTED RESULT ===');
console.log('Series: 2 entries (One Punch Man, Kimetsu no Yaiba)');
console.log('Movies: 1 entry (Mugen Train)');
console.log('\nOne Punch Man should show:');
console.log('  - Title: "One Punch Man" (not "2nd Season")');
console.log('  - Episodes: 24 (12 + 12)');
console.log('  - _allSeasons: 2 items');
