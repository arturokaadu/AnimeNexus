import axios from 'axios';

const MANGA_UPDATES_API = 'https://api.mangaupdates.com/v1';

/**
 * Curated manga continuation data for popular anime
 * This is a FALLBACK data source when APIs fail
 * Source: Cross-referenced from MyAnimeList, AniList, and manga wikis
 */
const CURATED_MANGA_DATA = {
    // Jujutsu Kaisen Season 1
    40748: { endChapter: 64, endVolume: 8, mangaTitle: 'Jujutsu Kaisen', confidence: 'high' },
    // Attack on Titan Season 1
    16498: { endChapter: 34, endVolume: 8, mangaTitle: 'Shingeki no Kyojin', confidence: 'high' },
    // My Hero Academia Season 1  
    31964: { endChapter: 21, endVolume: 3, mangaTitle: 'Boku no Hero Academia', confidence: 'high' },
    // Demon Slayer Season 1
    38000: { endChapter: 53, endVolume: 6, mangaTitle: 'Kimetsu no Yaiba', confidence: 'high' },
    // Tokyo Ghoul Season 1
    22319: { endChapter: 66, endVolume: 7, mangaTitle: 'Tokyo Ghoul', confidence: 'high' },
    // One Punch Man Season 1
    30276: { endChapter: 38, endVolume: 7, mangaTitle: 'One Punch Man', confidence: 'high' },
    // Death Note
    1535: { endChapter: 108, endVolume: 12, mangaTitle: 'Death Note', confidence: 'high' },
    // Chainsaw Man
    44511: { endChapter: 97, endVolume: 11, mangaTitle: 'Chainsaw Man', confidence: 'high' },
    // Spy x Family
    50265: { endChapter: 38, endVolume: 6, mangaTitle: 'Spy x Family', confidence: 'high' },
    // Vinland Saga Season 1
    37521: { endChapter: 54, endVolume: 8, mangaTitle: 'Vinland Saga', confidence: 'high' },
};

/**
 * Search for manga by title on MangaUpdates
 * @param {string} title - The manga/anime title to search for
 * @returns {Promise<Array>} Array of matching manga series
 */
export const searchManga = async (title) => {
    try {
        const response = await axios.post(`${MANGA_UPDATES_API}/series/search`, {
            search: title,
            per_page: 5
        });
        return response.data.results || [];
    } catch (error) {
        console.error('[MangaService] Error searching manga:', error.message);
        return [];
    }
};

/**
 * Get detailed series information including anime chapter mapping
 * @param {number} seriesId - MangaUpdates series ID
 * @returns {Promise<Object|null>} Series details or null
 */
export const getMangaDetails = async (seriesId) => {
    try {
        const response = await axios.get(`${MANGA_UPDATES_API}/series/${seriesId}`);
        return response.data;
    } catch (error) {
        console.error('[MangaService] Error fetching manga details:', error.message);
        return null;
    }
};

/**
 * Parse chapter and volume from MangaUpdates string
 * Format examples: 
 * "Vol 1, Chap 1"
 * "Vol 108, Chap 1107 (As of EP 1141)"
 * "Starts at Vol 1, Chap 1"
 * @param {string} text 
 * @returns {Object} { chapter, volume }
 */
const parseMangaInfo = (text) => {
    if (!text || typeof text !== 'string') return { chapter: null, volume: null };

    // Try to find the last occurrence of Chapter/Chap and Volume/Vol
    const chapMatches = [...text.matchAll(/Chap(?:ter)?\\.?\\s*(\\d+)/gi)];
    const lastChapMatch = chapMatches.length > 0 ? chapMatches[chapMatches.length - 1] : null;

    const volMatches = [...text.matchAll(/Vol(?:ume)?\\.?\\s*(\\d+)/gi)];
    const lastVolMatch = volMatches.length > 0 ? volMatches[volMatches.length - 1] : null;

    return {
        chapter: lastChapMatch ? parseInt(lastChapMatch[1]) : null,
        volume: lastVolMatch ? parseInt(lastVolMatch[1]) : null
    };
};

/**
 * Get anime details and manga relations from AniList using MAL ID
 * @param {number} malId - MyAnimeList anime ID
 * @returns {Promise<Object|null>} Anime data with manga relations
 */
