/* toast.js — уведомления */
const Toast = (function () {
    'use strict';

    var container;

    function init() {
        container = document.getElementById('toast-container');
    }

    function show(message, type, duration) {
        if (!container) init();
        type = type || 'info';
        duration = duration || 3000;

        var el = document.createElement('div');
        el.className = 'toast ' + type;
        el.textContent = message;
        container.appendChild(el);

        setTimeout(function () {
            el.classList.add('toast-exit');
            setTimeout(function () { el.remove(); }, 300);
        }, duration);
    }

    return { show: show };
})();
