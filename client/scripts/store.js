/* store.js — глобальное состояние */
const Store = (function () {
    'use strict';

    var THEMES = ['dark', 'light', 'midnight', 'sand'];

    var state = {
        settings: { theme: 'dark', accentColor: '#e0e0e0', fontSize: 'medium', lang: 'ru', llmUrl: '', llmModel: '', activeProviderId: null }
    };

    function get(key) { return key ? state[key] : state; }

    function set(key, value) {
        state[key] = value;
        if (key === 'settings') applySettings(value);
    }

    function normalizeTheme(theme) {
        return THEMES.indexOf(theme) === -1 ? 'dark' : theme;
    }

    function applySettings(s) {
        var root = document.documentElement;
        var theme = normalizeTheme(s.theme);
        root.setAttribute('data-theme', theme);
        root.setAttribute('data-font-size', s.fontSize || 'medium');
        try { localStorage.setItem('kg_theme', theme); } catch (e) {}
    }

    return { get: get, set: set, applySettings: applySettings };
})();
