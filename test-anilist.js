// Test script to check AniList API response for Jujutsu Kaisen
const axios = require('axios');

const testAniListRelations = async () => {
    const query = `
    query ($malId: Int) {
      Media(idMal: $malId, type: ANIME) {
        id
        title { romaji english }
        episodes
        relations {
          edges {
            relationType
            node {
              id
              type
              title { romaji english }
              chapters
              volumes
              siteUrl
              description
            }
          }
        }
      }
    }
    `;

    try {
        const response = await axios.post('https://graphql.anilist.co', {
            query,
            variables: { malId: 40748 } // Jujutsu Kaisen
        });

        console.log('=== AniList Response ===');
        console.log(JSON.stringify(response.data, null, 2));

        const manga = response.data?.data?.Media?.relations?.edges?.find(edge =>
            edge.node.type === 'MANGA' && edge.relationType === 'ADAPTATION'
        );

        console.log('\n=== Manga Relation ===');
        if (manga) {
            console.log('Title:', manga.node.title.romaji);
            console.log('Chapters:', manga.node.chapters);
            console.log('Volumes:', manga.node.volumes);
            console.log('Description:', manga.node.description?.substring(0, 200));
        } else {
            console.log('No MANGA ADAPTATION relation found');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
};

testAniListRelations();
