/**
 * Intelligent Manga Resolver API
 * Hybdrid approach:
 * 1. Checks verified local database for known anime/manga mappings.
 * 2. Uses adaptation ratios (chapters per episode) to predict reading progress.
 * 3. Fallback to Gemini AI if no local data exists.
 */

import verifiedDB from '../src/data/verified-anime-reference.json';

export default async function handler(req, res) {
    const { anime, episode } = req.query;

    if (!anime || !episode) {
        return res.status(400).json({ error: 'Missing anime or episode parameters' });
    }

    try {
        console.log(`[Resolver] Processing: "${anime}" Ep: ${episode}`);

        // Approach 1: Math-based prediction from verified data
        const intelligentResult = await intelligentPredict(anime, parseInt(episode));

        if (intelligentResult) {
            console.log(`[Metric Match] Ch ${intelligentResult.continueFromChapter}`);
            return res.status(200).json(intelligentResult);
        }

        // STEP 2: Fallback to Gemini AI
        console.log('[Gemini Fallback] Anime not in verified database, using AI...');

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const geminiResult = await queryGeminiAI(anime, episode, apiKey);
        return res.status(200).json(geminiResult);

    } catch (error) {
        console.error('[Manga Resolver Error]', error);
        return res.status(500).json({
            error: error.message,
            continueFromChapter: null,
            continueFromVolume: null,
            buyVolume: null,
            confidence: 'low',
            reasoning: 'Error al obtener datos del servicio.'
        });
    }
}

/**
 * Fetch volume cover image from Google Books API or Jikan (MAL) API
 */
async function getVolumeCover(mangaTitle, volumeNumber) {
    try {
        console.log(`[Volume Cover] Searching for: ${mangaTitle} Volume ${volumeNumber}`);

        // Try Google Books first
        const cleanTitle = mangaTitle.replace(/[:\-]/g, ' ').trim();
        const query = `${cleanTitle} volume ${volumeNumber} manga`;

        const gbResponse = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`
        );

        if (gbResponse.ok) {
            const data = await gbResponse.json();
            console.log(`[Volume Cover] Google Books found ${data.items?.length || 0} results`);

            if (data.items && data.items.length > 0) {
                for (const item of data.items) {
                    if (item.volumeInfo?.imageLinks) {
                        const imageLinks = item.volumeInfo.imageLinks;
                        let coverUrl = imageLinks.large ||
                            imageLinks.medium ||
                            imageLinks.small ||
                            imageLinks.thumbnail ||
                            imageLinks.smallThumbnail;

                        if (coverUrl) {
                            coverUrl = coverUrl.replace('http:', 'https:');
                            console.log(`[Volume Cover] Found via Google Books: ${coverUrl}`);
                            return coverUrl;
                        }
                    }
                }
            }
        }

        // Fallback to Jikan/MAL manga pictures
        console.log('[Volume Cover] Google Books failed, trying Jikan API...');

        // Search for manga on MAL via Jikan
        const searchResponse = await fetch(
            `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(cleanTitle)}&limit=1`
        );

        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.data && searchData.data.length > 0) {
                const mangaId = searchData.data[0].mal_id;
                console.log(`[Volume Cover] Found manga ID: ${mangaId}`);

                // Get manga pictures
                const picturesResponse = await fetch(
                    `https://api.jikan.moe/v4/manga/${mangaId}/pictures`
                );

                if (picturesResponse.ok) {
                    const picturesData = await picturesResponse.json();
                    if (picturesData.data && picturesData.data.length > 0) {
                        // Get the first/main picture (usually the cover)
                        const coverUrl = picturesData.data[0].jpg.large_image_url ||
                            picturesData.data[0].jpg.image_url;
                        if (coverUrl) {
                            console.log(`[Volume Cover] Found via Jikan: ${coverUrl}`);
                            return coverUrl;
                        }
                    }
                }
            }
        }

        console.log('[Volume Cover] No cover found from any source');
        return null;
    } catch (error) {
        console.error('[Volume Cover Error]', error);
        return null;
    }
}

/**
 * INTELLIGENT PREDICTION - The Core Algorithm
 * Uses mathematical adaptation ratios to predict ANY episode
 */
