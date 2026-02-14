import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

const API_KEY = process.env.GEMINI_API_KEY;

export const ocrService = {
    analyzeImage: async (filePath: string) => {
        console.log("ocrService.analyzeImage called with path:", filePath);

        if (!API_KEY) {
            console.error("ocrService: GEMINI_API_KEY is missing!");
            throw new Error('GEMINI_API_KEY is not configured');
        }

        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            // Use gemini-2.5-flash as it was detected as available and working.
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            if (!fs.existsSync(filePath)) {
                console.error("ocrService: File not found at:", filePath);
                throw new Error(`File not found: ${filePath}`);
            }

            const imageBuffer = fs.readFileSync(filePath);
            const imageBase64 = imageBuffer.toString('base64');
            console.log("ocrService: Image read successfully, size:", imageBuffer.length);

            const prompt = `
                Analyze this medical lab report image. It may contain one or multiple different tests.
                
                IMPORTANT: You must SEPARATE distinct panels into their own objects. 
                Specifically, if you see data for "Renal Function" (Creatinine, Urea), "CRP" (C-Reactive Protein), or "Electrolytes" (Na, K, Cl), create a SEPARATE object for each one.
                
                CRITICAL EXCEPTION: If the results contain "pH" (indicating an Arterial Blood Gas / ABG test), do NOT separate ANY parameters. 
                In this case, bundle EVERYTHING (including Electrolytes like Na, K, Cl, Lactate, etc.) into a single "ABG" test object.
                
                Extract the information and return a JSON ARRAY of objects, where each object represents a distinct test/panel.
                
                Each object in the array must have:
                1. "type": Must be "LAB" (for blood tests, urine tests) or "IMAGING" (for X-rays, MRI, CT).
                2. "category": The category of the test (e.g., Hematology, Biochemistry, Microbiology, Serology).
                3. "title": The name of the test or panel (e.g., CBC, Lipid Profile, Liver Function Test).
                4. "date": Extract the "Collection Date", "Report Date", or "Date" printed on the report. Return it in YYYY-MM-DD format if clearly identifiable. If only a raw string is found (e.g. "12/05/2024"), return exactly that string. If no date is found, return null.
                5. "results": A JSON object where keys are the specific test parameter names (e.g., Hemoglobin, WBC, Platelets) and values are the numerical result or string finding.
                
                Return ONLY the JSON ARRAY. Do not include markdown formatting like \`\`\`json.
            `;

            console.log("ocrService: sending to Gemini...");
            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: imageBase64,
                        mimeType: 'image/jpeg'
                    }
                }
            ]);

            const responseText = result.response.text();
            console.log("ocrService: Gemini response received length:", responseText.length);

            // Clean up markdown if present
            const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

            try {
                let parsed = JSON.parse(jsonString);
                // Ensure it's an array
                if (!Array.isArray(parsed)) {
                    console.log("ocrService: Response was not an array, wrapping in array.");
                    parsed = [parsed];
                }
                console.log("ocrService: JSON parsed successfully. Items:", parsed.length);
                return parsed;
            } catch (e) {
                console.error("Failed to parse OCR JSON:", jsonString);
                throw new Error('Failed to parse AI response');
            }
        } catch (error) {
            console.error("ocrService: Error during analysis:", error);
            throw error;
        }
    }
};
