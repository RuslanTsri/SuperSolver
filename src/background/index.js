// src/background/index.js
import { storage } from '../lib/storage';
import { AIManager } from '../lib/ai/AIManager';

console.log("🤖 Background Service Worker запущено");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // 👇 ВИПРАВЛЕННЯ: Слухаємо "solveGemini", бо саме це шле BrainBridge
    if (request.action === "solveGemini") {
        console.log("📩 Отримано задачу:", request.prompt ? "Prompt exists" : "No prompt");

        // Формуємо об'єкт payload, який очікує твій хендлер
        const payload = {
            question: request.prompt, // BrainBridge шле 'prompt'
            images: request.images,   // BrainBridge шле 'images'
            apiKey: request.apiKey    // BrainBridge шле 'apiKey'
        };

        handleQuizSolution(payload)
            .then(answer => sendResponse({ success: true, answer }))
            .catch(error => sendResponse({ success: false, error: error.message }));

        // 🛑 ВАЖЛИВО: Це тримає порт відкритим
        return true;
    }

    if (request.action === "TOGGLE_EXTENSION") {
        console.log("🔄 Extension Toggled:", request.state);
        sendResponse({ status: "ack" });
    }
});

async function handleQuizSolution(payload) {
    // 1. Отримуємо налаштування (або беремо переданий ключ)
    const settings = await storage.get();

    // Якщо ключ прийшов прямим запитом (з Content Script), додаємо його в налаштування
    if (payload.apiKey) {
        settings.geminiKey = payload.apiKey;
    }

    // 2. Створюємо менеджера
    const aiManager = new AIManager(settings);

    // 3. Запускаємо процес
    const result = await aiManager.processRequest(payload);
    return result;
}