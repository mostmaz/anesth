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
            // Defaulting to gemini-2.0-flash
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
                    Extract all technical data points from the attached document.
                    Return ONLY a JSON array of grouped objects.
                    Format: [{"title": "Section Title", "results": {"Key": {"value": "Result", "range": "Ref", "isAbnormal": boolean}}}]
                    
                    CRITICAL Categorization Rules:
                    - "CBC" (Complete Blood Count): MUST include both cell counts AND the differential (Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils) if present.
                    - "Renal Function": Group Urea, Creatinine (Urea/S. Creatinine), and any BUN/eGFR together.
                    - "CRP": Extract C-Reactive Protein as its own title.
                    - "Procalcitonin": Extract as its own title.
                    - "Electrolytes": Group Sodium, Potassium, Chloride, etc.
                    - "Liver Function Tests": Group ALT, AST, Bilirubin, Albumin, etc.
                    - "Coagulation": Group PT, PTT, INR.

                    DO NOT use the patient's name, doctor's name, hospital name, or dates as the "title".
                    Translate any non-English labels to English medical terms where appropriate.
                    Strictly JSON only. No text.
                `;
            }

            console.log("ocrService: sending to Gemini...");
            const extension = filePath.split('.').pop()?.toLowerCase();
            const mimeType = extension === 'pdf' ? 'application/pdf' : (extension === 'png' ? 'image/png' : 'image/jpeg');

            const modelNames = ['gemini-2.0-flash', 'gemini-2.5-pro'];
            let lastError: any = null;

            for (const modelName of modelNames) {
                try {
                    console.log(`ocrService: trying model ${modelName}...`);
                    const currentModel = genAI.getGenerativeModel({ model: modelName });
                    const result = await currentModel.generateContent([
                        prompt,
                        {
                            inlineData: {
                                data: imageBase64.substring(0, 1000000), // Safety check, though Gemini handles large files
                                mimeType: mimeType
                            }
                        }
                    ]);

                    const responseText = result.response.text().trim();
                    console.log(`ocrService: ${modelName} response length:`, responseText.length);
                    if (responseText.length < 500) console.log(`ocrService: Raw short response from ${modelName}:`, responseText);

                    // Clean up markdown
                    const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

                    if (jsonString.toLowerCase().startsWith("i'm sorry") || jsonString.toLowerCase().startsWith("cannot") || jsonString.toLowerCase().startsWith("sorry")) {
                        console.log(`ocrService: ${modelName} refused/apologized. Trying next model...`);
                        continue;
                    }

                    try {
                        let parsed = JSON.parse(jsonString);

                        if (mode === 'LAB' && Array.isArray(parsed) && (parsed.length === 0 || (parsed.length === 1 && Object.keys(parsed[0].results || {}).length === 0))) {
                            console.log(`ocrService: ${modelName} returned empty results. Trying next model...`);
                            continue;
                        }

                        if (mode === 'VITALS') return parsed;

                        if (!Array.isArray(parsed)) parsed = [parsed];

                        // Normalize and merge logic
                        if (Array.isArray(parsed)) {
                            // Merge logic for CBC, Coagulation, and Renal Function
                            const mergeCategories = (titles: string[], targetName: string) => {
                                let groups = parsed.filter(p => p && p.title && titles.some(t => p.title.toUpperCase().includes(t)));
                                if (groups.length > 1) {
                                    let primary = groups[0];
                                    for (let i = 1; i < groups.length; i++) {
                                        primary.results = { ...primary.results, ...groups[i].results };
                                        const idx = parsed.indexOf(groups[i]);
                                        if (idx !== -1) parsed.splice(idx, 1);
                                    }
                                    primary.title = targetName;
                                } else if (groups.length === 1) {
                                    groups[0].title = targetName;
                                }
                            };

                            mergeCategories(['CBC', 'COMPLETE BLOOD', 'HEMATOLOGY'], 'CBC');
                            mergeCategories(['COAGULATION', 'PT', 'PTT', 'INR'], 'Coagulation');
                            mergeCategories(['RENAL', 'KIDNEY', 'UREA', 'CREATININE'], 'Renal Function');
                            mergeCategories(['ELECTROLYTE'], 'Electrolytes');
                            mergeCategories(['C-REACTIVE', 'CRP'], 'CRP');
                            mergeCategories(['PROCALCITONIN'], 'Procalcitonin');
                        }

                        console.log("ocrService: Success with model", modelName);
                        return parsed;
                    } catch (e) {
                        console.error(`ocrService: Parse error for ${modelName}:`, e);
                        continue;
                    }
                } catch (error: any) {
                    lastError = error;
                    console.error(`ocrService: Error with model ${modelName}:`, error.message || error);
                    await new Promise(r => setTimeout(r, 1000));
                    continue;
                }
            }

            // If we exhaust all models in the fallback chain, throw the last error
            console.error("ocrService: All models in the fallback chain failed.", lastError);
            throw lastError || new Error('All OCR models failed.');
        } catch (error) {
            console.error("ocrService: Fatal error during analysis:", error);
            throw error;
        }
    }
};
