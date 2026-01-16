import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Витягує список моделей з Google Gemini API
 */
export async function fetchGeminiModels(apiKeyPool) {
    // Беремо перший валідний ключ з пулу
    const key = apiKeyPool.split(/[\n,]+/).map(k => k.trim()).find(k => k.length > 10);

    if (!key) throw new Error("Спочатку введи API Key!");

    try {
        // Оскільки SDK для списку моделей іноді глючить у браузері,
        // надійніше смикнути REST API напряму.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);

        if (!response.ok) throw new Error("Google API Error");

        const data = await response.json();

        // Фільтруємо тільки ті, що генерують текст (gemini-pro, flash і т.д.)
        // і прибираємо префікс "models/"
        return data.models
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .map(m => m.name.replace("models/", ""))
            .sort();

    } catch (e) {
        console.error("Gemini Fetch Error:", e);
        // Повертаємо дефолтний список, якщо помилка
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

        // Сортуємо: Llama та Mixtral
        return data.data
            .map(m => m.id)
            .sort();

    } catch (e) {
        console.error("Groq Fetch Error:", e);
        // Дефолтний список
        return ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];
    }
}