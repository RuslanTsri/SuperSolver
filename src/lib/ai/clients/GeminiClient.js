import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiClient {
    constructor(keyPool, modelName) {
        this.name = "Gemini";
        // 1. Розбиваємо "простирадло" ключів на масив
        // Працює і з комами, і з новими рядками
        this.keys = keyPool ? keyPool.split(/[\n,]+/).map(k => k.trim()).filter(k => k.length > 5) : [];

        // Беремо модель з налаштувань або дефолтну
        this.modelName = modelName || "gemini-2.5-flash";

        if (this.keys.length === 0) {
            console.error("❌ GeminiClient: No valid keys provided!");
        } else {
            console.log(`✅ Gemini Pool: завантажено ${this.keys.length} ключів.`);
        }
    }

    /**
     * Вибирає випадковий ключ з басейну
     */
    getRandomKey() {
        if (this.keys.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * this.keys.length);
        return this.keys[randomIndex];
    }

    async ask(prompt, imageBase64) {
        const currentKey = this.getRandomKey();

        if (!currentKey) {
            return { success: false, error: "No API Keys available" };
        }

        try {
            // Ініціалізуємо Google AI з ВИПАДКОВИМ ключем
            const genAI = new GoogleGenerativeAI(currentKey);
            const model = genAI.getGenerativeModel({ model: this.modelName });

            // Підготовка картинки
            const imagePart = {
                inlineData: {
                    data: imageBase64.split(",")[1], // Вирізаємо 'data:image/png;base64,'
                    mimeType: "image/png"
                }
            };

            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            return { success: true, text: text, source: "Gemini" };

        } catch (e) {
            console.error(`Gemini Error (Key: ...${currentKey.slice(-4)}):`, e);
            return { success: false, error: e.message || "Unknown Error" };
        }
    }
}