const getAniListAnimeRelations = async (malId) => {
    try {
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
                  coverImage { extraLarge }
                }
              }
            }
          }
        }
        `;

        const response = await axios.post('https://graphql.anilist.co', {
            query,
            variables: { malId: parseInt(malId) }
        });

        return response.data?.data?.Media;
    } catch (error) {
        console.error('[MangaService] Error fetching AniList anime relations:', error.message);
        return null;
    }
};

/**
 * Find manga continuation info for an anime
 * Prioritizes MangaUpdates, then uses curated data as fallback
 * @param {string} animeTitle - The anime title to look up
 * @param {number} malId - MyAnimeList anime ID (optional)
 * @returns {Promise<Object|null>} Continuation info { chapter, volume, mangaTitle, mangaUrl }
 */
export const getMangaContinuation = async (animeTitle, malId = null) => {
    try {
        console.log(`[MangaService] Looking up: "${animeTitle}" (MAL ID: ${malId})`);

        // Clean up title for better search results
        let cleanTitle = animeTitle
            .replace(/Season \\d+/i, '')
            .replace(/Part \\d+/i, '')
            .replace(/\\d+(st|nd|rd|th) Season/i, '')
            .replace(/\\s+/g, ' ')
            .trim();

        // Manual overrides for known tricky titles
        const titleMap = {
            'demon slayer': 'Kimetsu no Yaiba',
            'attack on titan': 'Shingeki no Kyojin',
            'my hero academia': 'Boku no Hero Academia',
            'jujutsu kaisen': 'Jujutsu Kaisen',
            'spy x family': 'Spy x Family',
            'chainsaw man': 'Chainsaw Man'
        };

        const lowerTitle = cleanTitle.toLowerCase();
        for (const [key, value] of Object.entries(titleMap)) {
            if (lowerTitle.includes(key)) {
                cleanTitle = value;
                break;
            }
        }

        let extractedChapter = null;
        let extractedVolume = null;
        let confidence = 'low';
        let mangaData = null;
        let totalEpisodes = null;
        let dataSource = 'Estimation';

        // STRATEGY 1: MangaUpdates (PRIMARY - has exact anime.end data)
        console.log(`[MangaService] Strategy 1: Searching MangaUpdates...`);
        const searchResults = await searchManga(cleanTitle);
        let bestMatch = null;
        if (searchResults.length > 0) {
            bestMatch = searchResults.find(result => {
                const title = result.record?.title?.toLowerCase() || '';
                const cleanLower = cleanTitle.toLowerCase();
                return title === cleanLower || title.includes(cleanLower) || cleanLower.includes(title);
            }) || searchResults[0];
        }

        let mangaDetails = null;
        if (bestMatch?.record?.series_id) {
            mangaDetails = await getMangaDetails(bestMatch.record.series_id);

            // Parse MangaUpdates anime chapter mapping (anime.end field)
            if (mangaDetails?.anime?.end) {
                const endInfo = parseMangaInfo(mangaDetails.anime.end);
                if (endInfo.chapter) {
                    extractedChapter = endInfo.chapter;
                    extractedVolume = endInfo.volume;
                    confidence = 'high';
                    dataSource = 'MangaUpdates';
                    console.log(`[MangaService] ✓ MangaUpdates SUCCESS: Ch.${extractedChapter}, Vol.${extractedVolume}`);
                }
            }
        }

        // STRATEGY 2: Curated Data (FALLBACK when MangaUpdates fails)
        if (!extractedChapter && malId && CURATED_MANGA_DATA[malId]) {
            console.log(`[MangaService] Strategy 2: Using curated data for MAL ID ${malId}`);
            const curated = CURATED_MANGA_DATA[malId];
            extractedChapter = curated.endChapter;
            extractedVolume = curated.endVolume;
            confidence = curated.confidence;
            dataSource = 'Curated Database';
        }

        // STRATEGY 3: AniList (for manga metadata)
        if (malId) {
            const animeData = await getAniListAnimeRelations(malId);
            if (animeData) {
                totalEpisodes = animeData.episodes;

                const mangaRelation = animeData.relations?.edges?.find(edge =>
                    edge.node.type === 'MANGA' &&
                    (edge.relationType === 'ADAPTATION' || edge.relationType === 'SOURCE')
                );

                if (mangaRelation?.node) {
                    mangaData = mangaRelation.node;
                }
            }
        }

        // STRATEGY 4: AniList manga search (backup for manga data)
        if (!mangaData) {
            const aniListQuery = `
            query ($search: String) {
              Media(search: $search, type: MANGA) {
                id
                title { romaji english }
                description
                chapters
                volumes
                siteUrl
                coverImage { extraLarge }
              }
            }
            `;

            try {
                const alResponse = await axios.post('https://graphql.anilist.co', {
                    query: aniListQuery,
                    variables: { search: cleanTitle }
                });
                const aniListManga = alResponse.data?.data?.Media;
                if (aniListManga && !mangaData) {
                    mangaData = aniListManga;
                }
            } catch (e) {
                console.warn('[MangaService] AniList manga search failed:', e.message);
            }
        }

        // Consolidate final data
        const title = mangaData?.title?.romaji || mangaDetails?.title || animeTitle;
        const totalChapters = mangaDetails?.latest_chapter || mangaData?.chapters || null;
        const image = mangaData?.coverImage?.extraLarge || mangaDetails?.image?.url?.original;
        const url = mangaData?.siteUrl || mangaDetails?.url;
        const status = mangaDetails?.status || (mangaData?.status ? 'Ongoing' : null);

        console.log(`[MangaService] Final result: Ch.${extractedChapter || '?'}, Confidence: ${confidence}, Source: ${dataSource}`);

        return {
            mangaTitle: title,
            mangaUrl: url,
            startChapter: 1,
            endChapter: extractedChapter,
            startVolume: 1,
            endVolume: extractedVolume,
            coverUrl: image,
            description: mangaData?.description || mangaDetails?.description,
            totalChapters: totalChapters ? parseInt(totalChapters) : null,
            totalEpisodes: totalEpisodes,
            status: status,
            confidence: confidence,
            source: dataSource
        };

    } catch (error) {
        console.error('[MangaService] Error getting manga continuation:', error);
        return null;
    }
};

/**
 * Get manga continuation with smart dynamic resolution
 * Uses multiple strategies to find the best mapping
 * @param {number} malId - MyAnimeList anime ID
 * @param {string} animeTitle - Anime title for API search
 * @returns {Promise<Object|null>} Continuation info
 */
export const getMangaContinuationWithFallback = async (malId, animeTitle) => {
    console.log(`[SmartResolver] Starting resolution for: ${animeTitle} (MAL ID: ${malId})`);

    // Use the improved getMangaContinuation with proper prioritization
    const apiResult = await getMangaContinuation(animeTitle, malId);

    // Check if we got high-confidence data
    if (apiResult && apiResult.endChapter) {
        console.log(`[SmartResolver] ✓ Found data for ${animeTitle}`);
        return { ...apiResult, method: 'Success' };
    }

    // Return what we found even if incomplete
    return apiResult || { method: 'Failed' };
};
