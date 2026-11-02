/* settings-provider.js — подключение провайдера ИИ (локального или облачного) */
const SettingsProvider = (function () {
    'use strict';

    var FEATURED = ['openai', 'anthropic', 'gemini'];

    var root = null;
    var data = { presets: [], providers: [], activeId: null };
    var form = null;
    var testModels = null;
    var busy = null;
    var expanded = false;
    var deleteArmed = null;
    var deleteTimer = null;

    function esc(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function t(key) { return I18n.t(key); }

    function newForm(overrides) {
        return Object.assign({
            id: null,
            presetId: '',
            name: '',
            baseUrl: '',
            apiKey: '',
            model: '',
            apiFormat: 'openai',
            authType: 'bearer',
            hasKey: false,
            docs: '',
            keyHint: '',
            models: []
        }, overrides || {});
    }

    function findPreset(id) {
        for (var i = 0; i < data.presets.length; i++) {
            if (data.presets[i].id === id) return data.presets[i];
        }
        return null;
    }

    function fromPreset(preset) {
        return newForm({
            presetId: preset.id,
            name: preset.name,
            baseUrl: preset.baseUrl,
            model: preset.defaultModel || '',
            apiFormat: preset.apiFormat || 'openai',
            authType: preset.authType || 'bearer',
            docs: preset.docs || '',
            keyHint: preset.keyHint || '',
            models: preset.models || []
        });
    }

    function fromProvider(p) {
        var preset = findPreset(p.presetId);
        return newForm({
            id: p.id,
            presetId: p.presetId || '',
            name: p.name,
            baseUrl: p.baseUrl,
            model: p.model,
            apiFormat: p.apiFormat,
            authType: p.authType,
            hasKey: p.hasKey,
            docs: preset ? preset.docs : '',
            keyHint: preset ? preset.keyHint : '',
            models: preset ? (preset.models || []) : []
        });
    }

    function colorFor(p) {
        var preset = findPreset(p.presetId);
        return preset ? preset.color : '#888888';
    }

    function prettyUrl(url) {
        var s = String(url || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '');
        return s.length > 52 ? s.slice(0, 52) + '…' : s;
    }

    function mount(node) {
        root = node;
        root.innerHTML = '<div class="provider-loading">…</div>';
        load();
    }

    async function load() {
        try {
            data = await API.get('/api/providers');
        } catch (e) {
            root.innerHTML = '<div class="provider-status error">' + esc(e.message) + '</div>';
            return;
        }
        if (!form) {
            var active = null;
            for (var i = 0; i < data.providers.length; i++) {
                if (data.providers[i].id === data.activeId) { active = data.providers[i]; break; }
            }
            form = active ? fromProvider(active) : newForm();
        }
        render();
    }

    /* ============================================
       Разметка
       ============================================ */

    function render() {
        if (!root) return;
        var showForm = !!form.id || (!!form.presetId && form.presetId !== '');
        root.innerHTML =
            '<div class="provider-grid">' + presetTiles() + '</div>' +
            moreButton() +
            savedList() +
            (showForm
                ? '<div class="provider-form">' + formFields() + '</div>' +
                  '<div class="provider-hint">' + esc(t('provHint')) + '</div>'
                : '<div class="provider-empty">' + esc(t('provPick')) + '</div>');
        bind();
    }

    function moreButton() {
        if (data.presets.length <= FEATURED.length) return '';
        return '<button type="button" class="provider-more" id="prov-more-btn" aria-expanded="' + (expanded ? 'true' : 'false') + '">' +
            '<span>' + esc(expanded ? t('provCollapse') : t('provAll')) + '</span>' +
            '<span class="provider-more-count">' + data.presets.length + '</span>' +
            '<svg class="provider-more-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' +
        '</button>';
    }

    function presetTiles() {
        var list = expanded
            ? data.presets
            : data.presets.filter(function (p) { return FEATURED.indexOf(p.id) !== -1; });

        var html = list.map(function (p) {
            var selected = form.presetId === p.id;
            return '<button type="button" class="provider-tile' + (selected ? ' selected' : '') + '" data-preset="' + esc(p.id) + '" title="' + esc(p.baseUrl) + '">' +
                '<span class="provider-dot" style="background:' + esc(p.color || '#888888') + '"></span>' +
                '<span class="provider-tile-info">' +
                    '<span class="provider-tile-name">' + esc(p.name) + '</span>' +
                    '<span class="provider-tile-badge' + (p.local ? ' local' : '') + '">' + esc(p.local ? t('provLocal') : t('provCloud')) + '</span>' +
                '</span>' +
            '</button>';
        }).join('');

        if (expanded) {
            var customSelected = !form.presetId || form.presetId === 'custom';
            html += '<button type="button" class="provider-tile' + (customSelected ? ' selected' : '') + '" data-preset="custom">' +
                '<span class="provider-dot" style="background:#666666"></span>' +
                '<span class="provider-tile-info"><span class="provider-tile-name">' + esc(t('provCustom')) + '</span></span>' +
            '</button>';
        }
        return html;
    }

    function savedList() {
        if (!data.providers.length) return '';
        var rows = data.providers.map(function (p) {
            var isActive = p.id === data.activeId;
            var selected = p.id === form.id;
            return '<div class="provider-row' + (selected ? ' selected' : '') + '" data-open="' + p.id + '">' +
                '<span class="provider-dot" style="background:' + esc(colorFor(p)) + '"></span>' +
                '<span class="provider-row-main">' +
                    '<span class="provider-row-name">' + esc(p.name) +
                        (isActive ? ' <span class="provider-badge">' + esc(t('provActive')) + '</span>' : '') +
                    '</span>' +
                    '<span class="provider-row-sub">' + esc(p.model || '—') + ' · ' + esc(prettyUrl(p.baseUrl)) + '</span>' +
                '</span>' +
                (isActive ? '' : '<button type="button" class="btn btn-sm provider-use" data-use="' + p.id + '">' + esc(t('provUse')) + '</button>') +
                '<button type="button" class="provider-del" data-del="' + p.id + '" title="' + esc(t('provDelete')) + '" aria-label="' + esc(t('provDelete')) + '">&times;</button>' +
            '</div>';
        }).join('');
        return '<div class="settings-section-title provider-saved-title">' + esc(t('provSaved')) + '</div>' +
            '<div class="provider-saved">' + rows + '</div>';
    }

    function authOption(value, label, current) {
        return '<option value="' + esc(value) + '"' + (current === value ? ' selected' : '') + '>' + esc(label) + '</option>';
    }

    function formFields() {
        var isEdit = !!form.id;
        var keyPlaceholder = form.hasKey ? t('provKeyKeep') : (form.keyHint || 'sk-...');
        var models = (testModels || form.models || []);
        var datalist = models.map(function (m) {
            return '<option value="' + esc(m) + '"></option>';
        }).join('');

        return '' +
            (form.docs ? '<a class="provider-docs" href="' + esc(form.docs) + '" target="_blank" rel="noopener">' + esc(t('provDocs')) + ' ↗</a>' : '') +
            '<div class="provider-field">' +
                '<label for="prov-name">' + esc(t('provName')) + '</label>' +
                '<input class="settings-input" id="prov-name" maxlength="80" autocomplete="off" value="' + esc(form.name) + '">' +
            '</div>' +
            '<div class="provider-field">' +
                '<label for="prov-base">' + esc(t('provBaseUrl')) + '</label>' +
                '<input class="settings-input" id="prov-base" spellcheck="false" autocomplete="off" placeholder="https://api.openai.com/v1" value="' + esc(form.baseUrl) + '">' +
                '<span class="provider-field-hint">' + esc(t('provBaseUrlHint')) + '</span>' +
            '</div>' +
            '<div class="provider-field">' +
                '<label for="prov-key">' + esc(t('provApiKey')) + '</label>' +
                '<div class="provider-key-wrap">' +
                    '<input class="settings-input" id="prov-key" type="password" spellcheck="false" autocomplete="new-password" placeholder="' + esc(keyPlaceholder) + '" value="">' +
                    '<button type="button" class="provider-key-toggle" id="prov-key-toggle" aria-label="' + esc(t('provApiKey')) + '">' +
                        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
                    '</button>' +
                '</div>' +
                (form.hasKey ? '<span class="provider-field-hint">' + esc(t('provKeyKeep')) + '</span>' : '') +
            '</div>' +
            '<div class="provider-field">' +
                '<label for="prov-model">' + esc(t('provModel')) + '</label>' +
                '<div class="provider-model-row">' +
                    '<input class="settings-input" id="prov-model" list="prov-model-list" spellcheck="false" autocomplete="off" placeholder="gpt-4o-mini" value="' + esc(form.model) + '">' +
                    '<button type="button" class="btn btn-sm" id="prov-models-btn">' + esc(t('provModels')) + '</button>' +
                '</div>' +
                '<datalist id="prov-model-list">' + datalist + '</datalist>' +
            '</div>' +
            '<div class="provider-field-row">' +
                '<div class="provider-field">' +
                    '<label for="prov-format">' + esc(t('provFormat')) + '</label>' +
                    '<select class="settings-input" id="prov-format">' +
                        '<option value="openai"' + (form.apiFormat === 'openai' ? ' selected' : '') + '>' + esc(t('provFormatOpenai')) + '</option>' +
                        '<option value="anthropic"' + (form.apiFormat === 'anthropic' ? ' selected' : '') + '>' + esc(t('provFormatAnthropic')) + '</option>' +
                    '</select>' +
                '</div>' +
                '<div class="provider-field">' +
                    '<label for="prov-auth">' + esc(t('provAuth')) + '</label>' +
                    '<select class="settings-input" id="prov-auth">' +
                        authOption('bearer', 'Authorization: Bearer', form.authType) +
                        authOption('x-api-key', 'x-api-key', form.authType) +
                        authOption('api-key', 'api-key', form.authType) +
                    '</select>' +
                '</div>' +
            '</div>' +
            '<div class="provider-actions">' +
                '<button type="button" class="btn btn-sm" id="prov-test-btn">' + esc(t('provTest')) + '</button>' +
                '<button type="button" class="btn btn-primary btn-sm" id="prov-save-btn">' + esc(isEdit ? t('provUpdate') : t('provSave')) + '</button>' +
                (isEdit ? '<button type="button" class="btn btn-sm btn-danger" id="prov-delete-btn">' + esc(t('provDelete')) + '</button>' : '') +
            '</div>' +
            '<div class="provider-status" id="provider-status"></div>';
    }

    /* ============================================
       События
       ============================================ */

    function bind() {
        root.querySelectorAll('.provider-tile[data-preset]').forEach(function (tile) {
            tile.addEventListener('click', function () {
                var id = tile.getAttribute('data-preset');
                testModels = null;
                if (id === 'custom') {
                    form = newForm({ presetId: 'custom' });
                } else {
                    var preset = findPreset(id);
                    if (preset) form = fromPreset(preset);
                }
                render();
                var formEl = root.querySelector('.provider-form');
                if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        });

        var moreBtn = root.querySelector('#prov-more-btn');
        if (moreBtn) {
            moreBtn.addEventListener('click', function () {
                expanded = !expanded;
                render();
            });
        }

        root.querySelectorAll('.provider-row[data-open]').forEach(function (row) {
            row.addEventListener('click', function (e) {
                if (e.target.closest('[data-use], [data-del]')) return;
                var id = Number(row.getAttribute('data-open'));
                var p = null;
                for (var i = 0; i < data.providers.length; i++) {
                    if (data.providers[i].id === id) { p = data.providers[i]; break; }
                }
                if (!p) return;
                testModels = null;
                form = fromProvider(p);
                render();
            });
        });

        root.querySelectorAll('[data-use]').forEach(function (btn) {
            btn.addEventListener('click', async function (e) {
                e.stopPropagation();
                var id = Number(btn.getAttribute('data-use'));
                btn.disabled = true;
                try {
                    await API.post('/api/providers/' + id + '/activate', {});
                    data = await API.get('/api/providers');
                    var p = null;
                    for (var i = 0; i < data.providers.length; i++) {
                        if (data.providers[i].id === id) { p = data.providers[i]; break; }
                    }
                    if (p) form = fromProvider(p);
                    Toast.show(t('provSavedToast'), 'success');
                    render();
                } catch (err) {
                    btn.disabled = false;
                    Toast.show(err.message, 'error');
                }
            });
        });

        root.querySelectorAll('[data-del]').forEach(function (btn) {
            btn.addEventListener('click', async function (e) {
                e.stopPropagation();
                await deleteProvider(Number(btn.getAttribute('data-del')), btn);
            });
        });

        bindField('prov-name', 'name');
        bindField('prov-base', 'baseUrl');
        bindField('prov-key', 'apiKey');
        bindField('prov-model', 'model');

        var format = root.querySelector('#prov-format');
        if (format) {
            format.addEventListener('change', function () {
                form.apiFormat = format.value;
                if (form.apiFormat === 'anthropic') form.authType = 'x-api-key';
                var auth = root.querySelector('#prov-auth');
                if (auth) auth.value = form.authType;
            });
        }
        var auth = root.querySelector('#prov-auth');
        if (auth) auth.addEventListener('change', function () { form.authType = auth.value; });

        var keyToggle = root.querySelector('#prov-key-toggle');
        if (keyToggle) {
            keyToggle.addEventListener('click', function () {
                var input = root.querySelector('#prov-key');
                if (!input) return;
                input.type = input.type === 'password' ? 'text' : 'password';
            });
        }

        var testBtn = root.querySelector('#prov-test-btn');
        if (testBtn) testBtn.addEventListener('click', onTest);
        var modelsBtn = root.querySelector('#prov-models-btn');
        if (modelsBtn) modelsBtn.addEventListener('click', onModels);
        var saveBtn = root.querySelector('#prov-save-btn');
        if (saveBtn) saveBtn.addEventListener('click', onSave);
        var deleteBtn = root.querySelector('#prov-delete-btn');
        if (deleteBtn) deleteBtn.addEventListener('click', function () { deleteProvider(form.id, deleteBtn); });
    }

    function bindField(id, key) {
        var input = root.querySelector('#' + id);
        if (!input) return;
        input.addEventListener('input', function () { form[key] = input.value; });
    }

    function setStatus(message, type) {
        var el = root.querySelector('#provider-status');
        if (!el) return;
        el.textContent = message || '';
        el.className = 'provider-status' + (type ? ' ' + type : '');
    }

    function setBusy(which) {
        busy = which;
        var testBtn = root.querySelector('#prov-test-btn');
        var modelsBtn = root.querySelector('#prov-models-btn');
        var saveBtn = root.querySelector('#prov-save-btn');
        var deleteBtn = root.querySelector('#prov-delete-btn');
        if (testBtn) {
            testBtn.disabled = !!which;
            testBtn.textContent = which === 'test' ? t('provTesting') : t('provTest');
        }
        if (modelsBtn) {
            modelsBtn.disabled = !!which;
            modelsBtn.textContent = which === 'models' ? t('provModelsLoading') : t('provModels');
        }
        if (saveBtn) saveBtn.disabled = !!which;
        if (deleteBtn) deleteBtn.disabled = !!which;
    }

    function probePayload() {
        var payload = {
            baseUrl: form.baseUrl.trim(),
            model: form.model.trim(),
            apiFormat: form.apiFormat,
            authType: form.authType
        };
        if (form.apiKey) payload.apiKey = form.apiKey;
        else if (form.id) payload.id = form.id;
        return payload;
    }

    function updateDatalist() {
        var list = root.querySelector('#prov-model-list');
        if (!list) return;
        list.innerHTML = (testModels || []).map(function (m) {
            return '<option value="' + esc(m) + '"></option>';
        }).join('');
    }

    async function onTest() {
        if (busy) return;
        if (!form.baseUrl.trim()) return setStatus(t('provNeedUrl'), 'error');
        if (!form.model.trim()) return setStatus(t('provNeedModel'), 'error');
        setBusy('test');
        setStatus(t('provTesting'), '');
        try {
            var res = await API.post('/api/providers/test', probePayload());
            if (res.ok) {
                var extra = '';
                if (res.models && res.models.length) {
                    testModels = res.models;
                    updateDatalist();
                    extra = ' · ' + t('provModelsFound') + res.models.length;
                }
                setStatus(t('provTestOk') + ' · ' + (res.latencyMs || 0) + ' ms' + extra, 'ok');
            } else {
                setStatus(res.error || t('provTestFail'), 'error');
            }
        } catch (e) {
            setStatus(e.message, 'error');
        } finally {
            setBusy(null);
        }
    }

    async function onModels() {
        if (busy) return;
        if (!form.baseUrl.trim()) return setStatus(t('provNeedUrl'), 'error');
        setBusy('models');
        setStatus(t('provModelsLoading'), '');
        try {
            var res = await API.post('/api/providers/models', probePayload());
            if (res.ok) {
                testModels = res.models || [];
                updateDatalist();
                setStatus(t('provModelsFound') + testModels.length, 'ok');
            } else {
                setStatus(res.error || t('provTestFail'), 'error');
            }
        } catch (e) {
            setStatus(e.message, 'error');
        } finally {
            setBusy(null);
        }
    }

    async function onSave() {
        if (busy) return;
        var baseUrl = form.baseUrl.trim();
        var model = form.model.trim();
        if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) return setStatus(t('provNeedUrl'), 'error');
        if (!model) return setStatus(t('provNeedModel'), 'error');

        setBusy('save');
        setStatus('', '');
        var payload = {
            name: form.name.trim(),
            baseUrl: baseUrl,
            model: model,
            apiFormat: form.apiFormat,
            authType: form.authType,
            presetId: form.presetId || '',
            setActive: true
        };
        if (form.apiKey) payload.apiKey = form.apiKey;

        try {
            var res;
            if (form.id) res = await API.put('/api/providers/' + form.id, payload);
            else res = await API.post('/api/providers', payload);

            data = await API.get('/api/providers');
            var saved = null;
            for (var i = 0; i < data.providers.length; i++) {
                if (data.providers[i].id === res.provider.id) { saved = data.providers[i]; break; }
            }
            form = saved ? fromProvider(saved) : form;
            testModels = null;
            Toast.show(t('provSavedToast'), 'success');
            render();
        } catch (e) {
            setStatus(e.message, 'error');
            setBusy(null);
        }
    }

    async function deleteProvider(id, btn) {
        if (!id) return;
        if (deleteArmed !== id) {
            deleteArmed = id;
            if (btn) {
                btn.classList.add('armed');
                if (btn.id === 'prov-delete-btn') btn.textContent = t('provDeleteConfirm');
            }
            clearTimeout(deleteTimer);
            deleteTimer = setTimeout(function () {
                deleteArmed = null;
                render();
            }, 3000);
            return;
        }

        clearTimeout(deleteTimer);
        deleteArmed = null;
        try {
            await API.del('/api/providers/' + id);
            Toast.show(t('provDeletedToast'), 'success');
            data = await API.get('/api/providers');
            var active = null;
            for (var i = 0; i < data.providers.length; i++) {
                if (data.providers[i].id === data.activeId) { active = data.providers[i]; break; }
            }
            form = active ? fromProvider(active) : newForm();
            testModels = null;
            render();
        } catch (e) {
            Toast.show(e.message, 'error');
            render();
        }
    }

    return { mount: mount };
})();
