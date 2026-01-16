import React from 'react';
import { Settings, Power, Wifi, WifiOff, AlertTriangle, Activity, Brain, Zap, Scale } from 'lucide-react';

// 👇 Додав проп 'weights'
export default function MainView({ enabled, status, errorMsg, activeAgents, weights, onToggle, onOpenSettings }) {

    const ui = (() => {
        if (status === 'offline') return { color: '#555', icon: <WifiOff size={18} />, text: 'Disconnected' };
        if (status === 'error') return { color: '#F44336', icon: <AlertTriangle size={18} />, text: 'Attention Needed' };
        return { color: '#4CAF50', icon: <Wifi size={18} />, text: 'Systems Normal' };
    })();

    // 📊 ЛОГІКА СОРТУВАННЯ ПРІОРИТЕТІВ
    // Ми хочемо показати Лідера першим
    const defaultWeights = { gemini: 1.2, llama: 1.1, mixtral: 1.0 };
    const currentWeights = weights || defaultWeights;

    const sortedPriorities = [
        { name: 'Gemini', val: currentWeights.gemini, color: '#4CAF50' }, // Green
        { name: 'Llama', val: currentWeights.llama, color: '#2196F3' },   // Blue
        { name: 'Mixtral', val: currentWeights.mixtral, color: '#9C27B0' } // Purple
    ].sort((a, b) => b.val - a.val); // Сортуємо: від більшого до меншого

    return (
        <div className="popup-container">
            <div className="header">
                <span className="logo">AI Solver 3000</span>
                <button className="settings-btn" onClick={onOpenSettings} title="Налаштування">
                    <Settings size={20} />
                </button>
            </div>

            {/* --- ПАНЕЛЬ АГЕНТІВ (Верхня) --- */}
            <div className="agents-status-bar">
                <div className={`agent-badge ${activeAgents?.gemini ? 'active-gemini' : 'inactive'}`} title="Google Gemini">
                    <Brain size={14} />
                    <span>Gemini</span>
                </div>

                <div className={`agent-badge ${activeAgents?.groq ? 'active-groq' : 'inactive'}`} title="Llama 3 & Mixtral">
                    <Zap size={14} />
                    <span>Turbo</span>
                </div>
            </div>

            {/* --- 👇 НОВЕ: ВІЗУАЛІЗАЦІЯ ПРІОРИТЕТІВ --- */}
            <div className="priority-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '20px', fontSize: '10px', color: '#888' }}>

                {/* Ліва частина: Іконка + Текст */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginRight: '5px', borderRight: '1px solid #444', paddingRight: '8px' }}>
                    <Scale size={11} />
                    <span style={{ fontWeight: '600', letterSpacing: '0.3px' }}>Пріоритет ШІ:</span>
                </div>

                {/* Права частина: Список моделей */}
                {sortedPriorities.map((item, index) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{
                color: item.color,
                fontWeight: index === 0 ? 'bold' : 'normal', // Лідер жирним
                opacity: index === 0 ? 1 : 0.7
            }}>
                {item.name} <span style={{fontSize:'9px', color:'#555'}}>({item.val})</span>
            </span>

                        {/* Малюємо стрілочку ">", якщо це не останній елемент */}
                        {index < sortedPriorities.length - 1 && (
                            <span style={{ margin: '0 4px', color: '#444' }}>&gt;</span>
                        )}
                    </div>
                ))}
            </div>
            {/* ----------------------------- */}

            <div className="main-control">
                <button
                    className={`power-btn ${enabled ? 'on' : 'off'} ${status === 'error' ? 'error-pulse' : ''}`}
                    onClick={onToggle}
                >
                    <Power size={40} />
                </button>

                <div className="status-panel">
                    <div className="status-row" style={{ color: ui.color }}>
                        {ui.icon}
                        <span className="status-label">{ui.text}</span>
                    </div>

                    {errorMsg && (
                        <div className="error-alert">
                            <AlertTriangle size={14} />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {status === 'ok' && (
                        <div className="tech-stats">
                            <div className="stat-item">
                                <Activity size={12} />
                                <span>AI Core: Active</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}