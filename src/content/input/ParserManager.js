import { MoodleParser } from '../../lib/parsers/MoodleParser';
import { NaurokParser } from '../../lib/parsers/NaurokParser';
import { VseosvitaParser } from '../../lib/parsers/VseosvitaParser';
import { UniversalParser } from './UniversalParser';

export class ParserManager {
    constructor() {
        this.parsers = [
            new MoodleParser(),
            new NaurokParser(),
            new VseosvitaParser()
        ];
        this.universal = new UniversalParser();
    }

    getParser() {
        const currentUrl = window.location.href;

        for (const p of this.parsers) {
            if (p && typeof p.canHandle === 'function') {
                if (p.canHandle(currentUrl)) {
                    console.log(`🎯 [ParserManager] Виявлено сайт: ${p.name}`);
                    return p;
                }
            }
        }

        console.log("👁️ [ParserManager] Сайт невідомий. Вмикаю Universal Vision.");
        return this.universal;
    }
}