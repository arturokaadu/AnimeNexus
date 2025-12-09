/**
 * MATHEMATICAL ADAPTATION RATIO CALCULATOR
 * 
 * Instead of hardcoding all anime, we calculate adaptation ratios dynamically:
 * - Use verified data as reference points
 * - Calculate ratio = chapters/episode for each anime
 * - Apply ratio to ANY episode number
 * - Self-improving: more data = better predictions
 */

import verifiedDB from '../src/data/verified-anime-reference.json';

/**
 * Calculate adaptation ratio for an anime
 */
function calculateAdaptationRatio(animeData) {
    if (!animeData || !animeData.verifiedSeasons || animeData.verifiedSeasons.length === 0) {
        return null;
    }

    const dataPoints = animeData.verifiedSeasons.map(season => ({
        episodes: season.finalEpisode,
        chapter: season.continueFromChapter - 1, // Chapter it ENDS at
        ratio: (season.continueFromChapter - 1) / season.finalEpisode
    }));

    // Calculate average ratio
    const avgRatio = dataPoints.reduce((sum, dp) => sum + dp.ratio, 0) / dataPoints.length;

    // Calculate consistency (how stable the ratio is)
    const variance = dataPoints.reduce((sum, dp) =>
        sum + Math.pow(dp.ratio - avgRatio, 2), 0
    ) / dataPoints.length;

    const consistency = 1 - (Math.sqrt(variance) / avgRatio); // 0-1 scale

    return {
        avgRatio: parseFloat(avgRatio.toFixed(2)),
        consistency: parseFloat(consistency.toFixed(2)),
        dataPoints: dataPoints,
        avgChaptersPerVolume: animeData.verifiedSeasons[0].continueFromVolume ?
            Math.round((animeData.verifiedSeasons[0].continueFromChapter - 1) / animeData.verifiedSeasons[0].continueFromVolume) : 9
    };
}

/**
 * Predict chapter for ANY episode using ratio
 */
function predictChapterUsingRatio(anime, episode, animeData) {
    const ratioInfo = calculateAdaptationRatio(animeData);

    if (!ratioInfo) {
        return null;
    }

    // Find if this episode matches a known data point
    const exactMatch = ratioInfo.dataPoints.find(dp => dp.episodes === episode);

    if (exactMatch) {
        // Exact match - return verified data
        const season = animeData.verifiedSeasons.find(s => s.finalEpisode === episode);
        return {
            continueFromChapter: season.continueFromChapter,
            continueFromVolume: season.continueFromVolume,
            confidence: 'high',
            method: 'exact_match',
            reasoning: `Episode ${episode} exactly matches verified data.`
        };
    }

    // Predict using ratio
    const predictedChapter = Math.round(episode * ratioInfo.avgRatio);
    const predictedVolume = Math.round(predictedChapter / ratioInfo.avgChaptersPerVolume);

    // Confidence based on consistency
    let confidence = 'medium';
    if (ratioInfo.consistency > 0.9) confidence = 'high';
    else if (ratioInfo.consistency < 0.7) confidence = 'low';

    return {
        continueFromChapter: predictedChapter + 1, // Next chapter to read
        continueFromVolume: predictedVolume,
        confidence: confidence,
        method: 'ratio_calculation',
        reasoning: `Calculated using adaptation ratio of ${ratioInfo.avgRatio} chapters/episode. ` +
            `Based on ${ratioInfo.dataPoints.length} verified data points with ${(ratioInfo.consistency * 100).toFixed(0)}% consistency.`
    };
}

/**
 * Enhanced check: Uses mathematical prediction for ANY episode
 */
export function checkVerifiedDatabaseEnhanced(animeTitle, episodeNumber) {
    console.log(`[Enhanced DB] Searching for "${animeTitle}" episode ${episodeNumber}`);

    // Try exact match first
    let animeData = verifiedDB[animeTitle];
    let matchedName = animeTitle;

    // If not found, try fuzzy match with aliases
    if (!animeData) {
        const normalizedSearch = animeTitle.toLowerCase();
        const matchingKey = Object.keys(verifiedDB).find(key => {
            // Check main title
            if (key.toLowerCase() === normalizedSearch ||
                key.toLowerCase().includes(normalizedSearch) ||
                normalizedSearch.includes(key.toLowerCase())) {
                return true;
            }

            // Check aliases
            const aliases = verifiedDB[key].aliases || [];
            return aliases.some(alias =>
                alias.toLowerCase() === normalizedSearch ||
                alias.toLowerCase().includes(normalizedSearch) ||
                normalizedSearch.includes(alias.toLowerCase())
            );
        });

        if (matchingKey) {
            console.log(`[Enhanced DB] Fuzzy matched: "${matchingKey}"`);
            animeData = verifiedDB[matchingKey];
            matchedName = matchingKey;
        }
    }

    if (!animeData) {
        console.log('[Enhanced DB] Anime not in database');
        return null;
    }

    // USE MATHEMATICAL PREDICTION
    const prediction = predictChapterUsingRatio(animeTitle, episodeNumber, animeData);

    if (!prediction) {
        console.log('[Enhanced DB] Could not calculate ratio');
        return null;
    }

    console.log(`[Enhanced DB] ✅ ${prediction.method}: Ch ${prediction.continueFromChapter}, Vol ${prediction.continueFromVolume}`);

    return {
        continueFromChapter: prediction.continueFromChapter,
        continueFromVolume: prediction.continueFromVolume,
        buyVolume: prediction.continueFromVolume,
        confidence: prediction.confidence,
        reasoning: prediction.reasoning,
        sourceMaterial: 'Manga',
        specialNotes: `${prediction.method === 'exact_match' ? 'Verified data' : 'Calculated prediction'}`,
        verified: prediction.method === 'exact_match'
    };
}

export { calculateAdaptationRatio, predictChapterUsingRatio };
