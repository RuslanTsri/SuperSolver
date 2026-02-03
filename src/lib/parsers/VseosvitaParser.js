export class VseosvitaParser {
    constructor() {
        this.name = "Vseosvita Parser";
    }

    canHandle(url) {
        return url.includes('vseosvita.ua') && document.querySelector('.v-test-go-bg') !== null;
    }

    async parse() {
        console.log("🦄 VseosvitaParser: Сканування активного питання...");

        // На Всеосвіті активне питання завжди в блоці з ID, що починається на "i-test-question-"
        // Або просто шукаємо видимий контейнер питання
        const activeQuestion = document.querySelector('.v-test-go-bg');

        if (!activeQuestion || activeQuestion.dataset.solverProcessed) {
            return null; // Питання вже оброблено або не знайдено
        }

        const data = await this.extractQuestionData(activeQuestion);

        if (data) {
            // activeQuestion.dataset.solverProcessed = "true"; // Можна розкоментувати, щоб не парсити двічі
            return [data]; // Повертаємо масив з одним питанням
        }
        return null;
    }

    async extractQuestionData(element) {
        // 1. SHORT ANSWER (Вписати відповідь)
        if (element.querySelector('input[type="text"]')) {
            return await this.parseShortAnswer(element);
        }

        // 2. MATCHING (Співставлення) - Поки не бачили DOM, але додамо заглушку
        if (element.querySelector('.ui-sortable') || element.querySelector('.connect-list')) {
            // return await this.parseMatching(element);
            console.warn("Matching DOM not provided yet");
        }

        // 3. STANDARD (Radio / Checkbox)
        // Якщо є радіо або чекбокси - це стандартний тест
        if (element.querySelector('input[type="radio"]') || element.querySelector('input[type="checkbox"]')) {
            return await this.parseStandard(element);
        }

        return null;
    }

    // --- PARSERS ---

    async parseStandard(element) {
        // 1. Текст питання
        const qTextEl = element.querySelector('.v-test-questions-title .content-box');
        const questionText = qTextEl ? qTextEl.innerText.trim() : "Питання без тексту";

        // 2. Картинки питання
        const questionImages = await this.getImagesFromContainer(qTextEl);

        // 3. Варіанти відповідей
        // Шукаємо блоки з класами .v-test-questions-radio-block або .v-test-questions-checkbox-block
        const optionBlocks = Array.from(element.querySelectorAll('.v-test-questions-radio-block, .v-test-questions-checkbox-block'));

        const options = [];
        const optionsNodes = [];

        for (const block of optionBlocks) {
            // Текст варіанту лежить в label -> p
            const label = block.querySelector('label');
            const p = label ? label.querySelector('p') : null;

            let text = p ? p.innerText.trim() : "";

            // Якщо тексту немає, але є картинка
            const imgs = await this.getImagesFromContainer(label);
            if (imgs.length > 0) {
                questionImages.push(...imgs); // Додаємо до загального контексту для AI
                if (text.length < 2) text = `[Картинка варіанту #${questionImages.length}]`;
            }

            options.push(text);
            optionsNodes.push(block); // Зберігаємо сам блок для підсвітки
        }

        return {
            type: 'moodle_standard', // Використовуємо існуючий тип для сумісності з AI
            container: element,
            question: questionText,
            options: options,
            optionsNodes: optionsNodes,
            allImages: questionImages
        };
    }

    async parseShortAnswer(element) {
        const qTextEl = element.querySelector('.v-test-questions-title .content-box');
        const questionText = qTextEl ? qTextEl.innerText.trim() : "Питання";

        const input = element.querySelector('input[type="text"]');
        const questionImages = await this.getImagesFromContainer(qTextEl);

        return {
            type: 'moodle_short',
            container: element,
            question: questionText,
            options: [],
            optionsNodes: [input], // Інпут для вставки відповіді
            allImages: questionImages
        };
    }

    // --- UTILS ---

    async getImagesFromContainer(container) {
        if (!container) return [];
        // Всеосвіта використовує lazy loading, тому картинка може бути в src або data-src
        const imgs = Array.from(container.querySelectorAll('img'));
        const processed = [];

        for (const img of imgs) {
            // Ігноруємо дрібні іконки
            if (img.width < 30 || img.height < 30) continue;

            const base64 = await this.convertImageToBase64(img);
            if (base64) processed.push(base64);
        }
        return processed;
    }

    async convertImageToBase64(img) {
        // Якщо картинка ще не завантажилась, пробуємо взяти data-src
        const src = img.currentSrc || img.src || img.dataset.src;
        if (!src) return null;

        // Створюємо нову картинку, щоб точно завантажити її
        const imageLoader = new Image();
        imageLoader.crossOrigin = "Anonymous";
        imageLoader.src = src;

        return new Promise((resolve) => {
            imageLoader.onload = () => {
                try {
                    const canvas = document.createElement("canvas");
                    canvas.width = imageLoader.naturalWidth;
                    canvas.height = imageLoader.naturalHeight;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(imageLoader, 0, 0);

                    const dataURL = canvas.toDataURL("image/jpeg", 0.8);
                    const base64Data = dataURL.split(",")[1];

                    resolve({
                        mimeType: "image/jpeg",
                        data: base64Data
                    });
                } catch (e) {
                    console.warn("CORS Blocked image:", src);
                    resolve(null);
                }
            };
            imageLoader.onerror = () => resolve(null);
        });
    }
}