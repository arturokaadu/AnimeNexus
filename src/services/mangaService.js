/**
 * Manga Continuation Service
 * 
 * Clean, single-purpose service that queries Gemini AI to find
 * where to continue reading manga after watching an anime.
 */

import axios from 'axios';

/**
 * Get manga continuation info for a given anime and episode.
 * 
 * @param {string} animeTitle - Name of the anime
 * @param {number} episode - Episode number the user watched up to
 * @returns {Promise<MangaContinuationResult>}
 * 
 * @typedef {Object} MangaContinuationResult
 * @property {number|null} chapter - Chapter to continue from
 * @property {number|null} volume - Volume to continue from
 * @property {number|null} buyVolume - Recommended volume to purchase
 * @property {string} confidence - 'high' | 'medium' | 'low'
 * @property {string} reasoning - Explanation from AI
 * @property {string} sourceMaterial - 'Manga' | 'Light Novel' | 'Original' etc.
 * @property {string|null} specialNotes - Notes about movies, OVAs, etc.
 * @property {string} source - Data source attribution
 */
export async function getMangaContinuation(animeTitle, episode) {
    // Validate inputs
    if (!animeTitle) {
        return createErrorResult('Please select an anime first.');
    }

    if (!episode || episode < 1) {
        return createErrorResult('Please enter a valid episode number.');
    }

    console.log(`[MangaService] Querying: "${animeTitle}" Episode ${episode}`);

    try {
        const response = await axios.get('/api/gemini-resolver', {
            params: {
                anime: animeTitle,
                episode: episode
            },
            timeout: 15000 // 15s timeout for AI processing
        });

        if (response.status === 200 && response.data) {
            const data = response.data;

            console.log('[MangaService] AI Response:', data);

            return {
                chapter: data.continueFromChapter,
                volume: data.continueFromVolume,
                buyVolume: data.buyVolume || data.continueFromVolume,
                confidence: data.confidence || 'medium',
                reasoning: data.reasoning || 'No details available.',
                sourceMaterial: data.sourceMaterial || 'Unknown',
                specialNotes: data.specialNotes || null,
                source: 'Google Gemini AI'
            };
        }

        return createErrorResult('Empty response from server.');

    } catch (error) {
        console.error('[MangaService] Error:', error.message);

        if (error.code === 'ECONNABORTED') {
            return createErrorResult('Request timed out. Please try again.');
        }

        if (error.response?.status === 500) {
            return createErrorResult('AI service error. Check API configuration.');
        }

        return createErrorResult('Failed to fetch manga data.');
    }
}

/**
 * Create a standardized error result
 */
function createErrorResult(message) {
    return {
        chapter: null,
        volume: null,
        buyVolume: null,
        confidence: 'low',
        reasoning: message,
        sourceMaterial: null,
        specialNotes: null,
        source: null
    };
}
