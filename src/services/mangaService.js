import axios from 'axios';

/**
 * 100% DYNAMIC MANGA GUIDE - NO HARDCODED DATA
 * 
 * Works like Gemini - real-time search for ANY anime.
 * Uses Vercel serverless proxy to query:
 * 1. MangaUpdates API (100k+ series)
 * 2. wheredoestheanimeleaveoff.com
 * 3. Web search aggregation
 */

const PROXY_API = '/api/mangaupdates';

/**
 * Get manga continuation for ANY anime - fully dynamic
 * @param {string} animeTitle - The anime title
 * @param {number} malId - MyAnimeList ID (optional)
 * @param {number} episode - Specific episode (optional)
 * @returns {Promise<Object>} Manga continuation data
 */
export const getMangaContinuation = async (animeTitle, malId = null, episode = null) => {
    console.log(`[MangaService] 🔍 Dynamic lookup: "${animeTitle}"`);

    try {
        // Clean the title for search
        const cleanTitle = animeTitle
            .replace(/Season \d+/i, '')
            .replace(/Part \d+/i, '')
            .replace(/\d+(st|nd|rd|th) Season/i, '')
            .replace(/:\s*[^:]+$/, '') // Remove subtitles
            .replace(/\s+/g, ' ')
            .trim();

        // Call our serverless proxy (searches multiple sources)
        const params = new URLSearchParams({
            anime: cleanTitle,
            ...(episode && { episode: episode.toString() })
        });

        const response = await axios.get(`${PROXY_API}?${params}`);

        if (response.data && response.data.chapter) {
            console.log(`[MangaService] ✓ Found: Ch.${response.data.chapter}, Vol.${response.data.volume || '?'}`);
            console.log(`[MangaService] Source: ${response.data.source}`);

            return {
                mangaTitle: response.data.mangaTitle || cleanTitle,
                endChapter: response.data.chapter,
                endVolume: response.data.volume,
                startChapter: 1,
                startVolume: 1,
                totalChapters: response.data.totalChapters,
                status: response.data.status,
                confidence: response.data.confidence || 'high',
                source: response.data.source
            };
        }

        // Fallback: Try AniList for basic manga info
        console.log('[MangaService] Trying AniList fallback...');
        const anilistData = await getAniListMangaRelation(malId, cleanTitle);

        if (anilistData) {
            return {
                mangaTitle: anilistData.title,
                endChapter: null, // AniList doesn't have exact end points
                endVolume: null,
                totalChapters: anilistData.chapters,
                totalVolumes: anilistData.volumes,
                mangaUrl: anilistData.siteUrl,
                coverUrl: anilistData.coverImage,
                confidence: 'low',
                source: 'AniList (total chapters only)',
                note: 'Start from Chapter 1 or search online for exact continuation point'
            };
        }

        console.log('[MangaService] No data found');
        return null;

    } catch (error) {
        console.error('[MangaService] Error:', error.message);

        // If proxy fails, still try AniList
        try {
            const anilistData = await getAniListMangaRelation(malId, animeTitle);
            if (anilistData) return anilistData;
        } catch (e) {
            console.error('[MangaService] AniList fallback failed:', e.message);
        }

        return null;
    }
};

/**
 * Get manga relation from AniList (fallback)
 */
async function getAniListMangaRelation(malId, animeTitle) {
    try {
        const query = `
        query ($malId: Int, $search: String) {
          anime: Media(idMal: $malId, type: ANIME) {
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
                  coverImage { extraLarge }
                }
              }
            }
          }
          manga: Media(search: $search, type: MANGA) {
            id
            title { romaji english }
            chapters
            volumes
            siteUrl
            coverImage { extraLarge }
          }
        }
        `;

        const response = await axios.post('https://graphql.anilist.co', {
            query,
            variables: {
                malId: malId ? parseInt(malId) : null,
                search: animeTitle
            }
        });

        const data = response.data?.data;

        // Try to find source manga from relations
        const mangaRelation = data?.anime?.relations?.edges?.find(edge =>
            edge.node.type === 'MANGA' &&
            (edge.relationType === 'SOURCE' || edge.relationType === 'ADAPTATION')
        );

        if (mangaRelation?.node) {
            const manga = mangaRelation.node;
            return {
                title: manga.title.english || manga.title.romaji,
                chapters: manga.chapters,
                volumes: manga.volumes,
                siteUrl: manga.siteUrl,
                coverImage: manga.coverImage?.extraLarge
            };
        }

        // Fallback to direct manga search
        if (data?.manga) {
            return {
                title: data.manga.title.english || data.manga.title.romaji,
                chapters: data.manga.chapters,
                volumes: data.manga.volumes,
                siteUrl: data.manga.siteUrl,
                coverImage: data.manga.coverImage?.extraLarge
            };
        }

        return null;
    } catch (error) {
        console.error('[AniList]', error.message);
        return null;
    }
}

/**
 * Main entry point - used by MangaGuide component
 */
export const getMangaContinuationWithFallback = async (malId, animeTitle, episode = null) => {
    const result = await getMangaContinuation(animeTitle, malId, episode);
    return result || {
        method: 'NotFound',
        suggestion: `Search Google: "${animeTitle} manga chapter where anime ends"`
    };
};

// Legacy exports for compatibility
export const searchManga = async (title) => {
    const result = await getMangaContinuation(title);
    return result ? [result] : [];
};

export const getMangaDetails = async (seriesId) => {
    return null; // Not used in new system
};
