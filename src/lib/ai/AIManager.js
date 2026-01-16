import { GeminiClient } from "./clients/GeminiClient";
import { GroqClient } from "./clients/GroqClient";
// import { OpenAIClient } from "./clients/OpenAIClient"; // Закоментовано, поки не використовуємо платний ключ

export class AIManager {
    constructor(config) {
        this.clients = [];

        // --- 1. ФОРМУВАННЯ ЧЕРГИ АГЕНТІВ ---

        // Пріоритет №1: Gemini (Google)
        // Найкраще розпізнає картинки, великі ліміти.
        if (config.keys.gemini) {
            this.clients.push(new GeminiClient(config.keys.gemini));
        }

        // Пріоритет №2 & №3: Groq (Meta & Mistral)
        // Використовують спільний пул ключів 'grok'.
        if (config.keys.grok) {
            // Додаємо Llama 3 (Meta) - Дуже швидка логіка
            this.clients.push(new GroqClient(config.keys.grok, "llama-3.3-70b-versatile"));

            // Додаємо Mixtral (Mistral) - Альтернативна європейська модель
            this.clients.push(new GroqClient(config.keys.grok, "mixtral-8x7b-32768"));
        }

        // Перевірка на наявність хоча б одного агента
        if (this.clients.length === 0) {
            console.error("⛔ CRITICAL: No AI clients initialized! Check API Keys in settings.");
        } else {
            console.log(`🤖 AI Manager initialized with ${this.clients.length} agents.`);
        }
    }

    /**
     * 🛡️ РЕЖИМ СТРАХОВКИ (FALLBACK MODE)
     * Спробувати першого -> якщо помилка -> спробувати другого -> і т.д.
     * Ідеально для швидкого отримання відповіді без зайвих витрат.
     */
    async solveWithFallback(prompt, imageBase64) {
        console.group("🛡️ Fallback Mode Execution");
        const errors = [];

        // Проходимо по черзі кожного агента
        for (const client of this.clients) {
            console.log(`➡️ Attempting: ${client.name}...`);

            try {
                const result = await client.ask(prompt, imageBase64);

                // Якщо успіх - одразу повертаємо результат і виходимо
                if (result.success) {
                    console.log(`✅ Success! Solved by: ${client.name}`);
                    console.groupEnd();
                    return result;
                } else {
                    // Якщо ШІ повернув помилку (наприклад, ліміт)
                    console.warn(`⚠️ ${client.name} failed: ${result.error}`);
                    errors.push(`${client.name}: ${result.error}`);
                }
            } catch (e) {
                console.error(`❌ ${client.name} crashed:`, e);
                errors.push(`${client.name}: Crashed (${e.message})`);
            }
        }

        console.groupEnd();

        // Якщо ми тут - значить ВСІ агенти провалилися
        throw new Error("💀 TOTAL FAILURE: Всі ШІ відмовили. Перевір ключі або інтернет.\nDetails: " + errors.join(" | "));
    }

    /**
     * ⚖️ РЕЖИМ ДЕБАТІВ (COUNCIL MODE)
     * Запускає всіх агентів одночасно, змушує їх голосувати у форматі JSON,
     * а потім обирає переможця на основі ваги голосу.
     */
    async solveDebate(prompt, imageBase64) {
        console.log("⚖️ Debate Mode: Launching all agents...");

        // Модифікуємо промпт, щоб змусити їх дати JSON
        // Це критично для програмного підрахунку
        const strictPrompt = `${prompt}\n\n🛑 ВАЖЛИВА ІНСТРУКЦІЯ:
Твоя єдина задача — вибрати правильний варіант відповіді.
Ти зобов'язаний повернути відповідь ВИКЛЮЧНО у форматі JSON (без Markdown, без 'json'):
{
  "choice": "a", 
  "reason": "коротке пояснення українською мовою"
}`;

        // Паралельний запуск (Promise.all)
        const promises = this.clients.map(client => client.ask(strictPrompt, imageBase64));
        const results = await Promise.all(promises);

        // Фільтруємо успішні відповіді
        const successful = results.filter(r => r.success);

        if (successful.length === 0) {
            throw new Error("💀 Всі АІ промовчали у режимі дебатів.");
        }

        // Визначаємо переможця
        return this.determineWinner(successful);
    }

