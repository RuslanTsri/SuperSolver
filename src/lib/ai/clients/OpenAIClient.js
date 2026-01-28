import OpenAI from "openai";

export class OpenAIClient {
    constructor(apiKey, model = "gpt-4o-mini") {
        this.name = "GPT-4o";
        this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
        this.modelName = model;
    }

    async ask(prompt, imageBase64) {
        try {
            const content = [{ type: "text", text: prompt }];
            if (imageBase64) {
                content.push({
                    type: "image_url",
                    image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
                });
            }

            const response = await this.client.chat.completions.create({
                messages: [{ role: "user", content }],
                model: this.modelName,
            });

            return { success: true, source: this.name, text: response.choices[0].message.content };
        } catch (e) {
            console.warn(`[${this.name}] Error:`, e.message);
            return { success: false, source: this.name, error: e.message };
        }
    }
}