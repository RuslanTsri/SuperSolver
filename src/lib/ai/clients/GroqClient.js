export class GroqClient {
    constructor(keysString, modelId) {
        this.name = "Llama 3 (Groq)";
        this.keys = keysString ? keysString.split(/[\n,]+/).map(k => k.trim()).filter(k => k.length > 10) : [];
        this.modelId = modelId || "llama-3.3-70b-versatile"; // Дефолт
    }

    getRandomKey() {
        if (this.keys.length === 0) return null;
        return this.keys[Math.floor(Math.random() * this.keys.length)];
    }

    async ask(prompt, imageBase64) {
        const currentKey = this.getRandomKey();
        if (!currentKey) return { success: false, error: "No Groq Keys" };

        let model = this.modelId;
        let messages = [{ role: "user", content: prompt }];

        if (imageBase64) {
            model = "llama-3.2-90b-vision-preview";

            let cleanData = "";
            if (typeof imageBase64 === 'object' && imageBase64.data) {
                cleanData = imageBase64.data;
            } else if (typeof imageBase64 === 'string') {
                cleanData = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            }

            messages = [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${cleanData}` } }
                    ]
                }
            ];
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
                    model: model,
                    temperature: 0.1
                })
            });

            const data = await response.json();

            if (data.error) {
                return { success: false, error: data.error.message };
            }

            return {
                success: true,
                text: data.choices[0].message.content,
                source: this.name
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}