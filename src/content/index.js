import { ParserManager } from './input/ParserManager';
import { BrainBridge } from './processing/BrainBridge';
import { Visualizer } from './output/Visualizer'; // Це твій новий Visualizer.js

console.log("🚀 AI Solver: Content Script Loaded");

// Автозапуск
setTimeout(() => {
    console.log("⏱️ Auto-starting solver...");
    runSolver();
}, 2000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "SOLVE_CURRENT") {
        console.log("⚡ Command received: SOLVE");
        runSolver();
    }
});

async function runSolver() {
    try {
        console.clear();
        console.log("--------------- STARTING SOLVE (No Scroll) ---------------");

        const manager = new ParserManager();
        const parser = manager.getParser();

        let data = await parser.parse();

        if (!data || (Array.isArray(data) && data.length === 0)) {
            console.error("❌ Parser returned empty data.");
            return;
        }

        const questionsQueue = Array.isArray(data) ? data : [data];
        console.log(`✅ Found ${questionsQueue.length} questions.`);

        const bridge = new BrainBridge();
        const visualizer = new Visualizer();

        // --- ЦИКЛ ---
        for (let i = 0; i < questionsQueue.length; i++) {
            const currentQuestion = questionsQueue[i];

            // ❌ СКРОЛ ПРИБРАНО (Scroll removed per request)

            console.groupCollapsed(`🔹 Question ${i + 1}/${questionsQueue.length}`);

            try {
                // AI
                const aiDecision = await bridge.solve(currentQuestion);
                console.log("🤖 Answer:", aiDecision);

                // ==========================================
                // ВІЗУАЛІЗАЦІЯ
                // ==========================================

                // 1. MATCHING
                if (currentQuestion.type === 'moodle_match') {
                    // Передаємо повний текст (reasonFull), щоб знайти пари слів
                    const answerText = aiDecision.reasonFull || aiDecision.answer || aiDecision.raw;
                    visualizer.visualizeMatching(currentQuestion.optionsNodes, answerText);
                }

                // 2. SHORT ANSWER
                else if (currentQuestion.type === 'moodle_short') {
                    const answerText = aiDecision.answer || aiDecision.reasonFull || aiDecision.raw;
                    visualizer.visualizeShortAnswer(currentQuestion.optionsNodes[0], answerText);
                }

                // 3. STANDARD (Checkbox / Radio)
                else {
                    // Обробка множинних відповідей (масив)
                    let choices = [];
                    const rawAnswer = aiDecision.choice || aiDecision.answer;

                    if (Array.isArray(rawAnswer)) {
                        choices = rawAnswer;
                    } else if (typeof rawAnswer === 'string') {
                        // Якщо рядок "a, c", розбиваємо його
                        choices = rawAnswer.toLowerCase().match(/[a-z]/g) || [];
                    }

                    // Перебираємо всі букви (навіть якщо їх декілька для чекбоксів)
                    choices.forEach(choiceChar => {
                        const targetNode = findNodeByChoice(currentQuestion.optionsNodes, choiceChar);
                        if (targetNode) {
                            visualizer.highlightAnswer(targetNode, choiceChar);
                        }
                    });
                }

            } catch (err) {
                console.error(`❌ Error solving Q${i+1}:`, err);
            } finally {
                console.groupEnd();
            }

            // Пауза 1 сек (трохи менше, бо скролу немає, працює швидше)
            if (i < questionsQueue.length - 1) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }

    } catch (e) {
        console.error("❌ CRITICAL ERROR:", e);
    }
}

function findNodeByChoice(nodes, choiceChar) {
    if (!nodes || !choiceChar) return null;
    if (typeof choiceChar !== 'string') return null;

    const cleanChar = choiceChar.toLowerCase().trim();
    if (cleanChar.length === 1) {
        const index = cleanChar.charCodeAt(0) - 97;
        return nodes[index];
    }
    return null;
}