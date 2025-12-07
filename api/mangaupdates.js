// AI-Powered Real-Time Manga Lookup
// Works like Gemini - searches multiple sources dynamically for ANY anime

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { anime, episode } = req.query;

    if (!anime) {
        return res.status(400).json({ error: 'Missing anime parameter' });
    }

    console.log(`[MangaLookup] Searching for: "${anime}" episode ${episode || 'final'}`);

    try {
        // Strategy 1: MangaUpdates API (has exact anime.end data)
        const mangaUpdatesResult = await searchMangaUpdates(anime);
        if (mangaUpdatesResult?.chapter) {
            console.log(`[MangaLookup] MangaUpdates success: Ch.${mangaUpdatesResult.chapter}`);
            return res.status(200).json({
                ...mangaUpdatesResult,
                source: 'MangaUpdates Database',
                confidence: 'high'
            });
        }

        // Strategy 2: Web scraping wheredoestheanimeleaveoff.com
        const wdtaloResult = await scrapeWDTALO(anime);
        if (wdtaloResult?.chapter) {
            console.log(`[MangaLookup] WDTALO success: Ch.${wdtaloResult.chapter}`);
            return res.status(200).json({
                ...wdtaloResult,
                source: 'wheredoestheanimeleaveoff.com',
                confidence: 'high'
            });
        }

        // Strategy 3: Search aggregation (like Gemini)
        const searchResult = await searchWeb(anime, episode);
        if (searchResult?.chapter) {
            console.log(`[MangaLookup] Web search success: Ch.${searchResult.chapter}`);
            return res.status(200).json({
                ...searchResult,
                source: 'Web Search (Multiple Sources)',
                confidence: 'medium'
            });
        }

        // No data found
        return res.status(404).json({
            error: 'No manga data found',
            anime: anime,
            suggestion: `Try searching: "${anime} manga chapter where anime ends"`
        });

    } catch (error) {
        console.error('[MangaLookup] Error:', error.message);
        return res.status(500).json({ error: 'Search failed' });
    }
}

// Search MangaUpdates API
async function searchMangaUpdates(anime) {
    try {
        // Search for the series
        const searchResponse = await fetch('https://api.mangaupdates.com/v1/series/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ search: anime, per_page: 5 })
        });

        const searchData = await searchResponse.json();
        const results = searchData.results || [];

        if (results.length === 0) return null;

        // Find best match
        const bestMatch = results.find(r => {
            const title = r.record?.title?.toLowerCase() || '';
            const searchLower = anime.toLowerCase();
            return title.includes(searchLower) || searchLower.includes(title);
        }) || results[0];

        if (!bestMatch?.record?.series_id) return null;

        // Get series details
        const detailsResponse = await fetch(
            `https://api.mangaupdates.com/v1/series/${bestMatch.record.series_id}`
        );
        const details = await detailsResponse.json();

        // Parse anime.end field (contains exact chapter where anime ends)
        if (details?.anime?.end) {
            return parseChapterInfo(details.anime.end, details);
        }

        return null;
    } catch (error) {
        console.error('[MangaUpdates]', error.message);
        return null;
    }
}

// Scrape wheredoestheanimeleaveoff.com
async function scrapeWDTALO(anime) {
    try {
        // This site has exact chapter data for most popular anime
        const slug = anime.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        const response = await fetch(`https://wheredoestheanimeleaveoff.com/${slug}/`);

        if (!response.ok) return null;

        const html = await response.text();

        // Parse chapter and volume from HTML
        const chapterMatch = html.match(/chapter\s*(\d+)/i);
        const volumeMatch = html.match(/volume\s*(\d+)/i);

        if (chapterMatch) {
            return {
                chapter: parseInt(chapterMatch[1]),
                volume: volumeMatch ? parseInt(volumeMatch[1]) : null,
                mangaTitle: anime
            };
        }

        return null;
    } catch (error) {
        console.error('[WDTALO]', error.message);
        return null;
    }
}

// Web search aggregation (like Gemini)
async function searchWeb(anime, episode) {
    try {
        // Use DuckDuckGo instant answer API
        const query = encodeURIComponent(`${anime} anime season ends manga chapter`);
        const response = await fetch(`https://api.duckduckgo.com/?q=${query}&format=json`);
        const data = await response.json();

        // Try to extract chapter info from abstract
        const abstract = data.AbstractText || data.Abstract || '';
        const result = parseChapterFromText(abstract);

        if (result) return result;

        // Parse from related topics
        for (const topic of (data.RelatedTopics || [])) {
            const text = topic.Text || '';
            const parsed = parseChapterFromText(text);
            if (parsed) return { ...parsed, mangaTitle: anime };
        }

        return null;
    } catch (error) {
        console.error('[WebSearch]', error.message);
        return null;
    }
}

// Parse chapter and volume from MangaUpdates format
function parseChapterInfo(text, details) {
    const patterns = [
        /vol(?:ume)?\.?\s*(\d+)/i,
        /v\.?\s*(\d+)/i
    ];

    const chapterPatterns = [
        /chap(?:ter)?\.?\s*(\d+)/i,
        /ch\.?\s*(\d+)/i,
        /c\.?\s*(\d+)/i
    ];

    let volume = null;
    let chapter = null;

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            volume = parseInt(match[1]);
            break;
        }
    }

    for (const pattern of chapterPatterns) {
        const match = text.match(pattern);
        if (match) {
            chapter = parseInt(match[1]);
            break;
        }
    }

    if (chapter) {
        return {
            chapter,
            volume,
            mangaTitle: details?.title || null,
            totalChapters: details?.latest_chapter || null,
            status: details?.status || null
        };
    }

    return null;
}

// Parse chapter info from arbitrary text
function parseChapterFromText(text) {
    if (!text) return null;

    // Match patterns like "chapter 64", "ch. 33", etc.
    const chapterMatch = text.match(/chapter\s*#?\s*(\d+)/i) ||
        text.match(/ch\.?\s*(\d+)/i);

    const volumeMatch = text.match(/volume\s*#?\s*(\d+)/i) ||
        text.match(/vol\.?\s*(\d+)/i);

    if (chapterMatch) {
        return {
            chapter: parseInt(chapterMatch[1]),
            volume: volumeMatch ? parseInt(volumeMatch[1]) : null
        };
    }

    return null;
}
