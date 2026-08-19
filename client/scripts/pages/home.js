/* home.js — главная страница с sidebar */
const HomePage = (function () {
    'use strict';

    function getHints() { return [I18n.t('hint1'), I18n.t('hint2'), I18n.t('hint3'), I18n.t('hint4'), I18n.t('hint5'), I18n.t('hint6')]; }
    var hintIndex = 0;
    var hintTimer = null;
    var loadingAnimFrame = null;
    var _docClickHandlers = [];

    var topicSuggestions = [
        { group: 'Физика', items: ['Квантовая физика', 'Термодинамика', 'Электромагнетизм', 'Астрофизика'] },
        { group: 'Информатика', items: ['Машинное обучение', 'Алгоритмы и структуры данных', 'Нейронные сети', 'Кибербезопасность'] },
        { group: 'Математика', items: ['Линейная алгебра', 'Теория вероятностей', 'Математический анализ'] },
        { group: 'Другое', items: ['Философия', 'История Древнего Рима', 'Биоинформатика'] }
    ];

    function render() {
        document.body.style.overflow = 'hidden';
        var t = I18n.t;
        var content = document.getElementById('app-content');
        content.innerHTML = `
            <div class="home-layout">
                <aside class="home-sidebar" id="home-sidebar">
                    <div class="sidebar-header">
                        <div class="sidebar-header-left">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            <span>${t('menuHistory')}</span>
                        </div>
                        <select class="sidebar-sort" id="sidebar-sort">
                            <option value="date-desc">${t('sortDateDesc') || '↓ Дата'}</option>
                            <option value="date-asc">${t('sortDateAsc') || '↑ Дата'}</option>
                            <option value="name-asc">${t('sortNameAsc') || '↑ Имя'}</option>
                            <option value="name-desc">${t('sortNameDesc') || '↓ Имя'}</option>
                        </select>
                    </div>
                    <div class="sidebar-stats" id="sidebar-stats"></div>
                    <div class="sidebar-list" id="sidebar-list">
                        <div class="sidebar-empty">${t('historyEmpty')}</div>
                    </div>
                    <div class="sidebar-footer">
                        <button class="sidebar-settings-btn" id="sidebar-delete-all" title="${t('deleteAll') || 'Удалить все'}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            <span>${t('deleteAll') || 'Удалить все'}</span>
                        </button>
                        <button class="sidebar-settings-btn" id="sidebar-settings">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                            <span>${t('menuSettings')}</span>
                        </button>
                    </div>
                </aside>
                <div class="home-main">
                    <div class="auth-page">
                        <div class="auth-card" style="background:transparent; border:none;">
                            <h1 class="auth-title">${t('homeTitle')}</h1>
                            <p class="auth-subtitle" id="home-subtitle">${t('homeSubtitle')}</p>
                            <div class="home-input-row">
                                <input type="text" class="input-field" id="home-topic-input" placeholder="${t('inputPlaceholder')}" autocomplete="off" style="border:none; background:transparent; flex:1; min-width:0; font-size:15px; padding:12px 16px;">
                                <div style="position:relative; display:flex; align-items:center;">
                                    <button id="home-suggest-btn" style="background:none; border:none; color:#555; padding:12px 14px; cursor:pointer; display:flex; align-items:center;">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                                    </button>
                                    <div id="home-suggest-dropdown" class="header-dropdown hidden"></div>
                                </div>
                                <button class="btn btn-primary" id="home-generate-btn" style="flex-shrink:0; padding:10px 24px; font-size:14px;">${t('buildBtn')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div id="home-loading" class="loading-overlay hidden">
                <div class="loading-panel">
                    <div id="home-loading-checklist" class="loading-checklist">
                        <div class="loading-step" id="hl-step-0">
                            <div class="loading-step-icon"></div>
                            <span>${t('stepCheck') || 'Проверка темы'}</span>
                        </div>
                        <div class="loading-step" id="hl-step-1">
                            <div class="loading-step-icon"></div>
                            <span>${t('stepGenerate') || 'Генерация дерева'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        buildSuggestDropdown();
        bindEvents();
        startHints();
        loadSidebarHistory();
    }

    function buildSuggestDropdown() {
        var dd = document.getElementById('home-suggest-dropdown');
        var html = '';
        topicSuggestions.forEach(function (group) {
            html += '<div style="padding:4px 0; border-bottom:1px solid var(--border-dim);">';
            html += '<div style="font-size:9px; font-weight:600; color:var(--accent); text-transform:uppercase; letter-spacing:1px; padding:6px 12px 2px;">' + group.group + '</div>';
            group.items.forEach(function (item) {
                html += '<button class="header-dropdown-item home-suggest-item" data-topic="' + item + '">' + item + '</button>';
            });
            html += '</div>';
        });
        dd.innerHTML = html;
        dd.querySelectorAll('.home-suggest-item').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.getElementById('home-topic-input').value = btn.getAttribute('data-topic');
                dd.classList.add('hidden');
                document.getElementById('home-topic-input').focus();
            });
        });
    }

    function bindEvents() {
        _docClickHandlers.forEach(function (h) { document.removeEventListener('click', h); });
        _docClickHandlers = [];

        document.getElementById('home-generate-btn').addEventListener('click', handleGenerate);
        document.getElementById('home-topic-input').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') handleGenerate();
        });

        var suggestBtn = document.getElementById('home-suggest-btn');
        var suggestDd = document.getElementById('home-suggest-dropdown');
        suggestBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            suggestDd.classList.toggle('hidden');
        });
        var closeSuggestHandler = function (e) {
            if (!suggestDd.contains(e.target) && e.target !== suggestBtn) suggestDd.classList.add('hidden');
        };
        document.addEventListener('click', closeSuggestHandler);
        _docClickHandlers.push(closeSuggestHandler);

        document.getElementById('sidebar-settings').addEventListener('click', function () {
            window.location.hash = '#/settings';
        });
        var delAllBtn = document.getElementById('sidebar-delete-all');
        if (delAllBtn) delAllBtn.addEventListener('click', function () { deleteAllTrees(); });
        document.getElementById('sidebar-sort').addEventListener('change', function () {
            _sortMode = this.value;
            loadSidebarHistory();
        });
    }

    /* ============================================
       Sidebar History
       ============================================ */

    var _sortMode = 'date-desc';

    async function loadSidebarHistory() {
        var t = I18n.t;
        var listEl = document.getElementById('sidebar-list');
        if (!listEl) return;
        try {
            var data = await API.get('/api/trees');
            if (!data.trees || data.trees.length === 0) {
                var cached = JSON.parse(localStorage.getItem('kg_cache') || '[]');
                if (cached.length > 0) {
                    listEl.innerHTML = '';
                    cached.forEach(function (c) {
                        var item = document.createElement('button');
                        item.className = 'sidebar-item';
                        var dateStr = c.date ? new Date(c.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '';
                        item.innerHTML = '<div class="sidebar-item-info"><span class="sidebar-item-name">' + (c.topic || '—') + '</span>' +
                            (dateStr ? '<span class="sidebar-item-date">' + dateStr + '</span>' : '') + '</div>';
                        item.addEventListener('click', function () { showGraph(c.data, c.topic); });
                        listEl.appendChild(item);
                    });
                } else {
                    listEl.innerHTML = '<div class="sidebar-empty">' + t('historyEmpty') + '</div>';
                }
                return;
            }
            var trees = data.trees.slice();
            if (_sortMode === 'date-desc') trees.sort(function (a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });
            else if (_sortMode === 'date-asc') trees.sort(function (a, b) { return (a.created_at || '').localeCompare(b.created_at || ''); });
            else if (_sortMode === 'name-asc') trees.sort(function (a, b) { return (a.topic || a.name || '').localeCompare(b.topic || b.name || ''); });
            else if (_sortMode === 'name-desc') trees.sort(function (a, b) { return (b.topic || b.name || '').localeCompare(a.topic || a.name || ''); });
            listEl.innerHTML = '';
            trees.forEach(function (tree) {
                var item = document.createElement('div');
                item.className = 'sidebar-item-row';
                var btn = document.createElement('button');
                btn.className = 'sidebar-item';
                var dateStr = tree.created_at ? new Date(tree.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '';
                btn.innerHTML = '<div class="sidebar-item-info"><span class="sidebar-item-name">' + (tree.name || tree.topic || '—') + '</span>' +
                    (dateStr ? '<span class="sidebar-item-date">' + dateStr + '</span>' : '') + '</div>';
                btn.addEventListener('click', function () {
                    try {
                        var gd = typeof tree.graph_data === 'string' ? JSON.parse(tree.graph_data) : tree.graph_data;
                        showGraph(gd, tree.topic || tree.name);
                    } catch (e) { Toast.show(t('loadError'), 'error'); }
                });
                var delBtn = document.createElement('button');
                delBtn.className = 'sidebar-item-delete';
                delBtn.innerHTML = '&times;';
                delBtn.title = t('delete') || 'Удалить';
                delBtn.addEventListener('click', function (e) { e.stopPropagation(); deleteTree(tree.id); });
                item.appendChild(btn);
                item.appendChild(delBtn);
                listEl.appendChild(item);
            });
            var statsEl = document.getElementById('sidebar-stats');
            if (statsEl) {
                statsEl.textContent = data.trees.length + ' ' + (t('treesCount') || 'деревьев');
            }
        } catch (err) {
            var cached2 = JSON.parse(localStorage.getItem('kg_cache') || '[]');
            if (cached2.length > 0) {
                listEl.innerHTML = '';
                cached2.forEach(function (c) {
                    var item = document.createElement('button');
                    item.className = 'sidebar-item';
                    item.innerHTML = '<div class="sidebar-item-info"><span class="sidebar-item-name">' + (c.topic || '—') + '</span></div>';
                    item.addEventListener('click', function () { showGraph(c.data, c.topic); });
                    listEl.appendChild(item);
                });
            } else {
                listEl.innerHTML = '<div class="sidebar-empty">' + t('errorPrefix') + err.message + '</div>';
            }
        }
    }

    /* ============================================
       Ghost Card Animation — Background
       ============================================ */

    /* ============================================
       Hints
       ============================================ */

    function startHints() {
        var hints = getHints();
        hintIndex = Math.floor(Math.random() * hints.length);
        var el = document.getElementById('home-subtitle');
        if (el) el.textContent = hints[hintIndex];

        hintTimer = setInterval(function () {
            var hints = getHints();
            hintIndex = (hintIndex + 1) % hints.length;
            var el = document.getElementById('home-subtitle');
            if (!el) { clearInterval(hintTimer); return; }
            el.classList.add('hint-fade-out');
            setTimeout(function () {
                el.textContent = hints[hintIndex];
                el.classList.remove('hint-fade-out');
                el.classList.add('hint-fade-in');
                setTimeout(function () { el.classList.remove('hint-fade-in'); }, 600);
            }, 400);
        }, 3500);
    }

    /* ============================================
       Generate
       ============================================ */

    async function handleGenerate() {
        var t = I18n.t;
        var input = document.getElementById('home-topic-input');
        var topic = input.value.trim();
        if (!topic) { Toast.show(t('inputEmpty'), 'error'); return; }

        if (!LLM.isConfigured()) {
            Toast.show(t('llmNotConfigured') || 'Введите API-ключ и модель в настройках', 'error');
            return;
        }

        var btn = document.getElementById('home-generate-btn');
        btn.disabled = true;
        clearInterval(hintTimer);

        var subtitle = document.getElementById('home-subtitle');
        subtitle.textContent = t('generating') + topic + '\u00BB';
        subtitle.style.opacity = '1';

        showLoading();

        try {
            // Шаг 1: web-search на сервере
            setStepState(0, 'active');
            var searchData = await API.post('/api/search', { topic: topic }, { timeout: 30000 });
            setStepState(0, 'done');

            // Шаг 2: генерация через LLM из браузера
            setStepState(1, 'active');

            var searchContext = '';
            if (searchData && searchData.results && searchData.results.length > 0) {
                searchContext = '\n\nАктуальная информация из интернета:\n' + searchData.results.map(function (r, i) { return (i + 1) + '. ' + r; }).join('\n');
            }

            var userPrompt = 'Дерево знаний по теме «' + topic + '», 12-15 узлов.\n' +
                'Используй факты из предоставленной информации. Если информации нет — используй свои знания.\n' +
                searchContext + '\n\n' +
                'Каждый узел:\n' +
                '{\n' +
                '  "id": "id",\n' +
                '  "label": "Название",\n' +
                '  "description": "Что это. 3-5 предложений, простым ясным языком, без воды.",\n' +
                '  "why": "Зачем учить. Конкретная польза. 1-2 предложения.",\n' +
                '  "difficulty": 1-5,\n' +
                '  "time": "время изучения",\n' +
                '  "level": 1-3,\n' +
                '  "leadsTo": ["id"]\n' +
                '}\n\n' +
                'Только JSON:\n' +
                '{"nodes":[...],"edges":[{"source":"id","target":"id"}]}\n\n' +
                '- id — латиница без пробелов\n' +
                '- level: 1=базовый, 2=средний, 3=продвинутый\n' +
                '- difficulty: 1=легко, 3=средне, 5=сложно\n' +
                '- leadsTo — куда ведёт тема\n' +
                '- 12-15 узлов минимум';

            var raw = await LLM.call([
                { role: 'system', content: 'Ты помогаешь строить карту знаний. Отвечай ТОЛЬКО валидным JSON без markdown, без пояснений, без кодбеков.' },
                { role: 'user', content: userPrompt }
            ], { temperature: 0.3, max_tokens: 8192 });

            var cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
            var graphData;
            try {
                graphData = JSON.parse(cleaned);
            } catch (e) {
                graphData = tryRepairJson(cleaned);
                if (!graphData) throw new Error(t('jsonError'));
            }

            if (!graphData.nodes || !Array.isArray(graphData.nodes) || !graphData.edges || !Array.isArray(graphData.edges)) {
                throw new Error(t('noNodesEdges'));
            }

            graphData.nodes = graphData.nodes.map(function (n) {
                return {
                    id: String(n.id),
                    label: n.label || 'Без названия',
                    description: (n.description || '').replace(/\*\*/g, '').replace(/\*/g, '').trim(),
                    why: (n.why || '').replace(/\*\*/g, '').replace(/\*/g, '').trim(),
                    difficulty: Math.min(5, Math.max(1, parseInt(n.difficulty, 10) || 3)),
                    time: n.time || '',
                    level: Math.min(3, Math.max(1, parseInt(n.level, 10) || 1)),
                    leadsTo: Array.isArray(n.leadsTo) ? n.leadsTo.map(String) : []
                };
            });

            graphData.edges = graphData.edges
                .filter(function (e) { return e.source && e.target; })
                .map(function (e) { return { source: String(e.source), target: String(e.target) }; });

            var nodeIds = new Set(graphData.nodes.map(function (n) { return n.id; }));
            graphData.edges = graphData.edges.filter(function (e) { return nodeIds.has(e.source) && nodeIds.has(e.target); });

            setStepState(1, 'done');
            await delay(400);

            if (graphData.nodes.length < 2) {
                throw new Error(t('tooFewData'));
            }
            hideLoading();
            showGraph(graphData, topic);
        } catch (err) {
            hideLoading();
            Toast.show(err.message, 'error');
            subtitle.textContent = t('homeSubtitle');
            startHints();
        } finally {
            btn.disabled = false;
        }
    }

    function tryRepairJson(text) {
        try {
            var nodesMatch = text.match(/"nodes"\s*:\s*\[([\s\S]*)/);
            if (!nodesMatch) return null;
            var chunk = '[' + nodesMatch[1];
            var openBraces = (chunk.match(/{/g) || []).length;
            var closeBraces = (chunk.match(/}/g) || []).length;
            chunk += '}'.repeat(Math.max(0, openBraces - closeBraces));
            chunk += ']';
            var nodes = [];
            var re = /\{[^{}]*"id"\s*:\s*"([^"]+)"[^{}]*"label"\s*:\s*"([^"]*)"[^{}]*\}/g;
            var m;
            while ((m = re.exec(chunk)) !== null) {
                try { nodes.push(JSON.parse(m[0])); } catch (_) {}
            }
            if (nodes.length === 0) return null;
            var edges = [];
            nodes.forEach(function (n) {
                (n.leadsTo || []).forEach(function (target) {
                    if (nodes.find(function (x) { return x.id === target; })) {
                        edges.push({ source: n.id, target: target });
                    }
                });
            });
            return { nodes: nodes, edges: edges };
        } catch (_) { return null; }
    }

    /* ============================================
       Graph View
       ============================================ */

    function showGraph(graphData, topic) {
        var t = I18n.t;
        document.body.style.overflow = 'hidden';
        var content = document.getElementById('app-content');
        content.innerHTML = `
            <div id="top-bar" class="app-header" style="z-index:40;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <button class="btn btn-sm" id="graph-back">
                        ${t('graphBack')}
                    </button>
                    <span style="font-size:13px; color:var(--text-secondary); font-weight:500;">${topic}</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                    <input type="text" id="graph-search" class="graph-search-input" placeholder="${t('graphSearch') || 'Поиск...'}" autocomplete="off">
                    <button class="btn btn-sm" id="graph-pdf" title="PDF">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    </button>
                    <button class="btn btn-sm" id="graph-save">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                        ${t('graphSave')}
                    </button>
                </div>
            </div>
            <div id="graph-container"></div>
        `;

        document.getElementById('graph-back').addEventListener('click', function () {
            var container = document.getElementById('graph-container');
            var topbar = document.getElementById('top-bar');
            if (container) container.style.opacity = '0';
            if (topbar) topbar.style.opacity = '0';
            setTimeout(function () { document.body.style.overflow = 'auto'; render(); }, 300);
        });
        document.getElementById('graph-save').addEventListener('click', async function () {
            var btn = this;
            var name = prompt(t('saveTreePrompt'));
            if (!name) return;
            btn.disabled = true;
            try {
                await API.post('/api/trees', { name: name, graph_data: graphData, topic: topic });
                saveToCache(topic, graphData);
                Toast.show(t('saveTreeSuccess'), 'success');
                loadSidebarHistory();
            } catch (err) {
                saveToCache(topic, graphData);
                Toast.show(t('saveTreeSuccess'), 'success');
            } finally {
                btn.disabled = false;
            }
        });
        document.getElementById('graph-pdf').addEventListener('click', function () {
            if (window._graphExportPdf) window._graphExportPdf();
        });
        var searchInput = document.getElementById('graph-search');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                if (window._graphSearch) window._graphSearch(searchInput.value.trim());
            });
        }

        GraphRenderer.renderGraph(graphData, topic);
    }

    /* ============================================
       Loading
       ============================================ */

    function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    function showLoading() {
        var el = document.getElementById('home-loading');
        el.classList.remove('hidden');
        setStepState(0, 'pending');
        setStepState(1, 'pending');
    }

    function setStepState(index, state) {
        var el = document.getElementById('hl-step-' + index);
        if (!el) return;
        el.classList.remove('pending', 'active', 'done', 'error');
        el.classList.add(state);
    }

    function hideLoading() {
        if (loadingAnimFrame) { clearTimeout(loadingAnimFrame); loadingAnimFrame = null; }
        var el = document.getElementById('home-loading');
        if (el) el.classList.add('hidden');
    }

    /* ============================================
       Cache / Offline
       ============================================ */

    function saveToCache(topic, graphData) {
        try {
            var cache = JSON.parse(localStorage.getItem('kg_cache') || '[]');
            cache.unshift({ topic: topic, data: graphData, date: Date.now() });
            if (cache.length > 20) cache = cache.slice(0, 20);
            localStorage.setItem('kg_cache', JSON.stringify(cache));
        } catch (e) {}
    }

    function getFromCache(topic) {
        try {
            var cache = JSON.parse(localStorage.getItem('kg_cache') || '[]');
            return cache.find(function (c) { return c.topic === topic; });
        } catch (e) { return null; }
    }

    /* ============================================
       Delete Tree
       ============================================ */

    async function deleteTree(id) {
        var t = I18n.t;
        if (!confirm(t('confirmDelete') || 'Удалить дерево?')) return;
        try {
            await API.del('/api/trees/' + id);
            Toast.show(t('deleteSuccess') || 'Удалено', 'success');
            loadSidebarHistory();
        } catch (err) {
            Toast.show(err.message, 'error');
        }
    }

    async function deleteAllTrees() {
        var t = I18n.t;
        if (!confirm(t('confirmDeleteAll') || 'Удалить ВСЕ деревья?')) return;
        try {
            await API.del('/api/trees');
            Toast.show(t('deleteSuccess') || 'Удалено', 'success');
            loadSidebarHistory();
        } catch (err) {
            Toast.show(err.message, 'error');
        }
    }

    return { render: render };
})();
