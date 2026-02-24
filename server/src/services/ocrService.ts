import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

const API_KEY = process.env.GEMINI_API_KEY;

export const ocrService = {
    analyzeImage: async (filePath: string, mode: string = 'LAB') => {
        console.log(`ocrService.analyzeImage called with path: ${filePath}, mode: ${mode}`);

        if (!API_KEY) {
            console.error("ocrService: GEMINI_API_KEY is missing!");
            throw new Error('GEMINI_API_KEY is not configured');
        }

        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            // Using gemini-2.0-flash as it is typically free of 404s on newer SDK versions
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

            if (!fs.existsSync(filePath)) {
                console.error("ocrService: File not found at:", filePath);
                throw new Error(`File not found: ${filePath}`);
            }

            const imageBuffer = fs.readFileSync(filePath);
            const imageBase64 = imageBuffer.toString('base64');
            console.log("ocrService: Image read successfully, size:", imageBuffer.length);

            let prompt = "";

            if (mode === 'VITALS') {
                prompt = `
                    Analyze this image of a patient monitor or chart showing vital signs.
                    Extract the following physiological parameters if present:
                    - Heart Rate (hr): usually near "HR" or a heart symbol, or simply a prominent number often green/yellow. Return as number.
                    - Systolic Blood Pressure (bpSys): the higher number in the NIBP or ART reading (e.g., in 120/80, it's 120). Return as number.
                    - Diastolic Blood Pressure (bpDia): the lower number in the NIBP or ART reading (e.g., in 120/80, it's 80). Return as number.
                    - Oxygen Saturation (spo2): usually near "SpO2" or "%", typically 90-100. Return as number.
                    - Temperature (temp): usually near "Temp" or "T", ending in C or F (convert to Celsius if F, but usually just return the number). Return as number.

                    If a value is not found or unreadable, return null for that field.

                    Return ONLY a SINGLE JSON object with the exact keys: "hr", "bpSys", "bpDia", "spo2", "temp".
                    Do not wrap it in an array. Do not include markdown formatting like \`\`\`json.
                `;
            } else {
                prompt = `
                    Analyze this medical lab report image. It may contain one or multiple different tests.
                    
                    IMPORTANT: You must SEPARATE distinct panels into their own objects. 
                    Specifically, if you see data for "Renal Function" (Creatinine, Urea), "CRP" (C-Reactive Protein), "Electrolytes" (Na, K, Cl), or "Coagulation" (PT, PTT, INR), create a SEPARATE object for each one.
                    Even if multiple distinct tests (like CBC and PT) are printed together on the same page, you MUST output a separate object for EACH distinct test type. Do NOT miss any test found on the page.
                    
                    CRITICAL EXCEPTION 1: If the results contain "pH" (indicating an Arterial Blood Gas / ABG test), do NOT separate ANY parameters. 
                    In this case, bundle EVERYTHING (including Electrolytes like Na, K, Cl, Lactate, etc.) into a single "ABG" test object.
                    
                    CRITICAL EXCEPTION 2: If the results include both "COMPLETE BLOOD COUNT" (or CBC) AND "Differential white cell Count", you MUST MERGE them together. Do NOT create a separate object for the Differential count; instead, place all of its parameters (like Neutrophils, Lymphocytes, MID %) inside the "CBC" object's "results". Use "CBC" as the title.
                    
                    Extract the information and return a JSON ARRAY of objects, where each object represents a distinct test/panel.
                    
                    Each object in the array must have:
                    1. "type": Must be "LAB" (for blood tests, urine tests) or "IMAGING" (for X-rays, MRI, CT).
                    2. "category": The category of the test (e.g., Hematology, Biochemistry, Microbiology, Serology).
                    3. "title": The name of the test or panel (e.g., CBC, Lipid Profile, Liver Function Test).
                    4. "date": Extract the "Collection Date", "Report Date", or "Date" printed on the report. Return it in YYYY-MM-DD format if clearly identifiable. If only a raw string is found (e.g. "12/05/2024"), return exactly that string. If no date is found, return null.
                    5. "time": Extract the exact time (e.g. "14:30" or "02:30 PM") of the investigation / collection printed on the report. Return null if not found.
                    6. "results": A JSON object where keys are the specific test parameter names (e.g., Hemoglobin, WBC, Platelets) and values are the numerical result or string finding.
                    
                    Return ONLY the JSON ARRAY. Do not include markdown formatting like \`\`\`json.
                `;
            }

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
            console.log("ocrService: Raw response:", responseText); // Debug logging

            // Clean up markdown if present
            const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

            try {
                let parsed = JSON.parse(jsonString);

                if (mode === 'VITALS') {
                    // Expecting a single object dict, return as is
                    return parsed;
                }

                // LAB mode logic: Ensure it's an array
                if (!Array.isArray(parsed)) {
                    console.log("ocrService: Response was not an array, wrapping in array.");
                    parsed = [parsed];
                }
                // Programmatic merge for CBC and Differential, just in case AI fails to follow instructions
                if (Array.isArray(parsed)) {
                    let cbcIndex = parsed.findIndex(p => p.title && (p.title.toUpperCase().includes('CBC') || p.title.toUpperCase().includes('COMPLETE BLOOD')));
                    let diffIndex = parsed.findIndex(p => p.title && p.title.toUpperCase().includes('DIFFERENTIAL'));

                    if (cbcIndex !== -1 && diffIndex !== -1 && cbcIndex !== diffIndex) {
                        console.log("ocrService: Programmatically merging Differential into CBC");
                        parsed[cbcIndex].results = { ...parsed[cbcIndex].results, ...parsed[diffIndex].results };
                        parsed[cbcIndex].title = "CBC";
                        parsed.splice(diffIndex, 1);
                    } else if (cbcIndex !== -1) {
                        parsed[cbcIndex].title = "CBC"; // Normalize title
                    }
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
