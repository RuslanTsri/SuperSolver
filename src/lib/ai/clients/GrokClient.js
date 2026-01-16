import OpenAI from "openai";

export class GrokClient {
    constructor(apiKey, model = "grok-beta") {
        this.name = "Grok";
        this.client = new OpenAI({
            apiKey,
            baseURL: "https://api.x.ai/v1",
            dangerouslyAllowBrowser: true
        });
        this.modelName = model;
    }

    async ask(prompt) {
        try {
            const response = await this.client.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: this.modelName,
            });

            return { success: true, source: this.name, text: response.choices[0].message.content };
        } catch (e) {
            console.warn(`[${this.name}] Error:`, e.message);
            return { success: false, source: this.name, error: e.message };
        }
    }
}