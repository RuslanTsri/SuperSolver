export class BrainBridge {
    async solve(taskData) {
        console.log("📡 Відправляю запит в Brain Core...");

        return new Promise((resolve, reject) => {
            // Формуємо правильний промпт залежно від типу
            const { prompt, isMatching } = this.constructPrompt(taskData);

            chrome.runtime.sendMessage({
                action: "solveGemini",
                prompt: prompt,
                images: this.extractImages(taskData)
            }, (response) => {
                // 1. Перевірка на системні помилки Chrome
                if (chrome.runtime.lastError) {
                    return reject("Connection Error: " + chrome.runtime.lastError.message);
                }

                // 2. Перевірка відповіді від Background
                // ❌ ТУТ БУЛА ПОМИЛКА "successful is not defined"
                // ✅ ТЕПЕР ПРАВИЛЬНО:
                if (response && response.success) {
                    // Парсимо відповідь
                    const result = this.parseResponse(response.answer, isMatching);
                    resolve(result);
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

        // --- ЛОГІКА ДЛЯ MATCHING ---
        if (data.type === 'moodle_match') {
            isMatching = true;
            text = `
ТИП ЗАВДАННЯ: Співставлення (Matching).
ПИТАННЯ: ${data.question}

ІНСТРУКЦІЯ:
Тобі надано ліву колонку (питання) і праву колонку (варіанти відповідей).
Твоє завдання — знайти пари.

ВАЖЛИВО:
1. Використовуй ТОЧНИЙ текст із варіантів відповідей. 
2. НЕ ПЕРЕКЛАДАЙ варіанти (якщо там "Kyiv", пиши "Kyiv", а не "Київ").
3. Поверни відповідь у такому форматі:
1. [Текст ліворуч] - [Текст праворуч]
2. [Текст ліворуч] - [Текст праворуч]
...
`;
        }

        // --- ЛОГІКА ДЛЯ SHORT ANSWER ---
        else if (data.type === 'moodle_short') {
            text = `
ТИП ЗАВДАННЯ: Коротка відповідь.
ПИТАННЯ: ${data.question}

ІНСТРУКЦІЯ:
Напиши лише правильну відповідь (число або слово). Без пояснень. Без крапок.
`;
        }

        // --- ЛОГІКА ДЛЯ STANDARD (TEST) ---
        else {
            text = `
ПИТАННЯ: ${data.question}
ВАРІАНТИ:
${data.options.map((opt, i) => `${String.fromCharCode(97+i)}) ${opt}`).join('\n')}

ІНСТРУКЦІЯ:
Вибери правильну літеру (або літери).
Поверни тільки літеру (наприклад: "a" або "b, c").
`;
        }

        return { prompt: text, isMatching };
    }

    extractImages(data) {
        if (data.allImages && data.allImages.length > 0) return data.allImages;
        if (data.image) return [data.image];
        return [];
    }

    parseResponse(text, isMatching) {
        // Очищаємо текст від Markdown
        const cleanText = text.replace(/\*\*/g, '').trim();

        if (isMatching) {
            // Для Matching повертаємо повний текст, щоб Visualizer шукав пари
            return {
                choice: null,
                reasonFull: cleanText,
                answer: cleanText
            };
        }

        // Спроба знайти JSON (якщо AI раптом повернув JSON)
        try {
            const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {}

        // Для звичайних тестів шукаємо літеру
        // Якщо це Short Answer, choice буде null, але answer буде текстом
        const choiceMatch = cleanText.match(/\b([a-e])\)/i) || cleanText.match(/^\s*([a-e])\s*$/i);

        return {
            choice: choiceMatch ? choiceMatch[1].toLowerCase() : null,
            answer: cleanText, // Повний текст відповіді (для Short Answer)
            reasonFull: cleanText
        };
    }
}