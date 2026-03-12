const { GoogleGenerativeAI } = require('@google/generative-ai');

(async () => {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
        console.error("GEMINI_API_KEY missing");
        return;
    }
    const genAI = new GoogleGenerativeAI(API_KEY);
    // The SDK hasn't a direct listModels, but we can try the fetch API directly
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("Available models:", JSON.stringify(data.models.map(m => m.name)));
    } catch (e) {
        console.error("Failed to list models:", e.message);
    }
})();
