import { storage } from '../lib/storage';
import { AIManager } from '../lib/ai/AIManager';

console.log("🤖 Background Service Worker запущено");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === "solveGemini") {

        // payload
        const payload = {
            question: request.prompt,
            options: request.options || [],
            type: request.type,
            images: request.images || [],
            apiKey: request.apiKey
        };

        handleQuizSolution(payload)
            .then(answer => sendResponse({ success: true, answer }))
            .catch(error => sendResponse({ success: false, error: error.message }));

        return true;
    }

    if (request.action === "TOGGLE_EXTENSION") {
        sendResponse({ status: "ack" });
    }
});

async function handleQuizSolution(payload) {
    const settings = await storage.get();
    if (payload.apiKey) settings.keys.gemini = payload.apiKey;

    const aiManager = new AIManager(settings);
    return await aiManager.processRequest(payload, settings);
}