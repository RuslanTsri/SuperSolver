export class VseosvitaParser {
    constructor() {
        this.name = "Vseosvita";
        // Оновлені селектори на основі твого HTML
        this.selectors = {
            questionBlock: '.v-test-question',
            questionText: '.v-test-questions-title',
            questionImage: '.v-test-questions-title img',
            options: '.v-test-questions-radio-block label'
        };
    }

    isMatch(url) {
        return url.includes('vseosvita.ua/test/');
    }

    start() {
        console.log("🦉 Vseosvita Parser started.");

        // Спостерігаємо за появою нових питань
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length || mutation.type === 'attributes') {
                    this.scan();
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Перший запуск
        this.scan();
    }

    scan() {
        // Шукаємо блок питання, який ще не має нашої рамки
        const question = document.querySelector(`${this.selectors.questionBlock}:not([data-ai-processed])`);

        if (question) {
            this.processQuestion(question);
        }
    }

    async processQuestion(element) {
        element.setAttribute('data-ai-processed', 'true');

        // 1. ВИТЯГУЄМО ТЕКСТ
        // innerText автоматично витягне текст з усіх <span> і <p>, ігноруючи теги
        let qText = element.querySelector(this.selectors.questionText)?.innerText.trim();

        // Чистимо текст від зайвих слів типу "Фото/скрін..." якщо вони заважають,
        // але АІ зазвичай розумний і сам зрозуміє.
        if (!qText) return;

        // 2. ВИТЯГУЄМО КАРТИНКУ (Дуже важливо для графіків!)
        let imageBase64 = null;
        const imgEl = element.querySelector(this.selectors.questionImage);

        if (imgEl) {
            const imgSrc = imgEl.src || imgEl.dataset.src;
            if (imgSrc) {
                console.log("🖼 Found image:", imgSrc);
                try {
                    // Конвертуємо URL картинки в Base64, щоб Gemini міг її "побачити"
                    imageBase64 = await this.urlToBase64(imgSrc);
                } catch (e) {
                    console.error("Failed to load image:", e);
                }
            }
        }

        // 3. ВИТЯГУЄМО ВАРІАНТИ ВІДПОВІДЕЙ
        const optionEls = element.querySelectorAll(this.selectors.options);
        const options = Array.from(optionEls).map(el => {
            // innerText чудово працює навіть з формулами MathML/MathLive,
            // бо вони часто мають текстове представлення
            return el.innerText.trim();
        }).filter(t => t.length > 0);

        // Формуємо запит
        const fullPrompt = `Питання: ${qText}\nВаріанти:\n${options.join('\n')}`;

        console.log("🤔 Sending to AI...", { text: qText, hasImage: !!imageBase64 });

        // Візуалізація
        element.style.position = "relative";
        element.style.border = "3px dashed orange";

        try {
            // ВІДПРАВКА В BACKGROUND
            const response = await chrome.runtime.sendMessage({
                action: "SOLVE_QUESTION",
                prompt: fullPrompt,
                image: imageBase64 // Передаємо картинку!
            });

            if (response.success) {
                console.log("✅ Answer:", response.answer);
                element.style.border = "3px solid #2196F3"; // Синя рамка
                this.showHint(element, response.answer);
            } else {
                throw new Error(response.error);
            }
        } catch (e) {
            console.error(e);
            element.style.border = "3px solid red";
        }
    }

    // Допоміжна функція: завантажує картинку і робить з неї рядок для АІ
    async urlToBase64(url) {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Прибираємо префікс "data:image/png;base64," бо Google API хоче чистий рядок
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    showHint(element, aiResult) {
        const hintBox = document.createElement('div');
        Object.assign(hintBox.style, {
            marginTop: "10px",
            padding: "15px",
            background: "#E3F2FD",
            borderLeft: "5px solid #2196F3",
            color: "#0D47A1",
            fontFamily: "Arial, sans-serif",
            fontSize: "14px",
            lineHeight: "1.4",
            zIndex: "1000",
            position: "relative"
        });

        hintBox.innerHTML = `
            <strong style="font-size:16px">🤖 AI вибрав: ${aiResult.choice ? aiResult.choice.toUpperCase() : '?'}</strong>
            <div style="margin-top:8px; white-space: pre-wrap;">${aiResult.text || aiResult.reasonFull}</div>
        `;

        // Вставляємо під блоком з варіантами (щоб не перекривало кнопки)
        const radioContainer = element.querySelector('.v-test-questions-block') || element;
        radioContainer.appendChild(hintBox);
    }
}