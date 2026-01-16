// src/content/input/ParserManager.js

// 👇 Використовуємо відносні шляхи, щоб точно не було помилок білда
import { VseosvitaParser } from '../../lib/parsers/VseosvitaParser'; // Перевір, чи створив ти цей файл!
import { MoodleParser } from '../../lib/parsers/MoodleParser';
import { NaurokParser } from '../../lib/parsers/NaurokParser';
import { UniversalParser } from './UniversalParser';

export class ParserManager {
    constructor() {
        this.parsers = [
            new MoodleParser(),    // 1. Moodle (специфічна верстка)
            new NaurokParser(),    // 2. На Урок
            // new VseosvitaParser() // 3. Всеосвіта (розкоментуй, коли створиш файл)
        ];
        this.universal = new UniversalParser();
    }

    getParser() {
        // 👇 ВАЖЛИВО: беремо повну адресу, а не тільки домен
        const currentUrl = window.location.href;

        // 1. Шукаємо специфічний парсер
        const activeParser = this.parsers.find(p => p.canHandle(currentUrl));

        if (activeParser) {
            console.log(`🎯 [ParserManager] Виявлено сайт: ${activeParser.name}`);
            return activeParser;
        }

        // 2. Якщо не знайшли - вмикаємо універсальний
        console.log("👁️ [ParserManager] Сайт невідомий. Вмикаю Universal Vision.");
        return this.universal;
    }
}