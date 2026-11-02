/* store.js — глобальное состояние */
const Store = (function () {
    'use strict';

    var state = {
        settings: { theme: 'dark', accentColor: '#e0e0e0', fontSize: 'medium', lang: 'ru', llmUrl: '', llmModel: '', activeProviderId: null }
    };

    function get(key) { return key ? state[key] : state; }

    function set(key, value) {
        state[key] = value;
        if (key === 'settings') applySettings(value);
    }

    function applySettings(s) {
        var root = document.documentElement;
        root.setAttribute('data-theme', 'dark');
        root.setAttribute('data-font-size', s.fontSize || 'medium');
        root.style.setProperty('--font-size-base', '13px');
    }

    return { get: get, set: set, applySettings: applySettings };
})();
