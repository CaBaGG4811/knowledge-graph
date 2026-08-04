/* toast.js — уведомления */
const Toast = (function () {
    'use strict';

    var container;
    var MAX_TOASTS = 5;

    function init() {
        container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
    }

    function show(message, type, duration) {
        if (!container) init();
        type = type || 'info';
        duration = duration || 3000;

        while (container.children.length >= MAX_TOASTS) {
            container.firstChild.remove();
        }

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
