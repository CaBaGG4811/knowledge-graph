/* router.js — hash-роутинг с анимацией */
const Router = (function () {
    'use strict';

    var routes = {};
    var currentPath = null;

    function register(path, handler) {
        routes[path] = handler;
    }

    function navigate() {
        var hash = window.location.hash || '#/app';
        var path = hash.replace('#', '');

        if (path === currentPath) {
            // просто вызываем handler без анимации (обновление)
            var handler = routes[path];
            if (handler) handler();
            return;
        }

        var content = document.getElementById('app-content');
        var isNewPage = currentPath !== null;

        if (isNewPage && content) {
            content.classList.add('page-exit');
            setTimeout(function () {
                content.classList.remove('page-exit');
                renderPage(path, content);
            }, 250);
        } else {
            renderPage(path, content);
        }

        currentPath = path;
    }

    function renderPage(path, content) {
        var handler = routes[path];
        if (handler) {
            handler();
            if (content) {
                content.classList.add('page-enter');
                setTimeout(function () { content.classList.remove('page-enter'); }, 400);
            }
        } else {
            window.location.hash = '#/app';
        }
    }

    function init() {
        window.addEventListener('hashchange', navigate);
        navigate();
    }

    return { register: register, init: init, navigate: navigate };
})();
