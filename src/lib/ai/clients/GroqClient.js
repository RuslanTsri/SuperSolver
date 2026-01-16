export class GroqClient {
    constructor(keysString, modelName) {
        // Визначаємо красиве ім'я для інтерфейсу
        if (modelName && modelName.includes("mixtral")) {
            this.name = "Mixtral (Groq)";
        } else {
            this.name = "Llama 3 (Groq)";
        }

        this.modelName = modelName || "llama-3.3-70b-versatile";

        // 1. ПАРСИНГ КЛЮЧІВ (Басейн)
        if (!keysString) {
            this.keys = [];
        } else {
            this.keys = keysString
                .split(/[\n,]+/)       // Розбиваємо по комі або Enter
                .map(k => k.trim())    // Чистимо пробіли
                .filter(k => k.length > 10); // Прибираємо сміття
        }
    }

    // Метод ротації
    getRandomKey() {
        if (this.keys.length === 0) return null;
        return this.keys[Math.floor(Math.random() * this.keys.length)];
    }

    async ask(prompt, imageBase64) {
        // 2. Беремо випадковий ключ
        const currentKey = this.getRandomKey();

        if (!currentKey) {
            return { success: false, error: "⛔ Немає ключів Groq!" };
        }

        console.log(`⚡ ${this.name} requesting... (Key ending in ...${currentKey.slice(-4)})`);

        // Логіка обробки картинок (Groq підтримує візію тільки на специфічних моделях)
        let requestModel = this.modelName;
        let messages = [];

        if (imageBase64) {
            // Якщо прийшла картинка, тимчасово перемикаємось на Vision-модель,
            // бо звичайна Llama/Mixtral впаде з помилкою.
            requestModel = "llama-3.2-90b-vision-preview";
            messages = [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
                    ]
                }
            ];
        } else {
            messages = [{ role: "user", content: prompt }];
        }

        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${currentKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages: messages,
                    model: requestModel,
                    temperature: 0.6
                })
            });

            if (!response.ok) {
                const errData = await response.json();

                // Якщо 429 (Too Many Requests)
                if (response.status === 429) {
                    console.warn(`🔄 Groq Key exhausted: ...${currentKey.slice(-4)}`);
                    return { success: false, error: "Rate Limit (429). Спробуй ще раз." };
                }

                throw new Error(errData.error?.message || response.statusText);
            }

            const data = await response.json();
            const text = data.choices[0].message.content;

            return {
                success: true,
                text: text,
                source: this.name
            };

        } catch (error) {
            console.error("Groq Error:", error);
            return { success: false, error: error.message };
        }
    }
}