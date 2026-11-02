/* llm.js — провайдеры ИИ, вызов моделей, проверка подключения */
const http = require('http');
const https = require('https');
const { getOne } = require('./db');

const DEFAULT_LLM_URL = process.env.LLM_URL || 'http://127.0.0.1:1234/v1/chat/completions';
const DEFAULT_LLM_MODEL = process.env.LLM_MODEL || 'google/gemma-4-12b-qat';

/* ============================================
   Популярные провайдеры (пресеты для интерфейса)
   ============================================ */
const PRESETS = [
    {
        id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1',
        apiFormat: 'openai', authType: 'bearer', keyHint: 'sk-...',
        docs: 'https://platform.openai.com/api-keys', defaultModel: 'gpt-4o-mini',
        models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o4-mini'], local: false, color: '#10a37f'
    },
    {
        id: 'anthropic', name: 'Anthropic Claude', baseUrl: 'https://api.anthropic.com/v1',
        apiFormat: 'anthropic', authType: 'x-api-key', keyHint: 'sk-ant-...',
        docs: 'https://console.anthropic.com/settings/keys', defaultModel: 'claude-sonnet-4-5',
        models: ['claude-sonnet-4-5', 'claude-opus-4-1', 'claude-3-5-haiku-latest'], local: false, color: '#d97757'
    },
    {
        id: 'gemini', name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        apiFormat: 'openai', authType: 'bearer', keyHint: 'AIza...',
        docs: 'https://aistudio.google.com/apikey', defaultModel: 'gemini-2.5-flash',
        models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'], local: false, color: '#4285f4'
    },
    {
        id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1',
        apiFormat: 'openai', authType: 'bearer', keyHint: 'sk-or-v1-...',
        docs: 'https://openrouter.ai/keys', defaultModel: 'openai/gpt-4o-mini',
        models: ['openai/gpt-4o-mini', 'anthropic/claude-sonnet-4.5', 'google/gemini-2.5-flash', 'deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct'], local: false, color: '#6467f2'
    },
    {
        id: 'groq', name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1',
        apiFormat: 'openai', authType: 'bearer', keyHint: 'gsk_...',
        docs: 'https://console.groq.com/keys', defaultModel: 'llama-3.3-70b-versatile',
        models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'qwen/qwen3-32b', 'moonshotai/kimi-k2-instruct'], local: false, color: '#f55036'
    },
    {
        id: 'mistral', name: 'Mistral AI', baseUrl: 'https://api.mistral.ai/v1',
        apiFormat: 'openai', authType: 'bearer', keyHint: '',
        docs: 'https://console.mistral.ai/api-keys', defaultModel: 'mistral-large-latest',
        models: ['mistral-large-latest', 'mistral-small-latest', 'open-mistral-nemo'], local: false, color: '#fa520f'
    },
    {
        id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1',
        apiFormat: 'openai', authType: 'bearer', keyHint: 'sk-...',
        docs: 'https://platform.deepseek.com/api_keys', defaultModel: 'deepseek-chat',
        models: ['deepseek-chat', 'deepseek-reasoner'], local: false, color: '#4d6bfe'
    },
    {
        id: 'xai', name: 'xAI Grok', baseUrl: 'https://api.x.ai/v1',
        apiFormat: 'openai', authType: 'bearer', keyHint: 'xai-...',
        docs: 'https://console.x.ai', defaultModel: 'grok-3-mini',
        models: ['grok-3-mini', 'grok-3', 'grok-4'], local: false, color: '#c9c9c9'
    },
    {
        id: 'together', name: 'Together AI', baseUrl: 'https://api.together.xyz/v1',
        apiFormat: 'openai', authType: 'bearer', keyHint: '',
        docs: 'https://api.together.ai/settings/api-keys', defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'Qwen/Qwen2.5-72B-Instruct-Turbo', 'deepseek-ai/DeepSeek-V3'], local: false, color: '#0f6fff'
    },
    {
        id: 'fireworks', name: 'Fireworks AI', baseUrl: 'https://api.fireworks.ai/inference/v1',
        apiFormat: 'openai', authType: 'bearer', keyHint: '',
        docs: 'https://fireworks.ai/account/api-keys', defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
        models: ['accounts/fireworks/models/llama-v3p3-70b-instruct', 'accounts/fireworks/models/deepseek-v3'], local: false, color: '#ff5c28'
    },
    {
        id: 'perplexity', name: 'Perplexity', baseUrl: 'https://api.perplexity.ai',
        apiFormat: 'openai', authType: 'bearer', keyHint: 'pplx-...',
        docs: 'https://www.perplexity.ai/settings/api', defaultModel: 'sonar',
        models: ['sonar', 'sonar-pro', 'sonar-reasoning'], local: false, color: '#20b8cd'
    },
    {
        id: 'cohere', name: 'Cohere', baseUrl: 'https://api.cohere.ai/compatibility/v1',
        apiFormat: 'openai', authType: 'bearer', keyHint: '',
        docs: 'https://dashboard.cohere.com/api-keys', defaultModel: 'command-r-plus-08-2024',
        models: ['command-r-plus-08-2024', 'command-r-08-2024'], local: false, color: '#39594d'
    },
    {
        id: 'cerebras', name: 'Cerebras', baseUrl: 'https://api.cerebras.ai/v1',
        apiFormat: 'openai', authType: 'bearer', keyHint: 'csk-...',
        docs: 'https://cloud.cerebras.ai', defaultModel: 'llama3.3-70b',
        models: ['llama3.3-70b', 'llama3.1-8b'], local: false, color: '#f15a29'
    },
    {
        id: 'sambanova', name: 'SambaNova', baseUrl: 'https://api.sambanova.ai/v1',
        apiFormat: 'openai', authType: 'bearer', keyHint: '',
        docs: 'https://cloud.sambanova.ai/apis', defaultModel: 'Meta-Llama-3.3-70B-Instruct',
        models: ['Meta-Llama-3.3-70B-Instruct', 'DeepSeek-R1'], local: false, color: '#e8443a'
    },
    {
        id: 'nvidia', name: 'NVIDIA NIM', baseUrl: 'https://integrate.api.nvidia.com/v1',
        apiFormat: 'openai', authType: 'bearer', keyHint: 'nvapi-...',
        docs: 'https://build.nvidia.com', defaultModel: 'meta/llama-3.3-70b-instruct',
        models: ['meta/llama-3.3-70b-instruct', 'deepseek-ai/deepseek-r1'], local: false, color: '#76b900'
    },
    {
        id: 'deepinfra', name: 'DeepInfra', baseUrl: 'https://api.deepinfra.com/v1/openai',
        apiFormat: 'openai', authType: 'bearer', keyHint: '',
        docs: 'https://deepinfra.com/dash/api_keys', defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'Qwen/Qwen2.5-72B-Instruct'], local: false, color: '#2f80ed'
    },
    {
        id: 'hyperbolic', name: 'Hyperbolic', baseUrl: 'https://api.hyperbolic.xyz/v1',
        apiFormat: 'openai', authType: 'bearer', keyHint: '',
        docs: 'https://app.hyperbolic.xyz/settings', defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
        models: ['meta-llama/Llama-3.3-70B-Instruct'], local: false, color: '#7c4dff'
    },
    {
        id: 'github', name: 'GitHub Models', baseUrl: 'https://models.github.ai/inference',
        apiFormat: 'openai', authType: 'bearer', keyHint: 'github_pat_...',
        docs: 'https://github.com/settings/tokens', defaultModel: 'openai/gpt-4o-mini',
        models: ['openai/gpt-4o-mini', 'meta/Llama-3.3-70B-Instruct'], local: false, color: '#8b949e'
    },
    {
        id: 'azure', name: 'Azure OpenAI', baseUrl: 'https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT',
        apiFormat: 'openai', authType: 'api-key', keyHint: '',
        docs: 'https://portal.azure.com', defaultModel: 'gpt-4o-mini',
        models: ['gpt-4o-mini'], local: false, color: '#0078d4'
    },
    {
        id: 'lmstudio', name: 'LM Studio', baseUrl: 'http://127.0.0.1:1234/v1',
        apiFormat: 'openai', authType: 'bearer', keyHint: '',
        docs: 'https://lmstudio.ai', defaultModel: 'google/gemma-4-12b-qat',
        models: ['google/gemma-4-12b-qat'], local: true, color: '#8a7bff'
    },
    {
        id: 'ollama', name: 'Ollama', baseUrl: 'http://127.0.0.1:11434/v1',
        apiFormat: 'openai', authType: 'bearer', keyHint: '',
        docs: 'https://ollama.com', defaultModel: 'llama3.2',
        models: ['llama3.2', 'qwen2.5', 'mistral'], local: true, color: '#ffffff'
    },
    {
        id: 'llamacpp', name: 'llama.cpp', baseUrl: 'http://127.0.0.1:8080/v1',
        apiFormat: 'openai', authType: 'bearer', keyHint: '',
        docs: 'https://github.com/ggml-org/llama.cpp', defaultModel: 'local-model',
        models: [], local: true, color: '#f0b400'
    },
    {
        id: 'vllm', name: 'vLLM', baseUrl: 'http://127.0.0.1:8000/v1',
        apiFormat: 'openai', authType: 'bearer', keyHint: '',
        docs: 'https://docs.vllm.ai', defaultModel: 'local-model',
        models: [], local: true, color: '#ffcc00'
    },
    {
        id: 'jan', name: 'Jan', baseUrl: 'http://127.0.0.1:1337/v1',
        apiFormat: 'openai', authType: 'bearer', keyHint: '',
        docs: 'https://jan.ai', defaultModel: 'local-model',
        models: [], local: true, color: '#4a90e2'
    },
    {
        id: 'litellm', name: 'LiteLLM Proxy', baseUrl: 'http://127.0.0.1:4000/v1',
        apiFormat: 'openai', authType: 'bearer', keyHint: '',
        docs: 'https://docs.litellm.ai', defaultModel: 'gpt-4o-mini',
        models: [], local: true, color: '#22c55e'
    }
];

