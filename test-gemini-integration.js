
const fs = require('fs');
const https = require('https');

// 1. Load Env
try {
    const envFile = fs.readFileSync('.env', 'utf8');
    const keyMatch = envFile.match(/GEMINI_API_KEY=(.+)/);
    if (keyMatch) {
        process.env.GEMINI_API_KEY = keyMatch[1].trim();
    }
} catch (e) {
    console.error("Could not read .env");
    process.exit(1);
}

const apiKey = process.env.GEMINI_API_KEY;

// 2. Define the Test Query
const query = {
    anime: "My Hero Academia: Vigilantes",
    episode: "12"
};

const prompt = `
You are an expert Otaku and Librarian.
Current Date: 12/8/2025 (The year is 2025 or later).

User has watched: "${query.anime}" up to Episode ${query.episode}.

GOAL: Tell them EXACTLY where to start reading the manga to continue the story.

CRITICAL RULES:
1. **TRUST THE USER**: If the user provides an episode number (e.g. "Ep 12"), assume the anime EXISTS, even if your training data is old.
   - For example, "My Hero Academia: Vigilantes" has likely aired recently (Spring 2025). Do NOT say "It is manga only" if the user has watched Episode 12.
2. **PACING ESTIMATION (If data unknown)**:
   - If you don't have exact data for a recent anime, ESTIMATE based on standard industry pacing (~2.5 chapters per episode).
   - Example: Ep 12 usually covers ~Chapter 30-36.
   - In this case, set "confidence": "medium" and explain in "reasoning": "Based on standard pacing (approx Ch 32) as exact data is recent."
3. If "Episode ${query.episode}" is the end of a specific Season (e.g. S1 Ep 12), consider what that covers.
4. If the anime is original or has no manga, say so.

EXAMPLES:
- "Frieren" Ep 28 -> Start Chapter 61 (Vol 7).
- "Jujutsu Kaisen" Ep 24 -> Start Chapter 64 (Vol 8).
- "MHA Vigilantes" Ep 12 -> Start Chapter 32 (Vol 4) (Estimated if exact data missing).

OUTPUT FORMAT (JSON ONLY):
{
    "chapter": number | null,
    "volume": number | null,
    "reasoning": "string",        // Friendly explanation. Mention if estimated due to recency.
    "confidence": "high" | "medium" | "low",
    "source_material": "Manga" | "Light Novel" | "Original"
}
`;

const postData = JSON.stringify({
    contents: [{
        parts: [{ text: prompt }]
    }]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
    }
};

console.log(`\nTesting Query: "${query.anime}" Ep ${query.episode}...`);

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("API Error:", JSON.stringify(json, null, 2));
                return;
            }

            const aiText = json.candidates?.[0]?.content?.parts?.[0]?.text;
            console.log("\n--- AI Response Raw ---\n", aiText);

            // Cleanup and parse
            const cleanJson = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            console.log("\n--- Parsed Result ---\n", parsed);

        } catch (e) {
            console.error("Parse Error:", e.message);
            console.log("Raw Response:", data);
        }
    });
});

req.on('error', (e) => {
    console.error("Request Error:", e);
});

req.write(postData);
req.end();
