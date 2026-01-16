import React, { useState } from 'react';
import { ArrowLeft, Save, Shield, Users, ChevronDown, ChevronUp, RefreshCw, Scale } from 'lucide-react';
import { fetchGeminiModels, fetchGroqModels } from '../../lib/ai/modelFetcher';

export default function SettingsView({ settings, onSettingsChange, onSave, onBack }) {
    const [status, setStatus] = useState("");
    const [showAdvanced, setShowAdvanced] = useState(false);

    // 1. ІНІЦІАЛІЗАЦІЯ СПИСКІВ МОДЕЛЕЙ
    const [geminiList, setGeminiList] = useState(
        (settings.availableModels?.gemini && settings.availableModels.gemini.length > 0)
            ? settings.availableModels.gemini
            : ["gemini-2.0-flash-exp", "gemini-1.5-flash"]
    );

    const [groqList, setGroqList] = useState(
        (settings.availableModels?.groq && settings.availableModels.groq.length > 0)
            ? settings.availableModels.groq
            : ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"]
    );

    const [isLoadingModels, setIsLoadingModels] = useState(false);

    // --- ЛОГІКА ВАГИ (AI AUTHORITY) ---
    // Дефолтні ваги, якщо в settings їх ще немає
    const weights = settings.weights || { gemini: 1.2, llama: 1.1, mixtral: 1.0 };

    // Перевірка на дублікати (щоб не було нічиєї)
    const weightValues = Object.values(weights).map(Number);
    const hasDuplicates = new Set(weightValues).size !== weightValues.length;

    // Список доступних опцій для дропдауна (від 0.5 до 2.0)
    const weightOptions = [
        { val: 0.5, label: "0.5 (Very Low)" },
        { val: 0.8, label: "0.8 (Low)" },
        { val: 0.9, label: "0.9 (Support)" },
        { val: 1.0, label: "1.0 (Neutral)" },
        { val: 1.1, label: "1.1 (High)" },
        { val: 1.2, label: "1.2 (Leader)" },
        { val: 1.3, label: "1.3 (Very High)" },
        { val: 1.5, label: "1.5 (Dominant)" },
        { val: 2.0, label: "2.0 (Dictator)" }
    ];

    const handleSave = async () => {
        if (hasDuplicates) return; // Захист від збереження з помилкою
        setStatus("Saving...");
        await onSave();
        setStatus("✅ Збережено!");
        setTimeout(() => setStatus(""), 2000);
    };

    const refreshModels = async () => {
        setIsLoadingModels(true);
        console.log("🔄 Починаю оновлення списків...");
        try {
            const [gModels, grModels] = await Promise.all([
                fetchGeminiModels(settings.keys.gemini),
                fetchGroqModels(settings.keys.grok)
            ]);

            const newGeminiList = gModels.length > 0 ? gModels : ["gemini-1.5-flash"];
            const newGroqList = grModels.length > 0 ? grModels : ["llama-3.3-70b-versatile"];

            setGeminiList(newGeminiList);
            setGroqList(newGroqList);

            onSettingsChange('availableModels', 'gemini', newGeminiList);
            onSettingsChange('availableModels', 'groq', newGroqList);

            setStatus("✅ Списки оновлено!");
        } catch (e) {
            console.error("Помилка оновлення:", e);
            setStatus("⚠️ Помилка: " + e.message);
        } finally {
            setIsLoadingModels(false);
            setTimeout(() => setStatus(""), 2000);
        }
    };

    const llamaOptions = groqList.filter(m => m.toLowerCase().includes('llama'));
    const mixtralOptions = groqList.filter(m => m.toLowerCase().includes('mixtral'));

    return (
        <div className="popup-container settings-mode">
            <div className="header">
                <button className="back-btn" onClick={onBack}>
                    <ArrowLeft size={18} /> Назад
                </button>
                <span className="header-title">Налаштування</span>
            </div>

            <div className="settings-scroll-area">

                {/* --- API KEYS --- */}
                <div className="section-title">API Keys</div>
                <div className="input-group">
                    <label>Gemini Pool</label>
                    <textarea className="multi-key-input" rows={2}
                              value={settings.keys.gemini}
                              onChange={(e) => onSettingsChange('keys', 'gemini', e.target.value)}
                              placeholder="AIzaSy..."
                    />
                </div>
                <div className="input-group">
                    <label>Groq Pool</label>
                    <textarea className="multi-key-input" rows={2}
                              value={settings.keys.grok}
                              onChange={(e) => onSettingsChange('keys', 'grok', e.target.value)}
                              placeholder="gsk_..."
                              title="Один ключ Groq підходить і для Llama, і для Mixtral!"
                    />
                </div>

                <hr className="divider"/>

                {/* --- LOGIC MODE --- */}
                <div className="section-title">Logic Mode</div>
                <div className="toggle-row">
                    <div className="toggle-label">
                        {settings.modes.council ? <Users size={16} color="#9C27B0"/> : <Shield size={16} color="#4CAF50"/>}
                        <div style={{display:'flex', flexDirection:'column'}}>
                            <span>{settings.modes.council ? "Council (Debate)" : "Fallback (Safe)"}</span>
                            <small style={{fontSize:'10px', color:'#777'}}>
                                {settings.modes.council ? "Паралельне голосування" : "Послідовна черга"}
                            </small>
                        </div>
                    </div>
                    <label className="switch-mini">
                        <input type="checkbox" checked={settings.modes.council}
                               onChange={(e) => onSettingsChange('modes', 'council', e.target.checked)}
                        />
                        <span className="slider-mini round"></span>
                    </label>
                </div>

                <hr className="divider"/>

                {/* --- AI AUTHORITY (ВАГИ) --- */}
                <div className="section-title" style={{display:'flex', alignItems:'center', gap:5}}>
                    AI Authority (Priority)
                </div>

                <div className="weights-container" style={{background: '#1e1e1e', padding: '10px', borderRadius: '8px', marginBottom: '15px', border: hasDuplicates ? '1px solid #ff4444' : '1px solid #333'}}>
                    <div style={{fontSize: '11px', color: '#888', marginBottom: '10px'}}>
                        Вистав пріоритет голосу для кожного ШІ. <br/>
                        <em>Ваги не повинні співпадати!</em>
                    </div>

                    {['gemini', 'llama', 'mixtral'].map(model => (
                        <div key={model} className="input-group" style={{marginBottom:'8px'}}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'2px'}}>
                                <label style={{textTransform:'capitalize', fontSize:'12px'}}>{model}</label>
                                <span style={{fontSize:'10px', color: weights[model] >= 1.2 ? '#4CAF50' : '#777'}}>
                                    {weights[model]}
                                </span>
                            </div>
                            <select
                                className="model-select"
                                value={weights[model]}
                                onChange={(e) => onSettingsChange('weights', model, parseFloat(e.target.value))}
                                style={{
                                    border: hasDuplicates && weightValues.filter(v => v === weights[model]).length > 1
                                        ? '1px solid #ff4444'
                                        : '1px solid #444'
                                }}
                            >
                                {weightOptions.map(opt => (
                                    <option key={opt.val} value={opt.val}>
                                        {opt.val} - {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}

                    {hasDuplicates && (
                        <div style={{color: '#ff4444', fontSize: '11px', marginTop: '5px', textAlign: 'center', fontWeight: 'bold'}}>
                            ⛔ Конфлікт: Вибери різні значення ваги!
                        </div>
                    )}
                </div>

                <hr className="divider"/>

                {/* --- ADVANCED SETTINGS --- */}
                <div
                    className="advanced-toggle"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    style={{display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', color:'#aaa', fontSize:'12px', marginBottom:10, padding:'5px', background:'#222', borderRadius:4}}
                >
                    <div style={{display:'flex', alignItems:'center', gap:5}}>
                        {showAdvanced ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        <span>Advanced: AI Models</span>
                    </div>
                    {showAdvanced && (
                        <button
                            onClick={(e) => { e.stopPropagation(); refreshModels(); }}
                            className="refresh-icon-btn"
                            title="Оновити список з API"
                            disabled={isLoadingModels}
                        >
                            <RefreshCw size={12} className={isLoadingModels ? "spin" : ""} />
                        </button>
                    )}
                </div>

                {showAdvanced && (
                    <div className="advanced-area" style={{paddingLeft: 10, borderLeft:'2px solid #333', animation: 'fadeIn 0.3s'}}>

                        {/* Gemini Select */}
                        <div className="input-group">
                            <label>Gemini Model</label>
                            <select
                                className="model-select"
                                value={settings.models?.gemini || "gemini-1.5-flash"}
                                onChange={(e) => onSettingsChange('models', 'gemini', e.target.value)}
                            >
                                {geminiList.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>

                        {/* Llama Select */}
                        <div className="input-group">
                            <label>Llama Model (Groq)</label>
                            <select
                                className="model-select"
                                value={settings.models?.llama || "llama-3.3-70b-versatile"}
                                onChange={(e) => onSettingsChange('models', 'llama', e.target.value)}
                            >
                                {llamaOptions.length > 0 ? (
                                    llamaOptions.map(m => <option key={m} value={m}>{m}</option>)
                                ) : (
                                    <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Default)</option>
                                )}
                            </select>
                        </div>

                        {/* Mixtral Select */}
                        <div className="input-group">
                            <label>Mixtral Model (Groq)</label>
                            <select
                                className="model-select"
                                value={settings.models?.mixtral || "mixtral-8x7b-32768"}
                                onChange={(e) => onSettingsChange('models', 'mixtral', e.target.value)}
                            >
                                {mixtralOptions.length > 0 ? (
                                    mixtralOptions.map(m => <option key={m} value={m}>{m}</option>)
                                ) : (
                                    <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (Default/Offline)</option>
                                )}
                            </select>
                        </div>
                    </div>
                )}

                <button
                    className={`save-btn-mini ${hasDuplicates ? 'disabled' : ''}`}
                    onClick={hasDuplicates ? null : handleSave}
                    style={{
                        opacity: hasDuplicates ? 0.5 : 1,
                        cursor: hasDuplicates ? 'not-allowed' : 'pointer',
                        marginTop: '15px'
                    }}
                >
                    <Save size={16} /> {hasDuplicates ? "Виправ помилки" : "Зберегти налаштування"}
                </button>

                {status && <div className="status-msg-mini">{status}</div>}
            </div>
        </div>
    );
}