/* providers.js — CRUD провайдеров ИИ + проверка подключения */
const express = require('express');
const { getAll, getOne, runQuery } = require('../db');
const {
    PRESETS, rowToConfig, buildChatUrl, normalizeFormat, normalizeAuth,
    testConfig, listModels
} = require('../llm');

const router = express.Router();

function setting(key, fallback) {
    var row = getOne('SELECT value FROM settings WHERE key = ?', [key]);
    return row && row.value != null && row.value !== '' ? String(row.value) : (fallback || '');
}

function setActive(id) {
    runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['active_provider_id', String(id)]);
}

function clearActive() {
    runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['active_provider_id', '']);
}

function activeId() {
    var id = Number(setting('active_provider_id', '0'));
    return id || null;
}

function maskKey(key) {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return key.slice(0, 4) + '••••' + key.slice(-4);
}

function publicProvider(row) {
    return {
        id: row.id,
        name: row.name,
        baseUrl: row.base_url,
        model: row.model || '',
        apiFormat: normalizeFormat(row.api_format),
        authType: normalizeAuth(row.auth_type, normalizeFormat(row.api_format)),
        presetId: row.preset_id || '',
        hasKey: !!row.api_key,
        apiKeyMasked: maskKey(row.api_key),
        createdAt: row.created_at || null
    };
}

