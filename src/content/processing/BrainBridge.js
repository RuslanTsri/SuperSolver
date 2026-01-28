export class BrainBridge {
    async solve(taskData) {
        console.log("📡 Відправляю запит в Brain Core...");

        return new Promise((resolve, reject) => {
            const { prompt, isMatching } = this.constructPrompt(taskData);

            chrome.runtime.sendMessage({
                action: "solveGemini",
                prompt: prompt,
                images: this.extractImages(taskData),
                apiKey: null
            }, (response) => {

                if (chrome.runtime.lastError) {
                    return reject("Connection Error: " + chrome.runtime.lastError.message);
                }

                if (response && response.success) {
                    try {
                        const result = this.parseResponse(response.answer, isMatching);
                        resolve(result);
                    } catch (e) {
                        console.error("Parsing Error:", e);
                        reject("Parsing Error: " + e.message);
                    }
                } else {
                    const errorMsg = response ? response.error : "Unknown AI Error";
                    reject(errorMsg);
                }
            });
        });
    }

    constructPrompt(data) {
        let text = "";
        let isMatching = false;

        if (data.type === 'moodle_match') {
            isMatching = true;
            text = `
ТИП ЗАВДАННЯ: Співставлення (Matching).
ПИТАННЯ: ${data.question}
ІНСТРУКЦІЯ: Знайди пари. Використовуй ТОЧНИЙ текст із варіантів (не перекладай).
`;
        } else if (data.type === 'moodle_short') {
            text = `
ТИП ЗАВДАННЯ: Коротка відповідь.
ПИТАННЯ: ${data.question}
ІНСТРУКЦІЯ: Напиши лише правильну відповідь. Без пояснень.
`;
        } else {
            text = `
ПИТАННЯ: ${data.question}
ВАРІАНТИ:
${data.options.map((opt, i) => `${String.fromCharCode(97 + i)}) ${opt}`).join('\n')}
ІНСТРУКЦІЯ: Вибери правильну літеру.
`;
        }
        return { prompt: text, isMatching };
    }

    extractImages(data) {
        if (data.allImages && data.allImages.length > 0) return data.allImages;
        if (data.image) return [data.image];
        return [];
    }

    parseResponse(payload, isMatching) {
        if (typeof payload === 'object' && payload !== null) {
            if (isMatching && !payload.reasonFull) {
                payload.reasonFull = payload.answer || JSON.stringify(payload);
            }
            return payload;
        }

        const text = String(payload || "");
        const cleanText = text.replace(/\*\*/g, '').trim();

        if (isMatching) {
            return { choice: null, reasonFull: cleanText, answer: cleanText };
        }

        const choiceMatch = cleanText.match(/\b([a-e])\)/i) || cleanText.match(/^\s*([a-e])\s*$/i);
        return {
            choice: choiceMatch ? choiceMatch[1].toLowerCase() : null,
            answer: cleanText,
            reasonFull: cleanText
        };
    }
}