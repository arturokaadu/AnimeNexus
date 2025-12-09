/**
 * Vercel Serverless Function - Gemini AI Manga Resolver
 * 
 * Given an anime title and episode number, returns exactly where to continue
 * reading the manga (chapter, volume, and purchase recommendation).
 * 
 * Requires GEMINI_API_KEY environment variable.
 */

export default async function handler(req, res) {
    const { anime, episode } = req.query;

    if (!anime || !episode) {
        return res.status(400).json({ error: 'Missing anime or episode parameters' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error: 'Server Misconfiguration',
            details: 'GEMINI_API_KEY is not set on the server.'
        });
    }

    try {
        console.log(`[Gemini API] Query: "${anime}" Episode ${episode}`);

        const prompt = `Eres un experto en anime y manga. Tu trabajo es decirle al usuario EXACTAMENTE en qué capítulo y volumen del manga debe continuar después de ver un episodio específico de anime.

ANIME: "${anime}"
EPISODIO VISTO: ${episode}

INSTRUCCIONES:
1. Identifica a qué capítulo del manga corresponde el episodio ${episode} del anime "${anime}"
2. Indica el PRÓXIMO capítulo de manga que debe leer el usuario (el siguiente al que cubre ese episodio)
3. Indica en qué VOLUMEN está ese capítulo
4. Recomienda qué volumen comprar

DATOS DE REFERENCIA VERIFICADOS (usa estos como guía de calibración):
- Frieren: Beyond Journey's End - El anime (28 eps) termina en el capítulo 60 → Continuar desde Cap 61, Volumen 7
- Chainsaw Man Parte 1 - El anime (12 eps) termina en el capítulo 38 → Continuar desde Cap 39, Volumen 5
  * La película "Reze Arc" cubre los volúmenes 5-6, si la vieron empezar en Volumen 7
- Jujutsu Kaisen S1 (24 eps) termina en capítulo 63 → Continuar desde Cap 64, Volumen 8
- Jujutsu Kaisen S2 (23 eps, total ep 47) termina en capítulo 136 → Continuar desde Cap 137, Volumen 16
- Attack on Titan S1 (25 eps) termina en capítulo 33 → Continuar desde Cap 34, Volumen 9
- Demon Slayer S1 (26 eps) termina en capítulo 53 → Continuar desde Cap 54, Volumen 7
- My Hero Academia S7 (21 eps, total ~153) termina en capítulo 423 (FIN del manga)
- Spy x Family S1 (25 eps) termina en capítulo 38 → Continuar desde Cap 39, Volumen 7
- Vinland Saga S2 (24 eps) termina en capítulo 99 → Continuar desde Cap 100, Volumen 14
- One Punch Man S2 (12 eps) termina en capítulo 84 → Continuar desde Cap 85, Volumen 17
- Blue Lock (24 eps) termina en capítulo 108 → Continuar desde Cap 109, Volumen 13
- Solo Leveling S1 (12 eps) termina en capítulo 45 → Continuar desde Cap 46, Volumen 5
- Tokyo Revengers S1 (24 eps) termina en capítulo 73 → Continuar desde Cap 74, Volumen 9

REGLAS IMPORTANTES:
1. Si el usuario pone un episodio específico, calcula proporcionalmente basándote en los datos de referencia
2. La mayoría de animes adaptan ~2-3 capítulos por episodio
3. Si el anime es ORIGINAL (sin manga fuente como Cowboy Bebop, Code Geass), dilo claramente
4. Si está basado en Light Novel, indica que es Light Novel, no manga

RESPONDE ÚNICAMENTE EN ESTE FORMATO JSON:
{
    "continueFromChapter": número o null,
    "continueFromVolume": número o null,
    "buyVolume": número o null,
    "confidence": "high" | "medium" | "low",
    "reasoning": "El episodio X del anime cubre hasta el capítulo Y del manga. Debes continuar desde el capítulo Z que está en el Volumen W.",
    "sourceMaterial": "Manga" | "Light Novel" | "Web Novel" | "Original",
    "specialNotes": "Notas especiales sobre películas, OVAs, o el anime completo" o null
}`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.1, // Muy bajo para máxima consistencia
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

        // Clean and parse JSON response
        const cleanJson = aiText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const result = JSON.parse(cleanJson);

        console.log('[Gemini API] Response:', result);
        return res.status(200).json(result);

    } catch (error) {
        console.error('[Gemini Resolver Error]', error);
        return res.status(500).json({
            error: error.message,
            continueFromChapter: null,
            continueFromVolume: null,
            confidence: 'low',
            reasoning: 'Error al obtener datos del servicio AI.'
        });
    }
}