function validatePayload(body, options) {
    options = options || {};
    var name = String(body.name || '').trim();
    var baseUrl = String(body.baseUrl || '').trim();
    var model = String(body.model || '').trim();

    if (!baseUrl) return { error: 'Укажи Base URL провайдера' };
    if (!/^https?:\/\//i.test(baseUrl)) return { error: 'Base URL должен начинаться с http:// или https://' };
    if (baseUrl.length > 600) return { error: 'Base URL слишком длинный' };
    if (!model && !options.allowEmptyModel) return { error: 'Укажи модель' };
    if (name.length > 80) return { error: 'Название слишком длинное' };
    if (model.length > 200) return { error: 'Название модели слишком длинное' };
    if (!name) {
        try { name = new URL(baseUrl).hostname; } catch (e) { name = 'Мой провайдер'; }
    }

    var apiFormat = normalizeFormat(body.apiFormat);
    var authType = normalizeAuth(body.authType, apiFormat);
    var extraHeaders = '';
    if (body.extraHeaders && typeof body.extraHeaders === 'object') {
        try { extraHeaders = JSON.stringify(body.extraHeaders); } catch (e) { extraHeaders = ''; }
        if (extraHeaders.length > 2000) return { error: 'Слишком много дополнительных заголовков' };
    }

    return {
        name: name,
        baseUrl: baseUrl,
        model: model,
        apiFormat: apiFormat,
        authType: authType,
        extraHeaders: extraHeaders,
        presetId: String(body.presetId || '').slice(0, 60)
    };
}

function configFromBody(body) {
    var cfg = null;
    if (body.id) {
        var row = getOne('SELECT * FROM providers WHERE id = ?', [Number(body.id)]);
        if (row) cfg = rowToConfig(row);
    }
    if (!cfg) {
        cfg = {
            name: 'Провайдер',
            baseUrl: '',
            url: '',
            model: '',
            apiKey: '',
            apiFormat: 'openai',
            authType: 'bearer',
            extraHeaders: {}
        };
    }
    if (typeof body.baseUrl === 'string' && body.baseUrl.trim()) cfg.baseUrl = body.baseUrl.trim();
    if (typeof body.model === 'string') cfg.model = body.model.trim();
    if (typeof body.apiKey === 'string' && body.apiKey.trim()) cfg.apiKey = body.apiKey.trim();
    if (body.apiFormat) cfg.apiFormat = normalizeFormat(body.apiFormat);
    if (body.authType) cfg.authType = normalizeAuth(body.authType, cfg.apiFormat);
    if (typeof body.name === 'string' && body.name.trim()) cfg.name = body.name.trim();
    cfg.url = buildChatUrl(cfg.baseUrl, cfg.apiFormat);
    return cfg;
}

/* ---------- Список ---------- */

router.get('/', (req, res) => {
    try {
        var providers = getAll('SELECT * FROM providers ORDER BY id DESC').map(publicProvider);
        res.json({ presets: PRESETS, providers: providers, activeId: activeId() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/* ---------- Создание ---------- */

router.post('/', (req, res) => {
    var body = req.body || {};
    var valid = validatePayload(body);
    if (valid.error) return res.status(400).json({ error: valid.error });

    try {
        runQuery(
            'INSERT INTO providers (name, base_url, api_key, model, api_format, auth_type, extra_headers, preset_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [valid.name, valid.baseUrl, String(body.apiKey || ''), valid.model, valid.apiFormat, valid.authType, valid.extraHeaders, valid.presetId]
        );
        var created = getOne('SELECT * FROM providers ORDER BY id DESC LIMIT 1');
        if (body.setActive !== false) setActive(created.id);
        res.json({ provider: publicProvider(created), activeId: activeId() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/* ---------- Обновление ---------- */

router.put('/:id', (req, res) => {
    var id = Number(req.params.id);
    var row = getOne('SELECT * FROM providers WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Провайдер не найден' });

    var body = req.body || {};
    var merged = {
        name: body.name !== undefined ? body.name : row.name,
        baseUrl: body.baseUrl !== undefined ? body.baseUrl : row.base_url,
        model: body.model !== undefined ? body.model : row.model,
        apiFormat: body.apiFormat !== undefined ? body.apiFormat : row.api_format,
        authType: body.authType !== undefined ? body.authType : row.auth_type,
        presetId: body.presetId !== undefined ? body.presetId : row.preset_id,
        extraHeaders: body.extraHeaders !== undefined ? body.extraHeaders : undefined
    };
    var valid = validatePayload(merged);
    if (valid.error) return res.status(400).json({ error: valid.error });

    var apiKey = row.api_key || '';
    if (Object.prototype.hasOwnProperty.call(body, 'apiKey')) {
        apiKey = String(body.apiKey == null ? '' : body.apiKey);
    }
    var extraHeaders = valid.extraHeaders;
    if (extraHeaders === '' && body.extraHeaders === undefined) extraHeaders = row.extra_headers || '';

    try {
        runQuery(
            'UPDATE providers SET name = ?, base_url = ?, api_key = ?, model = ?, api_format = ?, auth_type = ?, extra_headers = ?, preset_id = ? WHERE id = ?',
            [valid.name, valid.baseUrl, apiKey, valid.model, valid.apiFormat, valid.authType, extraHeaders, valid.presetId, id]
        );
        if (body.setActive === true) setActive(id);
        var updated = getOne('SELECT * FROM providers WHERE id = ?', [id]);
        res.json({ provider: publicProvider(updated), activeId: activeId() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/* ---------- Удаление ---------- */

router.delete('/:id', (req, res) => {
    var id = Number(req.params.id);
    var row = getOne('SELECT id FROM providers WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Провайдер не найден' });
    try {
        runQuery('DELETE FROM providers WHERE id = ?', [id]);
        if (activeId() === id) clearActive();
        res.json({ ok: true, activeId: activeId() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/* ---------- Активация ---------- */

router.post('/:id/activate', (req, res) => {
    var id = Number(req.params.id);
    var row = getOne('SELECT id FROM providers WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Провайдер не найден' });
    try {
        setActive(id);
        res.json({ ok: true, activeId: id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/* ---------- Проверка подключения ---------- */

router.post('/test', async (req, res) => {
    var cfg = configFromBody(req.body || {});
    try {
        var result = await testConfig(cfg);
        res.json(result);
    } catch (e) {
        res.json({ ok: false, error: e.message });
    }
});

/* ---------- Список моделей провайдера ---------- */

router.post('/models', async (req, res) => {
    var cfg = configFromBody(req.body || {});
    try {
        var models = await listModels(cfg);
        res.json({ ok: true, models: models });
    } catch (e) {
        res.json({ ok: false, error: e.message, models: [] });
    }
});

module.exports = router;
