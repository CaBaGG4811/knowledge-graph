/* router.js — hash-роутинг с анимацией */
const Router = (function () {
    'use strict';

    var routes = {};
    var currentPath = null;
    var navGeneration = 0;

    function register(path, handler) {
        routes[path] = handler;
    }

    function navigate() {
        var hash = window.location.hash || '#/app';
        var path = hash.replace('#', '');

        if (path === currentPath) {
            var handler = routes[path];
            if (handler) handler();
            return;
        }

        var content = document.getElementById('app-content');
        var isNewPage = currentPath !== null;
        currentPath = path;

        if (isNewPage && content) {
            navGeneration++;
            var gen = navGeneration;
            content.classList.add('page-exit');
            setTimeout(function () {
                if (gen !== navGeneration) return;
                content.classList.remove('page-exit');
                renderPage(path, content);
            }, 250);
        } else {
            renderPage(path, content);
        }
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
