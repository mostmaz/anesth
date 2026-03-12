const { GoogleGenerativeAI } = require('@google/generative-ai');

(async () => {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
        console.error("GEMINI_API_KEY missing");
        return;
    }
    const genAI = new GoogleGenerativeAI(API_KEY);
    // There is no direct "listModels" in the simple SDK usually, 
    // but we can test a known model like 'gemini-1.5-flash'
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent("test");
        console.log("gemini-1.5-flash works");
    } catch (e) {
        console.error("gemini-1.5-flash failed:", e.message);
    }
})();
