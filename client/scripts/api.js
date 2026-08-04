/* api.js — HTTP-клиент */
const API = (function () {
    'use strict';

    async function request(url, options) {
        options = options || {};
        options.headers = options.headers || {};
        if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }
        var controller = null;
        var timer = null;
        if (options.timeout !== false) {
            controller = new AbortController();
            options.signal = controller.signal;
            var timeoutMs = options.timeout || 600000;
            timer = setTimeout(function () { controller.abort(); }, timeoutMs);
        }
        try {
            var response = await fetch(url, options);
            var data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Ошибка сервера');
            return data;
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    return {
        get: function (url) { return request(url, { method: 'GET' }); },
        post: function (url, body, opts) { return request(url, Object.assign({ method: 'POST', body: body }, opts || {})); },
        put: function (url, body) { return request(url, { method: 'PUT', body: body }); },
        del: function (url) { return request(url, { method: 'DELETE' }); }
    };
})();
