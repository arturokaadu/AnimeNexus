import axios from 'axios';
import { apiCache, requestDeduplicator } from '../utils/cacheSystem';
import { groupAnimeByBase } from '../utils/animeGrouping';

const API_URL = "https://api.jikan.moe/v4";

// Optimized Rate Limiting Queue with deduplication
// Jikan allows 3 requests/second, we use 300ms delay (safely under limit)
const queue = [];
let isProcessing = false;
const RATE_LIMIT_DELAY = 300; // Reduced to 300ms for faster loading (was 400ms)

const processQueue = async () => {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;

  const { resolve, reject, fn, cacheKey } = queue.shift();

  try {
    // Check cache first
    if (cacheKey) {
      const cached = apiCache.get(cacheKey);
      if (cached) {
        resolve(cached);
        isProcessing = false;
        processQueue();
        return;
      }
    }

    const result = await fn();

    // Cache the result
    if (cacheKey) {
      apiCache.set(cacheKey, result);
    }

    resolve(result);
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.warn("Rate limit hit, retrying in 1.5 seconds...");
      setTimeout(async () => {
        try {
          const retryResult = await fn();
          if (cacheKey) apiCache.set(cacheKey, retryResult);
          resolve(retryResult);
        } catch (retryError) {
          reject(retryError);
        }
      }, 1500);
    } else {
      reject(error);
    }
  }

  setTimeout(() => {
    isProcessing = false;
    processQueue();
  }, RATE_LIMIT_DELAY);
};

const rateLimitedGet = (url, config, cacheKey = null) => {
  // Check cache first before even queueing
  if (cacheKey) {
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return Promise.resolve(cached);
    }
  }

  return requestDeduplicator.dedupe(cacheKey || url, () =>
    new Promise((resolve, reject) => {
      queue.push({
        resolve,
        reject,
        fn: () => axios.get(url, config),
        cacheKey
      });
      processQueue();
    })
  );
};

export const getTopAnime = async (page = 1, filter = 'bypopularity') => {
  const cacheKey = `top_anime_${page}_${filter}`;
  try {
    const response = await rateLimitedGet(`${API_URL}/top/anime`, {
      params: { page, filter }
    }, cacheKey);
    return response.data;
  } catch (error) {
    console.error("Error fetching top anime:", error);
    throw error;
  }
};

export const searchAnime = async (query, page = 1, sfw = true, genres = null, type = null, rating = null) => {
  try {
    // Normalize search query for better matching
    let normalizedQuery = query;

    // Handle "No." variations (e.g., "Kaiju 8" -> "Kaiju No. 8")
    if (normalizedQuery) {
      // Match patterns like "Kaiju 8", "Demon 8", etc. and add "No."
      normalizedQuery = normalizedQuery.replace(/(\w+)\s+(\d+)$/i, '$1 No. $2');

      // Also handle "n 8" -> "No. 8"  
      normalizedQuery = normalizedQuery.replace(/\bn\s+(\d+)/gi, 'No. $1');
    }

    const params = {
      q: normalizedQuery,
      page,
      sfw: sfw,
      order_by: 'popularity',
      sort: 'asc'
    };

    if (genres) params.genres = genres;
    if (type) params.type = type;
    if (rating) params.rating = rating;

    const response = await rateLimitedGet(`${API_URL}/anime`, { params });

    // Apply grouping to remove duplicate seasons, specials, recaps
    const grouped = groupAnimeByBase(response.data.data, query || '');

    // Combine series and movies but keep them in proper order
    const combinedResults = [...grouped.series, ...grouped.movies];

    return {
      ...response.data,
      data: combinedResults
    };
  } catch (error) {
    console.error("Error searching anime:", error);
    throw error;
  }
};

export const getAnimeDetails = async (id) => {
  const cacheKey = `anime_details_${id}`;
  try {
    const response = await rateLimitedGet(`${API_URL}/anime/${id}/full`, {}, cacheKey);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching details for anime ${id}:`, error);
    throw error;
  }
};

export const getAnimeCharacters = async (id) => {
  try {
    const response = await rateLimitedGet(`${API_URL}/anime/${id}/characters`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching characters for anime ${id}:`, error);
    throw error;
  }
};

export const getSeasonNow = async (page = 1, sfw = true) => {
  try {
    const response = await rateLimitedGet(`${API_URL}/seasons/now`, {
      params: {
        page,
        sfw
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching current season:", error);
    throw error;
  }
};

export const searchCharacters = async (query) => {
  try {
    const response = await rateLimitedGet(`${API_URL}/characters`, {
      params: {
        q: query,
        limit: 10
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error searching characters:", error);
    throw error;
  }
};

export const getAnimeEpisodes = async (id, page = 1) => {
  try {
    const response = await rateLimitedGet(`${API_URL}/anime/${id}/episodes`, {
      params: { page }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching episodes for anime ${id}:`, error);
    throw error;
  }
};

export const getAnimeVideos = async (id) => {
  try {
    const response = await rateLimitedGet(`${API_URL}/anime/${id}/videos`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching videos for anime ${id}:`, error);
    throw error;
  }
};

export const getAnimeRecommendations = async (id) => {
  try {
    const response = await rateLimitedGet(`${API_URL}/anime/${id}/recommendations`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching recommendations for anime ${id}:`, error);
    throw error;
  }
};

export const getSeasonalAnime = async () => {
  try {
    // Get current season based on month
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    let season;
    if (month >= 1 && month <= 3) season = 'winter';
    else if (month >= 4 && month <= 6) season = 'spring';
    else if (month >= 7 && month <= 9) season = 'summer';
    else season = 'fall';

    const response = await rateLimitedGet(`${API_URL}/seasons/${year}/${season}`);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching seasonal anime:", error);
    throw error;
  }
};

export const getSeasonAnime = async (year, season) => {
  try {
    const response = await rateLimitedGet(`${API_URL}/seasons/${year}/${season}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${season} ${year} anime:`, error);
    throw error;
  }
};

export const getAnimeRelations = async (id) => {
  try {
    const response = await rateLimitedGet(`${API_URL}/anime/${id}/relations`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching relations for anime ${id}:`, error);
    throw error;
  }
};

export const getAnimeSearch = async (params) => {
  try {
    const response = await rateLimitedGet(`${API_URL}/anime`, { params });
    return response.data;
  } catch (error) {
    console.error("Error searching anime:", error);
    throw error;
  }
};

export const getAnimeThemes = async (id) => {
  try {
    const response = await rateLimitedGet(`${API_URL}/anime/${id}/themes`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching themes for anime ${id}:`, error);
    throw error;
  }
};

export const getAnimeStaff = async (id) => {
  try {
    const response = await rateLimitedGet(`${API_URL}/anime/${id}/staff`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching staff for anime ${id}:`, error);
    throw error;
  }
};
