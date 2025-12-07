// Vercel Serverless Function - MangaUpdates API Proxy
// This bypasses CORS restrictions by proxying requests from the browser

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action, query, seriesId } = req.query;

    try {
        if (action === 'search') {
            // Search for manga by title
            const response = await fetch('https://api.mangaupdates.com/v1/series/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    search: query,
                    per_page: 5
                })
            });

            const data = await response.json();
            return res.status(200).json(data);

        } else if (action === 'details' && seriesId) {
            // Get series details including anime.end
            const response = await fetch(`https://api.mangaupdates.com/v1/series/${seriesId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();
            return res.status(200).json(data);

        } else {
            return res.status(400).json({ error: 'Invalid action. Use ?action=search&query=<title> or ?action=details&seriesId=<id>' });
        }

    } catch (error) {
        console.error('[MangaUpdates Proxy] Error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch from MangaUpdates API' });
    }
}