/* ============================================
   Настройки и конфигурация
   ============================================ */

function setting(key, fallback) {
    var row = getOne('SELECT value FROM settings WHERE key = ?', [key]);
    return row && row.value != null && row.value !== '' ? String(row.value) : (fallback || '');
}

function parseHeaders(raw) {
    if (!raw) return {};
    try {
        var obj = JSON.parse(raw);
        return obj && typeof obj === 'object' ? obj : {};
    } catch (e) {
        return {};
    }
}

// склеивает base URL и путь, сохраняя query (?api-version=...)
function joinPath(baseUrl, suffix) {
    var s = String(baseUrl || '').trim();
    if (!s) return '';
    var qi = s.indexOf('?');
    var pathPart = qi === -1 ? s : s.slice(0, qi);
    var query = qi === -1 ? '' : s.slice(qi);
    pathPart = pathPart.replace(/\/+$/, '');
    if (pathPart.toLowerCase().endsWith(suffix.toLowerCase())) return pathPart + query;
    return pathPart + suffix + query;
}

function buildChatUrl(baseUrl, apiFormat) {
    return joinPath(baseUrl, apiFormat === 'anthropic' ? '/messages' : '/chat/completions');
}

function modelsUrl(baseUrl) {
    var s = String(baseUrl || '').trim();
    if (!s) return '';
    var qi = s.indexOf('?');
    var pathPart = qi === -1 ? s : s.slice(0, qi);
    var query = qi === -1 ? '' : s.slice(qi);
    pathPart = pathPart.replace(/\/+$/, '').replace(/\/(chat\/completions|messages)$/i, '');
    return pathPart + '/models' + query;
}

