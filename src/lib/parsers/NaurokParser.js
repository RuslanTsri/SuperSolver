export class NaurokParser {
    constructor() {
        this.name = "Naurok";
    }

    isMatch(url) {
        return url.includes('naurok.com.ua/test/');
    }

    start() {
        console.log("🟢 Naurok Parser started.");
        setInterval(() => this.scan(), 2000);
    }

    scan() {
        const questions = document.querySelectorAll('.test-question-block:not([data-ai-processed])');
        questions.forEach(q => this.processQuestion(q));
    }

    async processQuestion(element) {
        element.setAttribute('data-ai-processed', 'true');
        const text = element.querySelector('.question-text')?.innerText;
    }
}