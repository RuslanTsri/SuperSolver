export const defaultSettings = {
    keys: {
        gemini: "",
        openai: "",
        grok: ""
    },
    modes: {
        enabled: true,
        council: false // Режим дебатів
    },
    models: {
        gemini: "gemini-2.5-flash",
        llama: "llama-3.3-70b-versatile",
        mixtral: "mixtral-8x7b-32768"
    },
    weights: {
        gemini: 1.2,  // Головний
        llama: 1.1,   // Середній
        mixtral: 1.0  // Молодший
    },
    availableModels: {
        gemini: [],
        groq: []
    }
};

export const storage = {
    get: async () => {
        const data = await chrome.storage.local.get("settings");
        return { ...defaultSettings, ...data.settings };
    },
    set: async (settings) => {
        await chrome.storage.local.set({ settings });
    }
};