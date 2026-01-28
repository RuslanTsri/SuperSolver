
export class MoodleParser {
    constructor() {
        this.name = "Moodle Parser";
    }
    canHandle(url) {
        return url.includes('moodle') || document.querySelector('.que') !== null;
    }

    async parse() {
        console.log("🕵️ MoodleParser: Починаю повне сканування...");
        const questions = Array.from(document.querySelectorAll('.que'));
        const parsedQuestions = [];
        for (const q of questions) {
            if (q.dataset.solverProcessed) continue;
            const data = await this.extractQuestionData(q);
            if (data) parsedQuestions.push(data);
        }
        return parsedQuestions.length === 0 ? null : parsedQuestions;
    }
    async extractQuestionData(element) {
        if (element.classList.contains('match')) return await this.parseMatching(element);
        if (element.classList.contains('shortanswer')) return await this.parseShortAnswer(element);
        return await this.parseStandard(element);
    }
    // STANDARD
    async parseStandard(element) {
        const qTextEl = element.querySelector('.qtext');
        if (!qTextEl) return null;

        const questionText = qTextEl.innerText.trim();
        const questionImages = await this.getImagesFromContainer(qTextEl);

        let optionsNodes = Array.from(element.querySelectorAll('.answer label'));
        if (optionsNodes.length === 0) optionsNodes = Array.from(element.querySelectorAll('.answer .flex-fill'));
        if (optionsNodes.length === 0) optionsNodes = Array.from(element.querySelectorAll('.answer .r0, .answer .r1'));

        const options = [];
        for (const node of optionsNodes) {
            let text = node.innerText.replace(/^[a-z0-9а-я]\.\s*/i, "").trim();
            const imgs = await this.getImagesFromContainer(node);

            if (imgs.length > 0) {
                questionImages.push(...imgs); // Додаємо до загального контексту
                text += ` [Варіант містить картинку #${questionImages.length}]`;
            }
            options.push(text);
        }

        return {
            type: 'moodle_standard',
            container: element,
            question: questionText,
            options: options,
            optionsNodes: optionsNodes,
            allImages: questionImages
        };
    }

    // MATCHING
    async parseMatching(element) {
        const qTextEl = element.querySelector('.qtext');
        const questionText = qTextEl ? qTextEl.innerText.trim() : "Співставлення";
        const images = qTextEl ? await this.getImagesFromContainer(qTextEl) : [];

        const table = element.querySelector('table.answer');
        if (!table) return null;

        const rows = Array.from(table.querySelectorAll('tr'));
        const optionsNodes = []; // Тут будуть об'єкти {textElement, selectElement}
        const leftSideText = [];

        for (const row of rows) {
            const textEl = row.querySelector('.text');
            const selectEl = row.querySelector('select');
            if (textEl && selectEl) {
                leftSideText.push(textEl.innerText.trim());
                optionsNodes.push({ textElement: textEl, selectElement: selectEl, text: textEl.innerText.trim() });
            }
        }

        const firstSelect = optionsNodes[0]?.selectElement;
        const rightSideOptions = firstSelect
            ? Array.from(firstSelect.options).filter(o => o.value !== '0').map(o => o.text)
            : [];

        const promptText = `${questionText}\n\nЛІВА СТОРОНА:\n${leftSideText.map((t, i) => `${i+1}. ${t}`).join('\n')}\n\nПРАВА СТОРОНА (Варіанти):\n${rightSideOptions.join('\n')}`;

        return {
            type: 'moodle_match',
            container: element,
            question: promptText,
            options: rightSideOptions,
            optionsNodes: optionsNodes,
            allImages: images
        };
    }

    // SHORT ANSWER
    async parseShortAnswer(element) {
        const qTextEl = element.querySelector('.qtext');
        const input = element.querySelector('input[type="text"]');
        if (!qTextEl || !input) return null;

        const images = await this.getImagesFromContainer(qTextEl);

        return {
            type: 'moodle_short',
            container: element,
            question: qTextEl.innerText.trim(),
            options: [],
            optionsNodes: [input], // Інпут як нода
            allImages: images
        };
    }

    // IMAGE UTILS
    async getImagesFromContainer(container) {
        if (!container) return [];
        const imgs = Array.from(container.querySelectorAll('img'));
        const processed = [];
        for (const img of imgs) {
            if (img.classList.contains('icon') || img.width < 40 || img.height < 40) continue;

            const base64 = await this.convertImageToBase64(img);
            if (base64) processed.push(base64);
        }
        return processed;
    }

    async convertImageToBase64(img) {
        if (!img.complete || img.naturalWidth === 0) {
            await new Promise(r => setTimeout(r, 500)); // Чекаємо трохи
        }
        if (img.naturalWidth === 0) return null;

        try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");

            try { img.crossOrigin = "Anonymous"; } catch (e) {}

            ctx.drawImage(img, 0, 0);

            const dataURL = canvas.toDataURL("image/jpeg", 0.8);
            const base64Data = dataURL.split(",")[1];
            if (!base64Data) return null;
            return {
                mimeType: "image/jpeg",
                data: base64Data
            };
        } catch (e) {
            console.warn("Canvas blocked (CORS), skipping image.");
            return null;
        }
    }
}