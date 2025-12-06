import axios from 'axios';

const MANGA_UPDATES_API = 'https://api.mangaupdates.com/v1';

/**
 * Curated manga continuation data for popular anime
 * This is a high-confidence data source for well-known series
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
        console.error('Error searching manga:', error);
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
        console.error('Error fetching manga details:', error);
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
    // This helps with strings like "Vol 1, Chap 1 ... Vol 5, Chap 20" -> We usually want the end point

    // Regex for Chapter
    const chapMatches = [...text.matchAll(/Chap(?:ter)?\\.?\\s*(\\d+)/gi)];
    const lastChapMatch = chapMatches.length > 0 ? chapMatches[chapMatches.length - 1] : null;

    // Regex for Volume
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
        console.error('Error fetching AniList anime relations:', error);
        return null;
    }
};

/**
 * Extract chapter information from relation descriptions or notes
 * @param {Object} mangaRelation - AniList manga relation object
 * @returns {Object} { chapter, volume, confidence }
 */
const extractChapterFromRelation = (mangaRelation) => {
    const description = mangaRelation.description || '';

    // Enhanced patterns to match common description formats
    const patterns = [
        /episodes? (?:\\d+[-–])?(\\d+) (?:adapts?|covers?|ends? at) chapters? (?:\\d+[-–])?(\\d+)/i,
        /chapters? (?:\\d+[-–])?(\\d+)/i,
        /volumes? (?:\\d+[-–])?(\\d+)/i,
    ];

    let chapter = null;
    let volume = null;

    for (const pattern of patterns) {
        const match = description.match(pattern);
        if (match) {
            if (match[2]) chapter = parseInt(match[2]); // End chapter if range
            else if (match[1]) {
                if (pattern.source.includes('chapter')) chapter = parseInt(match[1]);
                else if (pattern.source.includes('volume')) volume = parseInt(match[1]);
            }
            if (chapter) break;
        }
    }

    return { chapter, volume, confidence: chapter ? 'medium' : 'low' };
};

/**
 * Find manga continuation info for an anime
 * Searches AniList anime relations first, then MangaUpdates
 * @param {string} animeTitle - The anime title to look up
 * @param {number} malId - MyAnimeList anime ID (optional)
 * @returns {Promise<Object|null>} Continuation info { chapter, volume, mangaTitle, mangaUrl }
 */
export const getMangaContinuation = async (animeTitle, malId = null) => {
    try {
        // Strategy 0: Check curated data first (HIGHEST PRIORITY)
        if (malId && CURATED_MANGA_DATA[malId]) {
            console.log(`[Curated Data] Found exact match for MAL ID ${malId}`);
            const curated = CURATED_MANGA_DATA[malId];
            return {
                mangaTitle: curated.mangaTitle,
                endChapter: curated.endChapter,
                endVolume: curated.endVolume,
                startChapter: 1,
                startVolume: 1,
                confidence: curated.confidence,
                source: 'Curated Database',
                status: 'Ongoing' // Most  ongoing, can be updated in curated data if needed
            };
        }

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

        // Strategy 1: Query AniList with MAL ID for anime-manga relations (BEST)
        if (malId) {
            const animeData = await getAniListAnimeRelations(malId);
            if (animeData) {
                totalEpisodes = animeData.episodes;

                // Find MANGA or SOURCE relation
                const mangaRelation = animeData.relations?.edges?.find(edge =>
                    edge.node.type === 'MANGA' &&
                    (edge.relationType === 'ADAPTATION' || edge.relationType === 'SOURCE')
                );

                if (mangaRelation?.node) {
                    mangaData = mangaRelation.node;

                    // Try to extract chapter info from description
                    const extracted = extractChapterFromRelation(mangaRelation.node);
                    if (extracted.chapter) {
                        extractedChapter = extracted.chapter;
                        extractedVolume = extracted.volume;
                        confidence = 'high';
                    }
                }
            }
        }

        // Strategy 2: Search MangaUpdates for detailed chapter mapping
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
        }

        // Parse MangaUpdates anime chapter mapping if available
        if (mangaDetails?.anime && !extractedChapter) {
            const endInfo = parseMangaInfo(mangaDetails.anime.end);
            if (endInfo.chapter) {
                extractedChapter = endInfo.chapter;
                extractedVolume = endInfo.volume;
                confidence = 'high';
            }
        }

        // Strategy 3: Query AniList for manga directly (backup)
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
                console.warn('AniList manga search failed:', e.message);
            }
        }

        // Strategy 4: Text mining from all available descriptions
        if (!extractedChapter) {
            const descriptions = [
                mangaDetails?.description,
                mangaDetails?.anime?.start,
                mangaDetails?.anime?.end,
                mangaData?.description
            ].filter(Boolean).join('\\n');

            const patterns = [
                /anime (?:ends?|covers?) (?:at |through |up to )?(?:chapter|ch\\.?)\\s*(\\d+)/i,
                /(?:ends?|covers?) (?:at |through |up to )?(?:volume|vol\\.?)\\s*(\\d+)/i,
                /adapts? (?:chapters?|ch\\.?)\\s*\\d+[-–]\\s*(\\d+)/i,
                /episode \\d+ (?:ends?|covers?) (?:chapter|ch\\.?)\\s*(\\d+)/i,
            ];

            for (const pattern of patterns) {
                const match = descriptions.match(pattern);
                if (match) {
                    if (pattern.source.includes('volume')) {
                        extractedVolume = parseInt(match[1]);
                    } else {
                        extractedChapter = parseInt(match[1]);
                        confidence = 'medium';
                    }
                    if (extractedChapter) break;
                }
            }
        }

        // Consolidate final data
        const title = mangaData?.title?.romaji || mangaDetails?.title || animeTitle;
        const totalChapters = mangaDetails?.latest_chapter || mangaData?.chapters || null;
        const image = mangaData?.coverImage?.extraLarge || mangaDetails?.image?.url?.original;
        const url = mangaData?.siteUrl || mangaDetails?.url;
        const status = mangaDetails?.status || (mangaData?.status ? 'Ongoing' : null);

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
            source: extractedChapter ? (mangaData ? 'AniList' : 'MangaUpdates') : 'Estimation'
        };

    } catch (error) {
        console.error('Error getting manga continuation:', error);
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

    // Strategy 1: Smart API Search (AniList Relations + MangaUpdates)
    const apiResult = await getMangaContinuation(animeTitle, malId);

    // Check if we got high-confidence data (explicit start/end chapters)
    if (apiResult && apiResult.endChapter) {
        console.log(`[SmartResolver] Found exact mapping via API for ${animeTitle}`);
        return { ...apiResult, method: 'Exact/API' };
    }

    // Strategy 2: If API gave us generic info but no chapters, return for UI estimation
    if (apiResult && apiResult.totalChapters) {
        return { ...apiResult, method: 'Estimation/Metadata' };
    }

    // Return what we found even if incomplete, UI will handle fallback
    return apiResult || { method: 'Failed' };
};