function normalizeFormat(value) {
    return value === 'anthropic' ? 'anthropic' : 'openai';
}

function normalizeAuth(value, format) {
    if (value === 'api-key' || value === 'x-api-key' || value === 'bearer') return value;
    return format === 'anthropic' ? 'x-api-key' : 'bearer';
}

function rowToConfig(row) {
    var format = normalizeFormat(row.api_format);
    return {
        providerId: row.id,
        name: row.name,
        baseUrl: row.base_url,
        url: buildChatUrl(row.base_url, format),
        model: row.model || '',
        apiKey: row.api_key || '',
        apiFormat: format,
        authType: normalizeAuth(row.auth_type, format),
        extraHeaders: parseHeaders(row.extra_headers)
    };
}

function getLlmConfig() {
    var activeId = Number(setting('active_provider_id', '0'));
    if (activeId) {
        var row = getOne('SELECT * FROM providers WHERE id = ?', [activeId]);
        if (row) return rowToConfig(row);
    }
    // обратная совместимость: старые настройки llm_url / llm_model
    var legacyUrl = setting('llm_url', DEFAULT_LLM_URL);
    var legacyModel = setting('llm_model', DEFAULT_LLM_MODEL);
    return {
        providerId: null,
        name: 'Модель по умолчанию',
        baseUrl: legacyUrl,
        url: legacyUrl,
        model: legacyModel,
        apiKey: '',
        apiFormat: 'openai',
        authType: 'bearer',
        extraHeaders: {}
    };
}

