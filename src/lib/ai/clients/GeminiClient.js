import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiClient {
    constructor(keyPool, modelName) {
        this.name = "Gemini";
        this.keys = keyPool ? keyPool.split(/[\n,]+/).map(k => k.trim()).filter(k => k.length > 5) : [];

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

    async ask(prompt, imagesInput) {
        const currentKey = this.getRandomKey();
        if (!currentKey) return { success: false, error: "No API Keys" };

        try {
            const genAI = new GoogleGenerativeAI(currentKey);
            const model = genAI.getGenerativeModel({ model: this.modelName });
            const parts = [prompt];

            let images = [];
            if (Array.isArray(imagesInput)) {
                images = imagesInput;
            } else if (imagesInput) {
                images = [imagesInput];
            }

            images.forEach(img => {
                let cleanData = "";
                let mimeType = "image/jpeg";

                // Обробка об'єкта {data: "base64", mimeType: "..."}
                if (typeof img === 'object' && img.data) {
                    cleanData = img.data;
                    mimeType = img.mimeType || "image/jpeg";
                }
                else if (typeof img === 'string') {
                    if (img.includes(',')) {
                        cleanData = img.split(',')[1];
                    } else {
                        cleanData = img;
                    }
                }

                if (cleanData) {
                    parts.push({
                        inlineData: {
                            data: cleanData,
                            mimeType: mimeType
                        }
                    });
                }
            });

            const result = await model.generateContent(parts);
            const response = await result.response;
            const text = response.text();

            return { success: true, text: text, source: "Gemini" };

        } catch (e) {
            console.error(`Gemini Error (Key ...${currentKey.slice(-4)}):`, e);
            return { success: false, error: e.message };
        }
    }
}