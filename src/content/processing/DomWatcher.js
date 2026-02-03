export class DomWatcher {
    constructor(onDomChangeCallback) {
        this.observer = null;
        this.callback = onDomChangeCallback; // Це функція runSolver
        this.timeout = null;
        this.isWatching = false;
    }

    start() {
        if (this.isWatching) return;

        const targetNode = document.body;

        // Стежимо за всім: дітьми, нащадками
        const config = { childList: true, subtree: true };

        this.observer = new MutationObserver((mutations) => {
            let shouldTrigger = false;

            // Перевіряємо, чи зміни значущі
            for (const mutation of mutations) {
                // Якщо додалися нові вузли
                if (mutation.addedNodes.length > 0) {
                    // Фільтруємо технічне сміття (скрипти, стилі), щоб не тригерити зайвий раз
                    const hasRealElements = Array.from(mutation.addedNodes).some(node =>
                        node.nodeType === 1 && // Це HTML елемент
                        node.tagName !== 'SCRIPT' &&
                        node.tagName !== 'STYLE' &&
                        node.tagName !== 'LINK'
                    );

                    if (hasRealElements) {
                        shouldTrigger = true;
                        break; // Достатньо однієї зміни, щоб запустити таймер
                    }
                }
            }

            if (shouldTrigger) {
                this.triggerDebounced();
            }
        });

        this.observer.observe(targetNode, config);
        this.isWatching = true;
        console.log("👁️ DomWatcher: Увімкнено повний моніторинг (Any Change).");
    }

    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.isWatching = false;
    }

    // Чекаємо, поки DOM "заспокоїться" на 1 секунду перед запуском
    triggerDebounced() {
        if (this.timeout) clearTimeout(this.timeout);

        this.timeout = setTimeout(() => {
            console.log("⚡ DomWatcher: Зміни зафіксовані. Запускаю перевірку...");
            this.callback(); // Викликаємо runSolver
        }, 1000);
    }
}