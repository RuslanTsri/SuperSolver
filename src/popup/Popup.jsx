import React, { useEffect, useState } from 'react';
import { storage } from '../lib/storage';
import MainView from './components/MainView';
import SettingsView from './components/SettingsView';
import './Popup.css';

export default function Popup() {
    const [view, setView] = useState('main');
    const [enabled, setEnabled] = useState(true);
    const [settings, setSettings] = useState(null);

    // Нові стани для діагностики
    const [status, setStatus] = useState('loading'); // 'ok', 'error', 'offline'
    const [errorMsg, setErrorMsg] = useState('');

    // 1. Завантаження + Діагностика
    useEffect(() => {
        // 👇 ТИМЧАСОВО РОЗКОМЕНТУЙ ЦЕЙ РЯДОК, ЩОБ СТЕРТИ СТАРІ ГЛЮЧНІ ДАНІ
        //chrome.storage.local.clear();

        storage.get().then(data => {
            console.log("Loaded Settings:", data); // Подивись у консоль, що завантажується
            setSettings(data);
            setEnabled(data.modes.enabled);
            runDiagnostics(data, data.modes.enabled);
        });
    }, []);

    // Функція перевірки "Здоров'я"
    const runDiagnostics = (data, isEnabled) => {
        if (!isEnabled) {
            setStatus('offline');
            setErrorMsg('');
            return;
        }

        // Перевіряємо, чи є хоча б один ключ
        const hasKeys = data.keys.gemini || data.keys.openai || data.keys.grok;

        if (!hasKeys) {
            setStatus('error');
            setErrorMsg('MISSING API KEYS');
        } else {
            setStatus('ok');
            setErrorMsg('');
        }
    };

    const handleToggle = async () => {
        const newState = !enabled;

        // 1. Оновлюємо локальний стейт UI
        setEnabled(newState);

        // 2. Створюємо ПОВНИЙ об'єкт нових налаштувань (копіюємо старі + міняємо enabled)
        // 🛑 ОСЬ ТУТ БУЛА ПОМИЛКА: ми не копіювали ...settings
        const newSettings = {
            ...settings,
            modes: {
                ...settings.modes,
                enabled: newState
            }
        };

        // Оновлюємо стейт settings, щоб програма знала актуальний стан
        setSettings(newSettings);

        // 3. Зберігаємо ПОВНИЙ об'єкт у пам'ять
        await storage.set(newSettings);

        // 4. Оновлюємо діагностику
        if (typeof runDiagnostics === 'function') {
            runDiagnostics(newSettings, newState);
        }

        // 5. Відправляємо повідомлення контент-скрипту
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (!tabs[0]?.id) return;
            chrome.tabs.sendMessage(tabs[0].id, { action: "TOGGLE_EXTENSION", state: newState }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log("⚠️ Content Script мовчить (це ок).");
                } else {
                    console.log("✅ Content Script оновлено:", response);
                }
            });
        });
    };

    const handleSettingsChange = (section, field, value) => {
        const newSettings = {
            ...settings,
            [section]: { ...settings[section], [field]: value }
        };
        setSettings(newSettings);
        // Перевіряємо помилки в реальному часі
        runDiagnostics(newSettings, enabled);
    };

    // Обчислюємо активних агентів (чи введені ключі)
    const activeAgents = settings ? {
        gemini: !!settings.keys.gemini && settings.keys.gemini.length > 10,
        groq: !!settings.keys.grok && settings.keys.grok.length > 10
    } : { gemini: false, groq: false };

    const handleSaveSettings = async () => {
        await storage.set(settings);
    };

    if (!settings) return <div className="loading">Loading Core...</div>;

    return (
        <>
            {view === 'main' ? (
                <MainView
                    enabled={enabled}
                    status={status}
                    errorMsg={errorMsg}
                    activeAgents={activeAgents} // <--- ОСЬ ТУТ ДОДАЄМО ЦЕЙ РЯДОК
                    onToggle={handleToggle}
                    weights={settings.weights}
                    onOpenSettings={() => setView('settings')}
                />
            ) : (
                <SettingsView
                    settings={settings}
                    onSettingsChange={handleSettingsChange}
                    onSave={handleSaveSettings}
                    onBack={() => setView('main')}
                />
            )}
        </>
    );
}