export class Visualizer {

    constructor() {
        console.log("🎨 Visualizer: Loaded (Custom Style)");
    }

    // ==========================================
    // 1. STANDARD TEST (Жирний шрифт / Span / Картинки)
    // ==========================================
    highlightAnswer(targetNode, aiChoiceChar) {
        if (!targetNode) return;

        // targetNode - це зазвичай <label> або <div>
        const targets = [
            targetNode.querySelector('.answernumber'),       // a., b. (Moodle)
            targetNode.querySelector('.mat-radio-label-content'), // Netacad
            targetNode.querySelector('.md-checkbox__label'),
            targetNode.querySelector('p'),
            targetNode.querySelector('span'),
            targetNode                                       // Fallback
        ];

        // Шукаємо елемент з текстом
        let target = targets.find(t => t && t.innerText.trim().length > 0);

        // СПЕЦІАЛЬНА ОБРОБКА КАРТИНОК
        // Якщо тексту майже немає, але є картинка всередині targetNode
        const imgInside = targetNode.querySelector('img');
        if ((!target || target.innerText.trim().length < 2) && imgInside) {
            console.log("🖼️ Detected image answer");
            // Робимо жирною рамку навколо картинки або всього блоку
            targetNode.style.border = "3px solid #4CAF50"; // Зелена рамка
            targetNode.style.borderRadius = "5px";
            targetNode.style.padding = "5px";
            targetNode.style.display = "inline-block";
            return;
        }

        // СТАНДАРТНА ОБРОБКА ТЕКСТУ
        if (target) {
            const text = target.innerText;
            try {
                // Якщо це нумерація Moodle (a., b.)
                if (target.classList.contains('answernumber')) {
                    target.style.fontWeight = "bold";
                } else {
                    // Якщо це текст відповіді -> Робимо жирним першу букву
                    const match = text.match(/[a-zA-Zа-яА-Я0-9]/);
                    if (match && !target.innerHTML.includes('font-weight: 600')) {
                        const char = match[0];
                        target.innerHTML = target.innerHTML.replace(char, `<span style="font-weight: 600;">${char}</span>`);
                    }
                }
                // На всяк випадок робимо батьківський елемент трохи помітнішим
                // targetNode.style.backgroundColor = "#f0fff4";
            } catch (e) {
                targetNode.style.fontWeight = "bold";
            }
        }
    }

    // ==========================================
    // 2. SHORT ANSWER (Placeholder)
    // ==========================================
    visualizeShortAnswer(inputNode, answerText) {
        if (!inputNode) return;
        inputNode.setAttribute('placeholder', answerText);
        inputNode.setAttribute('title', answerText);
        inputNode.style.borderColor = "#81c784";
        inputNode.style.boxShadow = "0 0 5px rgba(76,175,80,0.2)";
    }

