import { ParserManager } from './input/ParserManager';
import { BrainBridge } from './processing/BrainBridge';
import { Visualizer } from './output/Visualizer';
import { DomWatcher } from "./processing/DomWatcher";

console.log("🚀 AI Solver: Content Script Loaded");
let domWatcher = null;
let isSolving = false;
// Автозапуск
setTimeout(() => {
    console.log("⏱️ Auto-starting solver...");
    domWatcher = new DomWatcher(runSolver);
    domWatcher.start();
    runSolver();

}, 2000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "SOLVE_CURRENT") {
        console.log("⚡ Command received: FORCE SOLVE");
        runSolver();
    }
});

async function runSolver() {
    // Захист від повторного запуску, поки попередній ще працює
    if (isSolving) {
        console.log("⚠️ Solver is running. Skipping.");
        return;
    }

    try {
        isSolving = true;

        const manager = new ParserManager();
        const parser = manager.getParser();

        // 1. Парсимо (Parser сам перевірить, чи питання вже вирішене через dataset)
        let data = await parser.parse();

        if (!data || (Array.isArray(data) && data.length === 0)) {
            // console.log("💤 Нічого нового.");
            isSolving = false;
            return;
        }

        const questionsQueue = Array.isArray(data) ? data : [data];
        console.log(`✅ Found ${questionsQueue.length} NEW questions.`);

        const bridge = new BrainBridge();
        const visualizer = new Visualizer();

        // 2. Вирішуємо кожне нове питання
        for (let i = 0; i < questionsQueue.length; i++) {
            const currentQuestion = questionsQueue[i];

            console.groupCollapsed(`🔹 Question ${i + 1}/${questionsQueue.length}`);

            try {
                // AI
                const aiDecision = await bridge.solve(currentQuestion);
                console.log("🤖 Answer:", aiDecision);

                // VISUALIZATION
                if (currentQuestion.type === 'moodle_match') {
                    const answerText = aiDecision.reasonFull || aiDecision.answer;
                    visualizer.visualizeMatching(currentQuestion.optionsNodes, answerText);
                }
                else if (currentQuestion.type === 'moodle_short') {
                    const answerText = aiDecision.answer || aiDecision.reasonFull;
                    visualizer.visualizeShortAnswer(currentQuestion.optionsNodes[0], answerText);
                }
                else {
                    let choices = [];
                    const rawAnswer = aiDecision.choice || aiDecision.answer;

                    if (Array.isArray(rawAnswer)) {
                        choices = rawAnswer;
                    } else if (typeof rawAnswer === 'string') {
                        choices = rawAnswer.toLowerCase().match(/[a-z]/g) || [];
                    }

                    choices.forEach(choiceChar => {
                        visualizer.highlightAnswer(currentQuestion.container, choiceChar);
                    });
                }

                // 3. МІТКА: Позначаємо питання як вирішене
                if (currentQuestion.container) {
                    currentQuestion.container.dataset.solverProcessed = "true";
                }

            } catch (err) {
                console.error(`❌ Error solving Q${i+1}:`, err);
            } finally {
                console.groupEnd();
            }
        }

    } catch (e) {
        console.error("❌ CRITICAL ERROR:", e);
    } finally {
        isSolving = false;
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