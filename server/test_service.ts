
import 'dotenv/config';
import { ocrService } from './src/services/ocrService';
import path from 'path';

async function run() {
    try {
        const filename = 'file-1770853954201-691371317.jpeg';
        const absolutePath = path.join(__dirname, 'uploads', filename);

        console.log("Testing ocrService with file:", absolutePath);

        const result = await ocrService.analyzeImage(absolutePath);
        console.log("Service Result:", JSON.stringify(result, null, 2));

    } catch (e) {
        console.error("Service Error:", e);
    }
}

run();
