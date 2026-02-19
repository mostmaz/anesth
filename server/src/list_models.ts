
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("API_KEY is missing");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
    try {
        console.log("Fetching available models...");
        // Hack to get model list as it might be on the main class or a different utility
        // Actually the node SDK might not expose listModels directly easily on the main entry in older versions, 
        // but let's check if we can simply use the response from a simpler model prompt to debug, 
        // OR just try a known working legacy one.

        // Wait, standard way:
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();
        console.log("Models:", JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
