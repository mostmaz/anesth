import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '.env') });
import { GoogleGenerativeAI } from '@google/generative-ai';

async function run() {
    const API_KEY = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });

    const filePath = './uploads/sync-3120378-1771886649550-903.png';
    const imageBuffer = fs.readFileSync(filePath);
    const imageBase64 = imageBuffer.toString('base64');

    const prompt = `Please transcribe ALL the text visible in this image verbatim. Do not summarize or format into JSON. Just output all the raw text you see. Pay special attention to any medical test names like "PT", "Prothrombin Time", "Coagulation", or "CBC".`;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                data: imageBase64,
                mimeType: 'image/png'
            }
        }
    ]);
    console.log(result.response.text());
}
run();
