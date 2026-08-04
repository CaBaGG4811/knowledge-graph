/* store.js — глобальное состояние */
const Store = (function () {
    'use strict';

    var state = {
        settings: { theme: 'dark', accentColor: '#e0e0e0', fontSize: 'medium', lang: 'ru', llmUrl: '', llmModel: '' }
    };

    function get(key) { return key ? state[key] : state; }

    function set(key, value) {
        state[key] = value;
        if (key === 'settings') applySettings(value);
    }

    function applySettings(s) {
        var root = document.documentElement;
        root.setAttribute('data-theme', s.theme || 'dark');
        var sizes = { small: '12px', medium: '13px', large: '14px' };
        root.style.setProperty('--font-size-base', sizes[s.fontSize] || '13px');
    }

    function toggleTheme() {
        var current = state.settings.theme;
        var next = current === 'dark' ? 'light' : 'dark';
        state.settings.theme = next;
        applySettings(state.settings);
        return next;
    }

    return { get: get, set: set, applySettings: applySettings, toggleTheme: toggleTheme };
})();