    /**
     * 🗳️ ЛОГІКА ПІДРАХУНКУ ГОЛОСІВ
     */
    determineWinner(results, customWeights) { // 👈 Додано аргумент
        const scores = {};
        const details = {};

        // 👇 ЗАМІСТЬ ХАРДКОДУ БЕРЕМО З АРГУМЕНТІВ АБО ДЕФОЛТ
        // Ми мапимо назви клієнтів (Gemini, Llama...) на ключі налаштувань (gemini, llama...)
        const WEIGHTS = {
            "Gemini": customWeights?.gemini || 1.2,
            "Llama 3 (Groq)": customWeights?.llama || 1.1,
            "Mixtral (Groq)": customWeights?.mixtral || 1.0
        };
        const DEFAULT_WEIGHT = 1.0;

        console.group("🗳️ Voting Process (Weights:", WEIGHTS, ")");

        results.forEach(res => {
            try {
                // 1. Очистка JSON (інколи ШІ додають ```json ... ```)
                const jsonMatch = res.text.match(/\{[\s\S]*?\}/);

                if (!jsonMatch) {
                    console.warn(`⚠️ ${res.source} відповів не JSON-ом. Пропускаємо.`);
                    return;
                }

                const data = JSON.parse(jsonMatch[0]);

                // 2. Нормалізація вибору
                let choice = data.choice ? data.choice.toLowerCase().trim() : null;

                // Фільтр сміття (якщо choice занадто довгий або пустий)
                if (!choice || choice.length > 5) return;

                // 3. Нарахування балів
                const weight = WEIGHTS[res.source] || DEFAULT_WEIGHT;

                if (!scores[choice]) scores[choice] = 0;
                scores[choice] += weight;

                // 4. Збереження кращого пояснення
                // Якщо це перший голос за цей варіант АБО якщо цей АІ авторитетніший
                if (!details[choice] || weight >= 1.2) {
                    details[choice] = `[${res.source}]: ${data.reason}`;
                }

                console.log(`✅ ${res.source} проголосував за "${choice}" (Сила: ${weight})`);

            } catch (e) {
                console.warn(`❌ Помилка парсингу відповіді від ${res.source}:`, e.message);
            }
        });
        console.groupEnd();

        let winner = null;
        let maxScore = -1;

        for (const [choice, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                winner = choice;
            }
        }

        if (winner) {
            const scoreSummary = Object.entries(scores)
                .map(([k, v]) => `${k.toUpperCase()}: ${v.toFixed(1)}`)
                .join(" | ");

            return {
                choice: winner, // Буква для авто-кліку
                reasonFull: `🏆 ПЕРЕМОЖЕЦЬ: "${winner.toUpperCase()}"\n📊 Рахунок: ${scoreSummary}\n\n📝 Пояснення:\n${details[winner]}`
            };
        } else {
            // Фолбек, якщо парсинг не вдався у всіх
            return {
                choice: "?",
                reasonFull: "⚠️ Не вдалося автоматично порахувати голоси. Ось сира відповідь першого АІ:\n\n" + successful[0].text
            };
        }
    }
    async processRequest(payload, settings) {
        // 1. Формуємо текстовий промпт з об'єкта
        let prompt = `Питання: ${payload.question}\n`;

        if (payload.options && payload.options.length > 0) {
            prompt += `\nВаріанти відповідей:\n`;
            payload.options.forEach((opt, index) => {
                // Додаємо букви, якщо їх немає (A, B, C...)
                const letter = String.fromCharCode(97 + index); // 97 = 'a'
                prompt += `${letter}) ${opt}\n`;
            });
        }

        prompt += `\nТвоя задача: Визначити правильну відповідь.`;

        // 2. Вибираємо режим роботи (з налаштувань)
        const isCouncilMode = settings.modes?.council;

        // 3. Запускаємо відповідний алгоритм
        if (isCouncilMode) {
            // Режим Дебатів повертає { choice: "a", reasonFull: "..." }

            return await this.solveDebate(prompt, payload.image, settings.weights);
        } else {
            // Режим Страховки (Fallback)
            const result = await this.solveWithFallback(prompt, payload.image);

            // ⚠️ Важливо: Fallback повертає сирий об'єкт { text: "...", source: "..." }
            // Нам треба привести його до спільного формату, щоб Visualizer зрозумів
            return {
                choice: this.extractChoiceFromText(result.text), // Спробуємо знайти букву
                reasonFull: result.text,
                source: result.source
            };
        }
    }

    /**
     * Допоміжна функція: намагається витягнути "a", "b", "c" з тексту
     * Якщо відповідь проста ("Answer: A"), вона знайде "a".
     */
    extractChoiceFromText(text) {
        // Змінив [a-d] на [a-h], щоб ловити варіанти А, Б, В, Г, Д, Е...
        const match = text.match(/\b([a-h])\b/i) || text.match(/^([a-h])[\).]/i);
        return match ? match[1].toLowerCase() : null;
    }
}