async function intelligentPredict(animeTitle, episodeNumber) {
    // Find anime in database (with fuzzy matching + aliases)
    const animeData = findAnimeInDB(animeTitle);

    if (!animeData) {
        console.log('[Intelligent Predict] Anime not in database');
        return null;
    }

    console.log(`[Intelligent Predict] Found "${animeData.matchedName}"`);

    // Calculate adaptation ratio
    const ratio = calculateAdaptationRatio(animeData.data);

    if (!ratio) {
        console.log('[Intelligent Predict] Could not calculate ratio');
        return null;
    }

    console.log(`[Ratio Info] ${ratio.avgRatio} ch/ep | Consistency: ${(ratio.consistency * 100).toFixed(0)}%`);

    // Check if we have exact data for this episode
    const exactMatch = animeData.data.verifiedSeasons.find(s => s.finalEpisode === episodeNumber);

    if (exactMatch) {
        // Perfect! We have verified data for this exact episode
        const seasonInfo = exactMatch.notes || '';
        const seasonNum = exactMatch.season;

        // Build context message
        let contextMsg = '';
        if (seasonNum) {
            contextMsg = `This is Season ${seasonNum}`;
            if (seasonInfo) {
                contextMsg += ` (${seasonInfo})`;
            }
            contextMsg += '. ';
        } else if (seasonInfo) {
            contextMsg = `${seasonInfo}. `;
        }

        // Fetch volume cover image
        const volumeCover = await getVolumeCover(animeData.matchedName, exactMatch.continueFromVolume);

        return {
            continueFromChapter: exactMatch.continueFromChapter,
            continueFromVolume: exactMatch.continueFromVolume,
            buyVolume: exactMatch.continueFromVolume,
            confidence: 'high',
            reasoning: `${contextMsg}Continue reading from chapter ${exactMatch.continueFromChapter} (volume ${exactMatch.continueFromVolume}).`,
            sourceMaterial: 'Manga',
            specialNotes: null,
            verified: true,
            method: 'exact_match',
            volumeCoverUrl: volumeCover
        };
    }

    // No exact match - USE MATHEMATICAL PREDICTION!

    // VALIDATION: Check if episode number is valid
    const totalEpisodes = animeData.data.totalEpisodes;
    const status = animeData.data.status || 'unknown';

    if (totalEpisodes && episodeNumber > totalEpisodes) {
        // Episode number exceeds known total
        if (status === 'complete') {
            return {
                continueFromChapter: null,
                continueFromVolume: null,
                buyVolume: null,
                confidence: 'low',
                reasoning: `${animeData.matchedName} only has ${totalEpisodes} episodes (complete). Episode ${episodeNumber} doesn't exist.`,
                sourceMaterial: 'Manga',
                specialNotes: 'Invalid episode - anime complete',
                verified: false,
                method: 'validation_failed'
            };
        } else if (status === 'ongoing') {
            return {
                continueFromChapter: null,
                continueFromVolume: null,
                buyVolume: null,
                confidence: 'low',
                reasoning: `${animeData.matchedName} currently has ${totalEpisodes} episodes. Episode ${episodeNumber} hasn't aired yet. Check back when new episodes release!`,
                sourceMaterial: 'Manga',
                specialNotes: 'Episode not yet aired',
                verified: false,
                method: 'validation_failed'
            };
        }
    }

    const predictedChapter = Math.round(episodeNumber * ratio.avgRatio);
    const continueFromChapter = predictedChapter + 1;
    const predictedVolume = Math.round(continueFromChapter / ratio.avgChaptersPerVolume);

    let confidence = 'medium';
    if (ratio.consistency > 0.9) confidence = 'high';
    else if (ratio.consistency < 0.7) confidence = 'low';

    return {
        continueFromChapter: continueFromChapter,
        continueFromVolume: predictedVolume,
        buyVolume: predictedVolume,
        confidence: confidence,
        reasoning: `After episode ${episodeNumber}, continue reading from chapter ${continueFromChapter} (volume ${predictedVolume}).`,
        sourceMaterial: 'Manga',
        specialNotes: null,
        verified: false,
        method: 'ratio_calculation'
    };
}

/**
 * Find anime in database with fuzzy matching + aliases
 */
