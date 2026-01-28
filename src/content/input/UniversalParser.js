
export class UniversalParser {
    constructor() {
        this.name = "Universal Vision";
    }

    canHandle() {
        return true;
    }

    parse() {
        console.warn("⚠️ UniversalParser поки що не реалізований. Працює тільки режим скріншоту.");
        return null;
    }
}