const axios = require('axios');
const fs = require('fs');

const API_URL = 'https://animenexusapp.vercel.app/api/mangaupdates';

const ANIME_LIST = [
    // Popular Shonen
    "One Piece", "Naruto", "Bleach", "Dragon Ball", "Hunter x Hunter",
    "Jujutsu Kaisen", "Demon Slayer", "My Hero Academia", "Black Clover",
    "Chainsaw Man", "Attack on Titan", "Fullmetal Alchemist", "Fairy Tail",

    // Light Novels (Previously failing)
    "Re:Zero", "Mushoku Tensei", "Sword Art Online", "Overlord",
    "No Game No Life", "Konosuba", "The Rising of the Shield Hero",
    "That Time I Got Reincarnated as a Slime", "Apothecary Diaries",
    "Classroom of the Elite", "86", "Goblin Slayer",

    // Seinen / Older / Others
    "Berserk", "Vinland Saga", "Vagabond", "Monster", "Pluto",
    "Haikyuu", "Blue Lock", "Kuroko no Basket", "Slam Dunk",
    "Oshi no Ko", "Kaguya-sama", "Spy x Family", "Dr. Stone",
    "Tokyo Ghoul", "One Punch Man", "Mob Psycho 100",
    "Death Note", "Code Geass", "Steins;Gate", "Cowboy Bebop",
    "Neon Genesis Evangelion", "Gurren Lagann", "Akame ga Kill",
    "Noragami", "Soul Eater", "Fire Force", "Tokyo Revengers"
];

async function verifyAll() {
    console.log(`Starting verification for ${ANIME_LIST.length} titles...\n`);

    const results = [];
    let successCount = 0;

    for (const anime of ANIME_LIST) {
        try {
            const start = Date.now();
            const res = await axios.get(`${API_URL}?anime=${encodeURIComponent(anime)}`);
            const duration = Date.now() - start;

            const data = res.data;
            const isSuccess = data.chapter || (data.status && data.status.includes('Light Novel'));

            if (isSuccess) successCount++;

            const result = {
                anime,
                success: isSuccess,
                chapter: data.chapter,
                volume: data.volume,
                source: data.source,
                confidence: data.confidence,
                time: `${duration}ms`
            };

            results.push(result);
            console.log(`${isSuccess ? '✅' : '❌'} ${anime}: Ch.${data.chapter} Vol.${data.volume} (${data.source})`);

        } catch (error) {
            console.log(`❌ ${anime}: ERROR - ${error.message}`);
            results.push({ anime, success: false, error: error.message });
        }
    }

    console.log(`\nVerification Complete: ${successCount}/${ANIME_LIST.length} successful coverage.`);

    fs.writeFileSync('verification_results.json', JSON.stringify(results, null, 2));
}

verifyAll();