function authHeaders(cfg) {
    var headers = Object.assign({}, cfg.extraHeaders || {});
    if (cfg.apiKey) {
        if (cfg.authType === 'api-key') headers['api-key'] = cfg.apiKey;
        else if (cfg.authType === 'x-api-key' || cfg.apiFormat === 'anthropic') headers['x-api-key'] = cfg.apiKey;
        else headers['Authorization'] = 'Bearer ' + cfg.apiKey;
    }
    if (cfg.apiFormat === 'anthropic') headers['anthropic-version'] = '2023-06-01';
    return headers;
}

/* ============================================
   HTTP
   ============================================ */

function request(method, url, body, headers, timeoutMs) {
    return new Promise(function (resolve, reject) {
        var parsed;
        try { parsed = new URL(url); } catch (e) { return reject(new Error('Некорректный URL: ' + url)); }
        var lib = parsed.protocol === 'https:' ? https : http;
        var payload = body ? JSON.stringify(body) : null;
        var h = Object.assign({ 'Accept': 'application/json' }, headers || {});
        if (payload) {
            h['Content-Type'] = 'application/json';
            h['Content-Length'] = Buffer.byteLength(payload);
        }
        var req = lib.request({
            hostname: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname + (parsed.search || ''),
            method: method,
            headers: h,
            timeout: timeoutMs || 60000,
            agent: parsed.protocol === 'https:' ? https.globalAgent : http.globalAgent
        }, function (res) {
            var chunks = [];
            res.on('data', function (c) { chunks.push(c); });
            res.on('end', function () {
                var text = Buffer.concat(chunks).toString('utf8');
                var json = null;
                try { json = text ? JSON.parse(text) : null; } catch (e) {}
                resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, text: text, json: json });
            });
        });
        req.on('timeout', function () { req.destroy(new Error('Таймаут запроса к провайдеру')); });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

/* ============================================
   Ошибки и ответы
   ============================================ */

function shorten(text) {
    return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 300);
}

function extractErrorDetail(res) {
    var j = res.json;
    if (j) {
        if (typeof j.error === 'string') return shorten(j.error);
        if (j.error && j.error.message) return shorten(j.error.message);
        if (j.message) return shorten(j.message);
        if (Array.isArray(j) && j[0] && j[0].error && j[0].error.message) return shorten(j[0].error.message);
    }
    return shorten(res.text);
}

function friendlyError(res, cfg) {
    var name = cfg.name || 'провайдер';
    var detail = extractErrorDetail(res);
    if (res.status === 401 || res.status === 403) return 'Неверный API-ключ или нет доступа (' + name + ', ' + res.status + ')';
    if (res.status === 404) return 'Не найдена модель или эндпоинт (' + name + ', 404)';
    if (res.status === 429) return 'Превышен лимит запросов у провайдера (' + name + ', 429)';
    if (res.status === 400) return 'Провайдер отклонил запрос (' + name + '): ' + (detail || '400');
    if (res.status >= 500) return 'Ошибка на стороне провайдера (' + name + ', ' + res.status + ')';
    return 'Ошибка провайдера (' + name + ', ' + res.status + (detail ? ': ' + detail : '') + ')';
}

function extractText(data, format) {
    if (!data) return '';
    if (format === 'anthropic') {
        if (Array.isArray(data.content)) {
            return data.content.filter(function (b) { return b && b.type === 'text'; }).map(function (b) { return b.text || ''; }).join('\n').trim();
        }
        return '';
    }
    var msg = data.choices && data.choices[0] && data.choices[0].message;
    if (msg) return (msg.content || msg.reasoning_content || msg.reasoning || '').toString();
    if (data.choices && data.choices[0] && data.choices[0].text) return String(data.choices[0].text);
    return '';
}

/* ============================================
   Вызов модели
   ============================================ */

