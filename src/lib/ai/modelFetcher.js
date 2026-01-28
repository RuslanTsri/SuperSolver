import { GoogleGenerativeAI } from "@google/generative-ai";
/**
 * Витягує список моделей з Google Gemini API
 */
export async function fetchGeminiModels(apiKeyPool) {
    const key = apiKeyPool.split(/[\n,]+/).map(k => k.trim()).find(k => k.length > 10);
    if (!key) throw new Error("Спочатку введи API Key!");
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!response.ok) throw new Error("Google API Error");
        const data = await response.json();
        return data.models
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .map(m => m.name.replace("models/", ""))
            .sort();

    } catch (e) {
        console.error("Gemini Fetch Error:", e);
        return ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"];
    }
}

/**
 * Витягує список моделей з Groq API
 */
export async function fetchGroqModels(apiKeyPool) {
    const key = apiKeyPool.split(/[\n,]+/).map(k => k.trim()).find(k => k.length > 10);
    if (!key) throw new Error("Спочатку введи API Key!");
    try {
        const response = await fetch("https://api.groq.com/openai/v1/models", {
            headers: { "Authorization": `Bearer ${key}` }
        });
        if (!response.ok) throw new Error("Groq API Error");
        const data = await response.json();
        return data.data
            .map(m => m.id)
            .sort();
    } catch (e) {
        console.error("Groq Fetch Error:", e);
        return ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];
    }
}