    // ==========================================
    // 3. MATCHING (Твоя логіка + Фікс)
    // ==========================================
    visualizeMatching(matchingPairs, aiFullReasoning) {
        // matchingPairs = масив об'єктів {textElement, selectElement, text (ліва частина)}
        if (!matchingPairs || matchingPairs.length === 0) return;

        console.log("🎨 Visualizer: Syncing Matching Styles...");

        matchingPairs.forEach((item, index) => {
            const { textElement, selectElement } = item;
            const options = Array.from(selectElement.options);

            let targetOptionIndex = -1;

            // ЛОГІКА ПОШУКУ:
            // 1. Розбиваємо відповідь AI на рядки.
            // 2. Шукаємо рядок, що стосується цього питання (за індексом 1, 2, 3...)
            // 3. Витягуємо текст відповіді і шукаємо його в <select>

            // Регулярка шукає: "1. Текст питання ... Відповідь" або "1) ... - Відповідь"
            // Ми шукаємо просто входження тексту опції у відповідь AI

            // Перебираємо всі опції селекта
            for (let i = 0; i < options.length; i++) {
                const optText = options[i].text.trim();
                // Пропускаємо "Вибрати..."
                if (optText.length < 2 || options[i].value === '0') continue;

                // Перевірка: чи містить відповідь AI цей текст опції?
                // Додатково: бажано, щоб цей текст був поруч з номером питання, але для простоти шукаємо входження.
                if (aiFullReasoning.includes(optText)) {
                    // Евристика: якщо AI написав текст цієї опції, значить він її вибрав.
                    // (Це може дати збій, якщо однакові відповіді, але це краще, ніж random)
                    targetOptionIndex = i;

                    // Якщо ми знайшли рядок типу "1. Питання - Відповідь", це надійніше
                    const lineMatch = aiFullReasoning.match(new RegExp(`${index + 1}[\\.\\)]\\s*.*?${escapeRegExp(optText)}`, 'i'));
                    if (lineMatch) {
                        targetOptionIndex = i;
                        break; // Знайшли точний збіг для цього рядка
                    }
                }
            }

            // Застосовуємо стиль, ТІЛЬКИ якщо знайшли відповідь
            if (targetOptionIndex !== -1) {
                // Вибираємо опцію у списку (щоб не було "одна й та сама")
                selectElement.selectedIndex = targetOptionIndex;
                this.applySyncedStyles(textElement, selectElement, targetOptionIndex);
            } else {
                console.warn(`⚠️ Matching: Не знайшов пару для "${item.text}"`);
            }
        });
    }

    // ТВОЯ ФУНКЦІЯ (Без змін логіки, тільки адаптація)
    applySyncedStyles(textElement, selectElement, targetOptionIndex) {
        let targetTextContainer = textElement.querySelector('.text') || textElement.querySelector('p') || textElement;
        const originalText = targetTextContainer.innerText;
        if (!originalText) return;

        // Знаходимо реальний DOM елемент опції
        const targetOption = selectElement.options[targetOptionIndex];

        const firstChar = originalText.charAt(0);
        const restOfText = originalText.slice(1);
        let styledChar = firstChar;

        // Скидаємо стилі попередні
        if (targetOption) {
            targetOption.style.fontWeight="normal";
            targetOption.style.fontStyle="normal";
            targetOption.style.color="inherit";
            targetOption.style.backgroundColor="transparent";
        }

        // Рахуємо "візуальний" індекс (пропускаючи "Вибрати...", яке має value="0")
        // Щоб кольори йшли по порядку 1, 2, 3...
        let visualIndex = 0;
        for(let i=0; i<targetOptionIndex; i++) {
            if(selectElement.options[i].value !== '0') visualIndex++;
        }

        // Цикл кольорів (0..5)
        const styleIndex = visualIndex % 6;

        switch (styleIndex) {
            case 0: styledChar = `<b>${firstChar}</b>`; if(targetOption) targetOption.style.fontWeight = "900"; break;
            case 1: styledChar = `<i>${firstChar}</i>`; if(targetOption) targetOption.style.fontStyle = "italic"; break;
            case 2: styledChar = `<u>${firstChar}</u>`; if(targetOption) { targetOption.style.backgroundColor = "#d1d1d1"; targetOption.style.fontWeight = "bold"; } break;
            case 3: styledChar = `<span style="color: red; font-weight: bold;">${firstChar}</span>`; if(targetOption) targetOption.style.color = "red"; break;
            case 4: styledChar = `<span style="color: blue; font-weight: bold;">${firstChar}</span>`; if(targetOption) targetOption.style.color = "blue"; break;
            case 5: styledChar = `<span style="color: #e67e22; font-weight: bold;">${firstChar}</span>`; if(targetOption) targetOption.style.color = "#e67e22"; break;
            default: styledChar = `<span style="color: green; font-weight: bold;">${firstChar}</span>`; if(targetOption) targetOption.style.color = "green"; break;
        }
        targetTextContainer.innerHTML = styledChar + restOfText;
    }
}

// Хелпер для екранування тексту в Regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}