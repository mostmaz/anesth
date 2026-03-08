const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
        console.error("GEMINI_API_KEY missing");
        return;
    }

    try {
        console.log("Testing Gemini connectivity...");
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const result = await model.generateContent("Hello, are you there? Response with YES.");
        console.log("Response:", result.response.text());
    } catch (e) {
        console.error("Gemini Test Failed:", e);
    }
}

run();
