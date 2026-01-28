export class Visualizer {

    constructor() {
        console.log("🎨 Visualizer: Loaded (Smart Style)");
    }
    // 1. STANDARD TEST (Radio / Checkbox / Images)
    // ==========================================
    highlightAnswer(targetNode, choices) {
        if (!targetNode) return;
        let textContainer = targetNode.querySelector('.flex-fill') ||
            targetNode.querySelector('label') ||
            targetNode.querySelector('.text') ||
            targetNode.querySelector('p') ||
            targetNode;
        if (targetNode.querySelector('img') && targetNode.innerText.trim().length < 5) {
            targetNode.style.border = "2px solid #ffffff";
            targetNode.style.borderRadius = "10px";
            return;
        }

        const computedStyle = window.getComputedStyle(textContainer);
        const isAlreadyBold = computedStyle.fontWeight === 'bold' ||
            parseInt(computedStyle.fontWeight) > 500;

        this.styleFirstLetter(textContainer, isAlreadyBold);
    }

    styleFirstLetter(element, isAlreadyBold) {
        const firstTextNode = this.findFirstTextNode(element);

        if (!firstTextNode) {
            element.style.border = "3px solid #2e7d32";
            return;
        }

        const text = firstTextNode.textContent;
        const match = text.match(/[a-zA-Zа-яА-Я0-9їієґ]/);

        if (match) {
            const char = match[0];
            const index = match.index;
            const span = document.createElement('span');
            span.textContent = char;
            span.style.display = "inline-block";

            if (isAlreadyBold) {
                // СИТУАЦІЯ 1: Сайт сам робить весь текст жирним.

                span.style.fontWeight = "400";
                span.style.border = "2px solid #ffffff";
                span.style.borderRadius = "50%";
                span.style.padding = "0px 6px";
                span.style.backgroundColor = "#ffffff";
                span.style.color = "#000000";
                span.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
                span.style.marginLeft = "5px";
            } else {
                // СИТУАЦІЯ 2: Текст на сайті звичайний (тонкий).

                span.style.fontWeight = "600";
                span.style.color = "#000000";
            }

            const textAfter = text.substring(index + 1);

            firstTextNode.textContent = text.substring(0, index);

            const parent = firstTextNode.parentNode;
            const nextSibling = firstTextNode.nextSibling;
            parent.insertBefore(span, nextSibling);
            if (textAfter) {
                const afterNode = document.createTextNode(textAfter);
                parent.insertBefore(afterNode, span.nextSibling);
            }
        }
    }

    findFirstTextNode(node) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
            return node;
        }
        for (const child of node.childNodes) {
            const found = this.findFirstTextNode(child);
            if (found) return found;
        }
        return null;
    }
    // 2. SHORT ANSWER
    // ==========================================
    visualizeShortAnswer(inputNode, answerText) {
        if (!inputNode) return;
        let cleanAnswer = answerText;
        try {
            if (answerText.includes("{")) {
                const json = JSON.parse(answerText.match(/\{[\s\S]*\}/)[0]);
                cleanAnswer = json.answer || json.reason || answerText;
            }
        } catch(e) {}

        cleanAnswer = cleanAnswer.replace(/^.*: /gm, '').trim();

        inputNode.value = cleanAnswer;
        inputNode.style.borderColor = "#2e7d32";
        inputNode.style.borderWidth = "2px";
        inputNode.style.backgroundColor = "#e8f5e9";
    }

    // 3. MATCHING
    // ==========================================
    visualizeMatching(optionsNodes, aiResponseText) {
        // optionsNodes = [{textElement, selectElement, text}]
        console.log("🎨 Matching Visualization Started");

        const aiLines = aiResponseText.split('\n');

        optionsNodes.forEach((item, idx) => {
            const { textElement, selectElement } = item;
            const options = Array.from(selectElement.options);
            const relevantLine = aiLines.find(line => line.trim().startsWith(`${idx + 1}.`) || line.trim().startsWith(`${idx + 1})`));

            if (!relevantLine) return;
            let bestMatchIndex = -1;
            let maxOverlap = 0;

            for (let i = 1; i < options.length; i++) {
                const optText = options[i].text.trim();
                if (relevantLine.includes(optText)) {
                    if (optText.length > maxOverlap) {
                        maxOverlap = optText.length;
                        bestMatchIndex = i;
                    }
                }
            }

            if (bestMatchIndex !== -1) {
                selectElement.selectedIndex = bestMatchIndex;
                selectElement.style.border = "2px solid #2e7d32";
                selectElement.style.backgroundColor = "#e8f5e9";

                textElement.style.borderLeft = "5px solid #2e7d32";
                textElement.style.paddingLeft = "5px";
            }
        });
    }
}