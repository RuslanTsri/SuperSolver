export class VseosvitaParser {
    constructor() {
        this.name = "Vseosvita";
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
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length || mutation.type === 'attributes') {
                    this.scan();
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        this.scan();
    }

    scan() {
        const question = document.querySelector(`${this.selectors.questionBlock}:not([data-ai-processed])`);
        if (question) {
            this.processQuestion(question);
        }
    }

    async processQuestion(element) {
        element.setAttribute('data-ai-processed', 'true');
        let qText = element.querySelector(this.selectors.questionText)?.innerText.trim();
        if (!qText) return;
        let imageBase64 = null;
        const imgEl = element.querySelector(this.selectors.questionImage);

        if (imgEl) {
            const imgSrc = imgEl.src || imgEl.dataset.src;
            if (imgSrc) {
                console.log("🖼 Found image:", imgSrc);
                try {
                    imageBase64 = await this.urlToBase64(imgSrc);
                } catch (e) {
                    console.error("Failed to load image:", e);
                }
            }
        }

        const optionEls = element.querySelectorAll(this.selectors.options);
        const options = Array.from(optionEls).map(el => {
            return el.innerText.trim();
        }).filter(t => t.length > 0);
        const fullPrompt = `Питання: ${qText}\nВаріанти:\n${options.join('\n')}`;
        console.log("🤔 Sending to AI...", { text: qText, hasImage: !!imageBase64 });
        element.style.position = "relative";
        element.style.border = "3px dashed orange";
        try {
            // ВІДПРАВКА В BACKGROUND
            const response = await chrome.runtime.sendMessage({
                action: "SOLVE_QUESTION",
                prompt: fullPrompt,
                image: imageBase64
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
    async urlToBase64(url) {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
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
        const radioContainer = element.querySelector('.v-test-questions-block') || element;
        radioContainer.appendChild(hintBox);
    }
}