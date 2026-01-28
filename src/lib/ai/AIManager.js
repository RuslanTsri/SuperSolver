import { GeminiClient } from "./clients/GeminiClient";
import { GroqClient } from "./clients/GroqClient";

export class AIManager {
    constructor(config) {
        this.clients = [];

        if (config.keys.gemini) {
            this.clients.push(new GeminiClient(config.keys.gemini));
        }

        if (config.keys.grok) {
            this.clients.push(new GroqClient(config.keys.grok, "llama-3.3-70b-versatile"));
        }
    }

    async processRequest(payload, settings) {

        let prompt = `Питання: ${payload.question}\n`;
        if (payload.options && payload.options.length > 0) {
            prompt += `\nВаріанти:\n`;
            payload.options.forEach((opt, i) => {
                prompt += `${String.fromCharCode(97 + i)}) ${opt}\n`;
            });
        }

        let instruction = "";
        if (payload.type === 'moodle_short') {
            instruction = `
ВАЖЛИВО: Це питання типу "Коротка відповідь".
Напиши ТІЛЬКИ правильну відповідь (число, слово). Без пояснень. Без "Відповідь:".
`;
        } else if (payload.type === 'moodle_match') {
            instruction = `
ВАЖЛИВО: Це питання на співвідношення.
Твоя задача знайти логічні пари.
Формат відповіді:
1. [Текст питання] - [Текст варіанту]
`;
        } else {
            instruction = `
Вибери правильну відповідь.
Якщо правильних відповідей декілька (чекбокси), перелічи всі букви.
Формат JSON: { "choice": ["a", "c"], "reason": "пояснення" }
`;
        }

        const fullPrompt = prompt + "\n" + instruction;
        if (payload.images && payload.images.length > 0) {
            console.log(`📸 Image detected (${payload.images.length}). Switching to Vision Mode (Gemini Only).`);
            const gemini = this.clients.find(c => c.name === 'Gemini');
            if (gemini) {
                const res = await gemini.ask(fullPrompt, payload.images);
                return this.formatResult(res.text, payload.type);
            } else {
                throw new Error("No Vision-capable agent (Gemini) available.");
            }
        }

        if (settings.modes?.council) {
            return await this.solveWithFallback(fullPrompt, payload.type);
        } else {
            return await this.solveWithFallback(fullPrompt, payload.type);
        }
    }

    async solveWithFallback(prompt, type) {
        for (const client of this.clients) {
            try {
                const res = await client.ask(prompt);
                if (res.success) return this.formatResult(res.text, type);
            } catch (e) {
                console.warn(`${client.name} failed.`, e);
            }
        }
        throw new Error("All AIs failed.");
    }

    formatResult(text, type) {
        if (type === 'moodle_short') {
            return {
                choice: null,
                reasonFull: text.replace(/`/g, '').trim(),
                answer: text
            };
        }

        if (type === 'moodle_match') {
            return { choice: null, reasonFull: text, answer: text };
        }

        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                let choices = Array.isArray(data.choice) ? data.choice : [data.choice];
                return {
                    choice: choices.map(c => c ? c.toLowerCase() : null).filter(Boolean),
                    reasonFull: data.reason
                };
            }
        } catch (e) {}

        const letters = text.match(/\b([a-h])[\).]/gi);
        let choices = [];
        if (letters) {
            choices = letters.map(l => l[0].toLowerCase());
            choices = [...new Set(choices)];
        }

        return {
            choice: choices.length > 0 ? choices : null,
            reasonFull: text
        };
    }
}