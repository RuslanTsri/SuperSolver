export const defaultSettings = {
    keys: {
        gemini: "",
        openai: "",
        grok: "" // Це пул ключів для Groq
    },
    modes: {
        enabled: true,
        council: false // Режим дебатів
    },
    models: {
        gemini: "gemini-1.5-flash",
        llama: "llama-3.3-70b-versatile",
        mixtral: "mixtral-8x7b-32768"
    },
    weights: {
        gemini: 1.2,  // Головний
        llama: 1.1,   // Середній
        mixtral: 1.0  // Молодший
    },
    // 👇 ДОДАЄМО ЦЕЙ БЛОК 👇
    availableModels: {
        gemini: [], // Тут буде кеш моделей Gemini
        groq: []    // Тут буде кеш моделей Groq
    }
};

export const storage = {
    get: async () => {
        const data = await chrome.storage.local.get("settings");
        // Об'єднуємо збережені дані з дефолтними (на випадок нових полів)
        return { ...defaultSettings, ...data.settings };
    },
    set: async (settings) => {
        await chrome.storage.local.set({ settings });
    }
};