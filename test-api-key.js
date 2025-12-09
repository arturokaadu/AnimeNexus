/**
 * Quick test script to verify if the Gemini API key works
 */

const API_KEY = 'AIzaSyD-CH4S6YpzZW_b9vdKwvwfkLsNtzjGIx8';

async function testGeminiAPI() {
    console.log('🔍 Testing Gemini API Key...\n');

    const prompt = 'Hello, just testing if the API works. Please respond with "API is working correctly"';

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        console.log('📡 Response Status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error Response:', errorText);
            return false;
        }

        const data = await response.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        console.log('✅ API Response:', aiText);
        console.log('\n✅ API Key is VALID and working!\n');
        return true;

    } catch (error) {
        console.error('❌ Error:', error.message);
        return false;
    }
}

testGeminiAPI();
