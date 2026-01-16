// src/content/input/UniversalParser.js
export class UniversalParser {
    constructor() {
        this.name = "Universal Vision";
    }

    canHandle() {
        return true; // Він може все
    }

    parse() {
        console.warn("⚠️ UniversalParser поки що не реалізований. Працює тільки режим скріншоту.");
        // Повертаємо null, щоб Visualizer не намагався нічого малювати,
        // або повертаємо базовий текст сторінки.
        return null;
    }
}