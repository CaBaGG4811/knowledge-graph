/* llm.js — клиентский LLM-модуль (вызовы из браузера) */
const LLM = (function () {
    'use strict';

    function detectUrl(key) {
        if (!key) return '';
        if (key.startsWith('sk-ant-')) return 'https://api.anthropic.com/v1/messages';
        if (key.startsWith('sk-lm-')) return 'http://127.0.0.1:1234/v1/chat/completions';
        if (key.startsWith('sk-')) return 'https://api.openai.com/v1/chat/completions';
        if (key.startsWith('AIza')) return 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=' + key;
        return '';
    }

    function getConfig() {
        var s = Store.get('settings');
        var key = s.llmApiKey || '';
        var model = s.llmModel || '';
        var storedUrl = s.llmUrl || '';
        var autoUrl = detectUrl(key);
        var url = storedUrl || autoUrl || 'http://127.0.0.1:1234/v1/chat/completions';
        return { url: url, model: model, apiKey: key };
    }

    async function call(messages, opts) {
        opts = opts || {};
        var cfg = getConfig();
        var url = opts.url || cfg.url;
        var model = opts.model || cfg.model || 'gpt-4o-mini';
        var apiKey = opts.apiKey || cfg.apiKey;

        if (!apiKey) {
            throw new Error('Введите API-ключ в настройках');
        }

        var headers = { 'Content-Type': 'application/json' };
        var isAnthropic = url.includes('anthropic.com');
        var isGemini = url.includes('generativelanguage.googleapis.com');

        if (isAnthropic) {
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
            headers['anthropic-dangerous-direct-browser-access'] = 'true';

            var systemMsg = '';
            var userMsgs = [];
            messages.forEach(function (m) {
                if (m.role === 'system') systemMsg = m.content;
                else userMsgs.push({ role: m.role, content: m.content });
            });

            var body = {
                model: model || 'claude-sonnet-4-20250514',
                max_tokens: opts.max_tokens || 8192,
                temperature: opts.temperature || 0.3,
                messages: userMsgs
            };
            if (systemMsg) body.system = systemMsg;

            var resp = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            });

            if (!resp.ok) {
                var errText = await resp.text();
                throw new Error('LLM ' + resp.status + ': ' + errText.substring(0, 200));
            }

            var data = await resp.json();
            return (data.content && data.content[0] && data.content[0].text) || '';
        }

        if (isGemini) {
            var contents = [];
            var sysParts = [];
            messages.forEach(function (m) {
                if (m.role === 'system') sysParts.push(m.content);
                else contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
            });

            var geminiBody = {
                contents: contents,
                generationConfig: {
                    temperature: opts.temperature || 0.3,
                    maxOutputTokens: opts.max_tokens || 8192
                }
            };
            if (sysParts.length > 0) {
                geminiBody.systemInstruction = { parts: [{ text: sysParts.join('\n') }] };
            }

            var resp = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(geminiBody)
            });

            if (!resp.ok) {
                var errText = await resp.text();
                throw new Error('LLM ' + resp.status + ': ' + errText.substring(0, 200));
            }

            var data = await resp.json();
            var candidates = data.candidates || [];
            if (candidates[0] && candidates[0].content && candidates[0].content.parts) {
                return candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('');
            }
            return '';
        }

        headers['Authorization'] = 'Bearer ' + apiKey;

        var body = {
            model: model || 'gpt-4o-mini',
            messages: messages,
            temperature: opts.temperature || 0.3,
            max_tokens: opts.max_tokens || 8192
        };

        var resp = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!resp.ok) {
            var errText = await resp.text();
            throw new Error('LLM ' + resp.status + ': ' + errText.substring(0, 200));
        }

        var data = await resp.json();
        var msg = data.choices && data.choices[0] && data.choices[0].message;
        return (msg && (msg.content || msg.reasoning_content)) || '';
    }

    function isConfigured() {
        var s = Store.get('settings');
        return !!(s.llmApiKey && s.llmModel);
    }

    return { call: call, getConfig: getConfig, detectUrl: detectUrl, isConfigured: isConfigured };
})();