function findAnimeInDB(animeTitle) {
    // Try exact match
    if (verifiedDB[animeTitle]) {
        return { matchedName: animeTitle, data: verifiedDB[animeTitle] };
    }

    // Try fuzzy match with aliases
    const normalizedSearch = animeTitle.toLowerCase();

    for (const [key, data] of Object.entries(verifiedDB)) {
        // Check main title
        if (key.toLowerCase() === normalizedSearch ||
            key.toLowerCase().includes(normalizedSearch) ||
            normalizedSearch.includes(key.toLowerCase())) {
            return { matchedName: key, data: data };
        }

        // Check aliases
        const aliases = data.aliases || [];
        const matchesAlias = aliases.some(alias =>
            alias.toLowerCase() === normalizedSearch ||
            alias.toLowerCase().includes(normalizedSearch) ||
            normalizedSearch.includes(alias.toLowerCase())
        );

        if (matchesAlias) {
            return { matchedName: key, data: data };
        }
    }

    return null;
}

/**
 * Calculate adaptation ratio using verified seasons
 * Now supports filler-aware calculation via canonEpisodes field
 */
function calculateAdaptationRatio(animeData) {
    if (!animeData.verifiedSeasons || animeData.verifiedSeasons.length === 0) {
        return null;
    }

    const seasons = animeData.verifiedSeasons;

    // Calculate total chapters and episodes across all seasons
    let totalChapters = 0;
    let totalEpisodes = 0;
    let totalCanonEpisodes = 0;
    let hasCanonData = false;

    const ratios = [];

    for (let i = 0; i < seasons.length; i++) {
        const season = seasons[i];
        const prevSeason = i > 0 ? seasons[i - 1] : null;

        // Calculate chapter difference for this season
        const chapterStart = prevSeason ? prevSeason.continueFromChapter : 1;
        const chaptersInSeason = season.continueFromChapter - chapterStart;

        // Use canonEpisodes if available (excludes fillers), otherwise use finalEpisode
        const episodesInSeason = season.canonEpisodes || season.finalEpisode;

        if (season.canonEpisodes) {
            hasCanonData = true;
            totalCanonEpisodes += season.canonEpisodes;
        }

        totalChapters += chaptersInSeason;
        totalEpisodes += episodesInSeason;

        const seasonRatio = chaptersInSeason / episodesInSeason;
        ratios.push(seasonRatio);
    }

    // Use canon episodes for ratio if available (better accuracy, excludes fillers)
    const effectiveEpisodes = hasCanonData ? totalCanonEpisodes : totalEpisodes;
    const avgRatio = totalChapters / effectiveEpisodes;

    const stdDev = Math.sqrt(variance);
    const consistency = 1 - Math.min(stdDev, 1); // Normalize consistency

    // Estimate chapters per volume (Total Chapters / Total Volumes)
    // We use the last season's data as it represents the cumulative total
    const lastSeason = seasons[seasons.length - 1];
    const totalVolumes = lastSeason.continueFromVolume || 1;
    const avgChaptersPerVolume = totalChapters / totalVolumes;

    return {
        avgRatio,
        consistency,
        avgChaptersPerVolume: avgChaptersPerVolume || 9 // Default to 9 if calculation fails
    };
}

/**
 * Gemini AI fallback (for anime not in DB)
 */
async function queryGeminiAI(anime, episode, apiKey) {
    console.log('[Gemini AI] Generating prediction...');

    const prompt = `You are an EXPERT on anime-to-manga chapter mapping.

ANIME TITLE: "${anime}"
EPISODE NUMBER: ${episode}

INSTRUCTIONS:
1. Determine the EXACT manga chapter where episode ${episode} ends
2. Tell me the NEXT chapter to start reading (chapter AFTER that episode)
3. Keep reasoning SIMPLE and DIRECT

RESPOND IN EXACT JSON FORMAT:
{
    "continueFromChapter": number,
    "continueFromVolume": number,
    "buyVolume": number,
    "confidence": "medium",
    "reasoning": "After episode ${episode}, continue reading from chapter X (volume Y).",
    "sourceMaterial": "Manga",
    "specialNotes": null
}

IMPORTANT: Keep reasoning short. Just say where to continue, no extra details.`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.9
                }
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[Gemini API Error]', response.status, errorText);
        throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
        throw new Error('Empty response from AI');
    }

    const cleanJson = aiText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

    const result = JSON.parse(cleanJson);
    result.verified = false;
    result.method = 'gemini_ai';

    console.log('[Gemini AI] Response:', result);
    return result;
}
