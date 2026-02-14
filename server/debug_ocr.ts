
import 'dotenv/config';
import { ocrService } from './src/services/ocrService';
import path from 'path';

async function run() {
    try {
        const filename = 'file-1770853954201-691371317.jpeg';
        const absolutePath = path.join(__dirname, 'uploads', filename);

        console.log("Testing OCR with file:", absolutePath);

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // Read file first
        const imageBuffer = require('fs').readFileSync(absolutePath);
        const imageBase64 = imageBuffer.toString('base64');

        // Try to list models using REST API to be sure what is available
        const apiKey = process.env.GEMINI_API_KEY;
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

        console.log("Listing models via REST...");
        const response = await fetch(listUrl);
        const data = await response.json();

        if (data.models) {
            const generateModels = data.models
                .filter((m: any) => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
                .map((m: any) => m.name);
            console.log("Models supporting generateContent:", JSON.stringify(generateModels, null, 2));

            // Try the first valid model found
            if (generateModels.length > 0) {
                const firstModel = generateModels[0];
                // strip "models/" if present
                const modelName = firstModel.replace('models/', '');
                console.log(`Auto-detected model to try: ${modelName}`);

                const model = genAI.getGenerativeModel({ model: modelName });
                try {
                    const result = await model.generateContent([
                        "Describe this image",
                        {
                            inlineData: {
                                data: imageBase64,
                                mimeType: 'image/jpeg'
                            }
                        }
                    ]);
                    console.log(`Success with ${modelName}:`, result.response.text());
                } catch (e: any) {
                    console.log(`Failed with ${modelName}:`, e.message);
                }
            } else {
                console.log("No models found that support generateContent.");
            }
        } else {
            console.log("Failed to list models or no models returned:", data);
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
