/**
 * List available Gemini models
 */

const API_KEY = 'AIzaSyD-CH4S6YpzZW_b9vdKwvwfkLsNtzjGIx8';

async function listModels() {
    console.log('🔍 Fetching available Gemini models...\n');

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error:', errorText);
            return;
        }

        const data = await response.json();

        console.log('📋 Available Models:');
        console.log('='.repeat(60));

        if (data.models) {
            data.models.forEach(model => {
                if (model.name.includes('gemini')) {
                    console.log(`\n📦 ${model.name}`);
                    console.log(`   Supported: ${model.supportedGenerationMethods?.join(', ')}`);
                }
            });
        }

        console.log('\n' + '='.repeat(60));

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

listModels();