async function callLlm(opts) {
    var cfg = getLlmConfig();
    if (!cfg.url) throw new Error('Провайдер ИИ не настроен. Открой «Настройки» и выбери провайдера.');
    if (!cfg.model) throw new Error('Не указана модель. Открой «Настройки» и укажи модель.');

    var temperature = opts.temperature == null ? 0.3 : opts.temperature;
    var maxTokens = opts.maxTokens || 4096;
    var body;
    if (cfg.apiFormat === 'anthropic') {
        body = {
            model: cfg.model,
            max_tokens: maxTokens,
            temperature: temperature,
            messages: [{ role: 'user', content: opts.user }]
        };
        if (opts.system) body.system = opts.system;
    } else {
        var messages = [];
        if (opts.system) messages.push({ role: 'system', content: opts.system });
        messages.push({ role: 'user', content: opts.user });
        body = { model: cfg.model, messages: messages, temperature: temperature, max_tokens: maxTokens };
    }

    var headers = authHeaders(cfg);
    var timeout = opts.timeout || 600000;
    var res = await request('POST', cfg.url, body, headers, timeout);

    // новые модели OpenAI не принимают max_tokens — пробуем max_completion_tokens
    if (!res.ok && res.status === 400 && cfg.apiFormat !== 'anthropic' && /max_tokens/i.test(res.text || '')) {
        delete body.max_tokens;
        body.max_completion_tokens = maxTokens;
        res = await request('POST', cfg.url, body, headers, timeout);
    }

    if (!res.ok) throw new Error(friendlyError(res, cfg));

    var text = extractText(res.json, cfg.apiFormat);
    if (!text) throw new Error('Провайдер вернул пустой ответ (' + (cfg.name || 'модель') + ').');
    return { text: text, raw: res.json, cfg: cfg };
}

/* ============================================
   Проверка подключения и список моделей
   ============================================ */

function parseModels(json) {
    if (!json) return [];
    if (Array.isArray(json.data)) {
        return json.data.map(function (m) { return m.id || m.name || m.model; }).filter(Boolean);
    }
    if (Array.isArray(json.models)) {
        return json.models.map(function (m) { return m.id || m.name || m.model; }).filter(Boolean);
    }
    return [];
}

function miniBody(cfg) {
    if (cfg.apiFormat === 'anthropic') {
        return { model: cfg.model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] };
    }
    return { model: cfg.model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 };
}

async function testConfig(cfg) {
    if (!cfg.baseUrl) return { ok: false, error: 'Укажи Base URL провайдера' };
    if (!cfg.model) return { ok: false, error: 'Укажи модель' };

    var started = Date.now();
    var res;
    try {
        res = await request('GET', modelsUrl(cfg.baseUrl), null, authHeaders(cfg), 15000);
    } catch (e) {
        return { ok: false, error: e.message, latencyMs: Date.now() - started };
    }
    var latencyMs = Date.now() - started;

    if (res.ok) {
        return { ok: true, latencyMs: latencyMs, models: parseModels(res.json), status: res.status };
    }

    // некоторые провайдеры не отдают /models — проверяем коротким запросом к модели
    if (res.status === 404 || res.status === 405) {
        var mini;
        try {
            mini = await request('POST', cfg.url, miniBody(cfg), authHeaders(cfg), 30000);
        } catch (e) {
            return { ok: false, error: e.message, latencyMs: Date.now() - started };
        }
        if (mini.ok) return { ok: true, latencyMs: Date.now() - started, models: [], status: mini.status, note: 'models endpoint unavailable' };
        return { ok: false, error: friendlyError(mini, cfg), latencyMs: Date.now() - started, status: mini.status };
    }

    return { ok: false, error: friendlyError(res, cfg), latencyMs: latencyMs, status: res.status };
}

async function listModels(cfg) {
    if (!cfg.baseUrl) throw new Error('Укажи Base URL провайдера');
    var res = await request('GET', modelsUrl(cfg.baseUrl), null, authHeaders(cfg), 15000);
    if (!res.ok) throw new Error(friendlyError(res, cfg));
    return parseModels(res.json);
}

// быстрый пинг для предстартовой проверки на главной
async function pingProvider(cfg) {
    cfg = cfg || getLlmConfig();
    if (!cfg.url) return { ok: false, error: 'Провайдер не настроен' };
    try {
        var res = await request('GET', modelsUrl(cfg.baseUrl), null, authHeaders(cfg), 6000);
        if (res.ok) return { ok: true, status: res.status };
        if (res.status === 401 || res.status === 403) {
            return { ok: false, status: res.status, error: friendlyError(res, cfg) };
        }
        // сервер ответил, но /models нет — считаем, что подключение живое
        return { ok: true, status: res.status };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

module.exports = {
    PRESETS: PRESETS,
    getLlmConfig: getLlmConfig,
    rowToConfig: rowToConfig,
    buildChatUrl: buildChatUrl,
    modelsUrl: modelsUrl,
    normalizeFormat: normalizeFormat,
    normalizeAuth: normalizeAuth,
    callLlm: callLlm,
    testConfig: testConfig,
    listModels: listModels,
    pingProvider: pingProvider
};
