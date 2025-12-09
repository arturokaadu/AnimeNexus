/**
 * Step 1: Get Top 200 Popular Anime from Jikan API
 * This creates the foundation list we'll verify
 */

async function getTopAnime() {
    console.log('📺 Fetching top 200 popular anime from Jikan API...\n');

    const allAnime = [];
    const itemsPerPage = 25; // Jikan limit
    const totalPages = 8; // 200 anime / 25 per page

    for (let page = 1; page <= totalPages; page++) {
        console.log(`Fetching page ${page}/${totalPages}...`);

        try {
            const response = await fetch(
                `https://api.jikan.moe/v4/top/anime?page=${page}&limit=${itemsPerPage}`
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            for (const anime of data.data) {
                // Only include anime with manga source
                if (anime.type === 'TV' || anime.type === 'Movie') {
                    allAnime.push({
                        mal_id: anime.mal_id,
                        title: anime.title,
                        title_english: anime.title_english,
                        episodes: anime.episodes,
                        score: anime.score,
                        rank: anime.rank,
                        year: anime.year,
                        source: anime.source
                    });
                }
            }

            // Rate limiting - Jikan allows 3 requests/second
            await new Promise(r => setTimeout(r, 1000));

        } catch (error) {
            console.error(`Error on page ${page}:`, error.message);
        }
    }

    console.log(`\n✅ Retrieved ${allAnime.length} anime\n`);

    // Filter only manga-based anime
    const mangaBased = allAnime.filter(a =>
        a.source === 'Manga' ||
        a.source === 'Light novel' ||
        a.source === '4-koma manga'
    );

    console.log(`📚 ${mangaBased.length} are manga/LN-based\n`);

    // Save to file
    const fs = require('fs');
    fs.writeFileSync('./top-anime-list.json', JSON.stringify(mangaBased, null, 2));

    console.log('💾 Saved to top-anime-list.json');

    return mangaBased;
}

getTopAnime();
