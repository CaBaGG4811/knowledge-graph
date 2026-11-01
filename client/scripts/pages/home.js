/* home.js — главная страница с sidebar и ghost-анимациями */
const HomePage = (function () {
    'use strict';

    function getHints() { return [I18n.t('hint1'), I18n.t('hint2'), I18n.t('hint3'), I18n.t('hint4'), I18n.t('hint5'), I18n.t('hint6')]; }
    var hintIndex = 0;
    var hintTimer = null;
    var loadingAnimFrame = null;
    var ghostTimer = null;
    var _docClickHandlers = [];

    var topicSuggestions = [
        { group: 'Физика', items: ['Квантовая физика', 'Термодинамика', 'Электромагнетизм', 'Астрофизика'] },
        { group: 'Информатика', items: ['Машинное обучение', 'Алгоритмы и структуры данных', 'Нейронные сети', 'Кибербезопасность'] },
        { group: 'Математика', items: ['Линейная алгебра', 'Теория вероятностей', 'Математический анализ'] },
        { group: 'Другое', items: ['Философия', 'История Древнего Рима', 'Биоинформатика'] }
    ];

    var ghostTopics = [
        'Нейронные сети', 'Квантовая физика', 'Машинное обучение', 'Термодинамика',
        'Кибербезопасность', 'Линейная алгебра', 'Астрофизика', 'Биоинформатика',
        'Алгоритмы', 'Электромагнетизм', 'Философия', 'Теория вероятностей'
    ];

    function render() {
        document.body.style.overflow = 'hidden';
        var t = I18n.t;
        var content = document.getElementById('app-content');
        content.innerHTML = `
            <div class="home-layout">
                <aside class="home-sidebar" id="home-sidebar">
                    <div class="side-menu">
                        <button class="side-btn" id="side-search-btn" title="${t('menuSearchChats')}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <span>${t('menuSearchChats')}</span>
                        </button>
                        <button class="side-btn" id="side-library-btn" title="${t('menuLibrary')}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                            <span>${t('menuLibrary')}</span>
                            <svg class="side-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                        <div class="side-library-panel hidden" id="side-library-panel">
                            <div class="side-lib-carousel-wrapper">
                                <button class="side-lib-nav left" id="side-lib-nav-left" aria-label="‹">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                                </button>
                                <div class="side-library-track" id="side-library-track">
                                    <div class="side-lib-empty">${t('libraryEmpty')}</div>
                                </div>
                                <button class="side-lib-nav right" id="side-lib-nav-right" aria-label="›">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="sidebar-list" id="sidebar-list">
                        <div class="sidebar-empty">${t('historyEmpty')}</div>
                    </div>
                    <div class="sidebar-footer">
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
            <div id="ghost-canvas" class="ghost-canvas"></div>
            <div id="home-loading" class="loading-overlay hidden">
                <div class="loading-panel">
                    <div id="home-loading-tip" class="loading-tip"></div>
                    <div id="home-loading-checklist" class="loading-checklist"></div>
                </div>
            </div>
        `;

        buildSuggestDropdown();
        bindEvents();
        startHints();
        loadSidebarHistory();
        startGhostAnimation();
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

        // ——— боковая панель: поиск чатов ———
        document.getElementById('side-search-btn').addEventListener('click', function () {
            openSearchModal();
        });

        // ——— боковая панель: моё творчество ———
        var libraryBtn = document.getElementById('side-library-btn');
        libraryBtn.addEventListener('click', function () {
            var panel = document.getElementById('side-library-panel');
            var willOpen = panel.classList.contains('hidden');
            panel.classList.toggle('hidden');
            libraryBtn.classList.toggle('open', willOpen);
            if (willOpen) loadLibrary();
        });

        var track = document.getElementById('side-library-track');
        var navLeft = document.getElementById('side-lib-nav-left');
        var navRight = document.getElementById('side-lib-nav-right');
        if (track && navLeft && navRight) {
            navLeft.addEventListener('click', function () {
                track.scrollBy({ left: -170, behavior: 'smooth' });
            });
            navRight.addEventListener('click', function () {
                track.scrollBy({ left: 170, behavior: 'smooth' });
            });
            track.addEventListener('scroll', updateLibraryNav);
            window.addEventListener('resize', updateLibraryNav);
        }
    }

    function updateLibraryNav() {
        var track = document.getElementById('side-library-track');
        var navLeft = document.getElementById('side-lib-nav-left');
        var navRight = document.getElementById('side-lib-nav-right');
        if (!track || !navLeft || !navRight) return;
        var scrollable = track.scrollWidth > track.clientWidth + 4;
        navLeft.classList.toggle('visible', scrollable && track.scrollLeft > 4);
        navRight.classList.toggle('visible', scrollable && track.scrollLeft < track.scrollWidth - track.clientWidth - 4);
    }

    /* ============================================
       Модальный поиск: чаты + карточки
       ============================================ */

    var searchData = null;
    var searchHistory = null;
    var searchTimer = null;

    function getSearchHistory() {
        if (searchHistory === null) {
            try { searchHistory = JSON.parse(localStorage.getItem('kg_search_history') || '[]'); }
            catch (e) { searchHistory = []; }
            if (!Array.isArray(searchHistory)) searchHistory = [];
        }
        return searchHistory;
    }

    function rememberQuery(q) {
        if (!q) return;
        var h = getSearchHistory();
        h = h.filter(function (x) { return x !== q; });
        h.unshift(q);
        searchHistory = h.slice(0, 8);
        try { localStorage.setItem('kg_search_history', JSON.stringify(searchHistory)); } catch (e) {}
    }

    function ensureSearchOverlay() {
        if (document.getElementById('search-overlay')) return;
        var overlay = document.createElement('div');
        overlay.id = 'search-overlay';
        overlay.className = 'search-overlay hidden';
        var t = I18n.t;
        overlay.innerHTML =
            '<div class="search-backdrop"></div>' +
            '<div class="search-modal">' +
                '<div class="search-input-row">' +
                    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
                    '<input type="text" id="search-modal-input" class="search-modal-input" placeholder="' + escapeHtml(t('searchChatsPlaceholder')) + '" autocomplete="off">' +
                '</div>' +
                '<div class="search-results" id="search-modal-results"></div>' +
            '</div>';
        document.body.appendChild(overlay);

        var input = overlay.querySelector('#search-modal-input');
        input.addEventListener('input', function () {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(function () { runSearch(input.value.trim().toLowerCase()); }, 180);
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') rememberQuery(input.value.trim());
            if (e.key === 'Escape') { e.stopPropagation(); closeSearchModal(); }
        });
        overlay.querySelector('.search-backdrop').addEventListener('click', closeSearchModal);
    }

    function openSearchModal() {
        ensureSearchOverlay();
        var overlay = document.getElementById('search-overlay');
        var input = document.getElementById('search-modal-input');
        var results = document.getElementById('search-modal-results');
        overlay.classList.remove('hidden');
        input.value = '';
        results.innerHTML = '<div class="search-empty"><div class="modal-spinner"></div></div>';
        input.focus();
        loadSearchData();
    }

    function closeSearchModal() {
        var overlay = document.getElementById('search-overlay');
        if (overlay) overlay.classList.add('hidden');
    }

    async function loadSearchData() {
        try {
            var items = await Promise.all([API.get('/api/trees'), API.get('/api/cards')]);
            searchData = {
                trees: (items[0] && items[0].trees) || [],
                cards: (items[1] && items[1].cards) || []
            };
        } catch (err) {
            searchData = { trees: [], cards: [], error: err.message };
        }
        var input = document.getElementById('search-modal-input');
        var q = input ? input.value.trim().toLowerCase() : '';
        if (q) { runSearch(q); } else { renderSearchHistory(); }
    }

    function fadeSwapSearch(renderFn) {
        var results = document.getElementById('search-modal-results');
        if (!results) return;
        results.classList.add('search-fading');
        setTimeout(function () {
            renderFn();
            results.classList.remove('search-fading');
        }, 150);
    }

    function runSearch(q) {
        if (!q) {
            fadeSwapSearch(renderSearchHistory);
            return;
        }
        fadeSwapSearch(function () { renderSearchResults(q); });
    }

    function renderSearchHistory() {
        var t = I18n.t;
        var results = document.getElementById('search-modal-results');
        if (!results) return;
        var h = getSearchHistory();
        if (!h.length) {
            results.innerHTML = '<div class="search-empty">' + escapeHtml(t('searchHistoryEmpty')) + '</div>';
            return;
        }
        results.innerHTML = '<div class="search-group-title">' + escapeHtml(t('searchHistoryTitle') || '') + '</div>';
        h.forEach(function (q) {
            var row = document.createElement('button');
            row.className = 'search-row';
            row.innerHTML =
                '<svg class="search-row-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
                '<span class="search-row-text">' + escapeHtml(q) + '</span>';
            row.addEventListener('click', function () {
                var input = document.getElementById('search-modal-input');
                input.value = q;
                input.focus();
                rememberQuery(q);
                fadeSwapSearch(function () { renderSearchResults(q.toLowerCase()); });
            });
            results.appendChild(row);
        });
    }

    function addSearchGroupTitle(resultsEl, title) {
        var el = document.createElement('div');
        el.className = 'search-group-title';
        el.textContent = title;
        resultsEl.appendChild(el);
    }

    function renderSearchResults(q) {
        var t = I18n.t;
        var results = document.getElementById('search-modal-results');
        if (!results) return;
        if (!searchData) {
            results.innerHTML = '<div class="search-empty"><div class="modal-spinner"></div></div>';
            return;
        }
        if (searchData.error) {
            results.innerHTML = '<div class="search-empty">' + escapeHtml(t('errorPrefix') + searchData.error) + '</div>';
            return;
        }

        var foundTrees = searchData.trees.filter(function (tree) {
            var name = String(tree.name || tree.topic || '').toLowerCase();
            var topic = String(tree.topic || '').toLowerCase();
            return name.indexOf(q) !== -1 || topic.indexOf(q) !== -1;
        });
        var foundCards = searchData.cards.filter(function (card) {
            var hay = (String(card.label || '') + ' ' + String(card.description || '') + ' ' + String(card.topic || '')).toLowerCase();
            return hay.indexOf(q) !== -1;
        });

        if (!foundTrees.length && !foundCards.length) {
            results.innerHTML = '<div class="search-empty">' + escapeHtml(t('searchChatsEmpty')) + '</div>';
            return;
        }

        var clockSvg = '<svg class="search-row-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
        var cardSvg = '<svg class="search-row-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="13" y2="15"/></svg>';

        if (foundTrees.length) {
            addSearchGroupTitle(results, t('searchGroupChats'));
            foundTrees.forEach(function (tree) {
                var row = document.createElement('button');
                row.className = 'search-row';
                var dateStr = tree.created_at ? new Date(tree.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '';
                row.innerHTML = clockSvg +
                    '<span class="search-row-text">' + escapeHtml(tree.name || tree.topic || '—') + '</span>' +
                    (dateStr ? '<span class="search-row-hint">' + escapeHtml(dateStr) + '</span>' : '');
                row.addEventListener('click', function () {
                    rememberCurrentSearch();
                    try {
                        var gd = typeof tree.graph_data === 'string' ? JSON.parse(tree.graph_data) : tree.graph_data;
                        closeSearchModal();
                        window.location.hash = '#/app';
                        showGraph(gd, tree.topic || tree.name);
                    } catch (e) { Toast.show(t('loadError'), 'error'); }
                });
                results.appendChild(row);
            });
        }

        if (foundCards.length) {
            addSearchGroupTitle(results, t('menuLibrary'));
            foundCards.forEach(function (card) {
                var row = document.createElement('button');
                row.className = 'search-row';
                row.innerHTML = cardSvg +
                    '<span class="search-row-text">' + escapeHtml(card.label) + '</span>' +
                    (card.topic ? '<span class="search-row-hint">' + escapeHtml(card.topic) + '</span>' : '');
                row.addEventListener('click', function () {
                    rememberCurrentSearch();
                    closeSearchModal();
                    ModalManager.setTopic(card.topic);
                    ModalManager.openModal(
                        { id: 'lib-' + card.id, label: card.label, description: card.description, difficulty: card.difficulty, time: card.time },
                        { nodes: [], edges: [] }
                    );
                });
                results.appendChild(row);
            });
        }
    }

    function rememberCurrentSearch() {
        var input = document.getElementById('search-modal-input');
        if (input) rememberQuery(input.value.trim());
    }

    /* ============================================
       Библиотека сохранённых карточек (карусель)
       ============================================ */

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function libDifficultyColor(level) {
        if (level <= 2) return '#22c55e';
        if (level === 3) return '#eab308';
        if (level === 4) return '#f97316';
        return '#ef4444';
    }

    async function loadLibrary() {
        var t = I18n.t;
        var track = document.getElementById('side-library-track');
        if (!track) return;
        track.innerHTML = '<div class="side-lib-empty"><div class="modal-spinner"></div></div>';
        try {
            var data = await API.get('/api/cards');
            if (!data.cards || data.cards.length === 0) {
                track.innerHTML = '<div class="side-lib-empty">' + escapeHtml(t('libraryEmpty')) + '</div>';
                updateLibraryNav();
                return;
            }
            track.innerHTML = '';
            data.cards.forEach(function (card) {
                track.appendChild(buildLibraryTile(card, track));
            });
            requestAnimationFrame(updateLibraryNav);
        } catch (err) {
            track.innerHTML = '<div class="side-lib-empty">' + escapeHtml(t('errorPrefix') + err.message) + '</div>';
        }
    }

    function buildLibraryTile(card, grid) {
        var t = I18n.t;
        var tile = document.createElement('div');
        tile.className = 'side-card-tile';
        var desc = String(card.description || '');
        tile.innerHTML =
            '<div class="side-card-top">' +
                '<span class="side-card-diff" style="background:' + libDifficultyColor(card.difficulty || 3) + '"></span>' +
                (card.topic ? '<span class="side-card-topic">' + escapeHtml(card.topic) + '</span>' : '') +
                '<button class="side-card-del" title="' + escapeHtml(t('cardDeleted')) + '">' +
                    '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                '</button>' +
            '</div>' +
            '<div class="side-card-label">' + escapeHtml(card.label) + '</div>' +
            '<div class="side-card-desc">' + escapeHtml(desc.length > 70 ? desc.slice(0, 69) + '\u2026' : desc) + '</div>';

        tile.addEventListener('click', function () {
            ModalManager.setTopic(card.topic);
            ModalManager.openModal(
                { id: 'lib-' + card.id, label: card.label, description: card.description, difficulty: card.difficulty, time: card.time },
                { nodes: [], edges: [] }
            );
        });

        tile.querySelector('.side-card-del').addEventListener('click', function (e) {
            e.stopPropagation();
            API.del('/api/cards/' + card.id).then(function () {
                tile.remove();
                if (!grid.querySelector('.side-card-tile')) {
                    grid.innerHTML = '<div class="side-lib-empty">' + escapeHtml(t('libraryEmpty')) + '</div>';
                }
                updateLibraryNav();
                Toast.show(t('cardDeleted'), 'success');
            }).catch(function (err) {
                Toast.show(err.message, 'error');
            });
        });
        return tile;
    }

    /* ============================================
       Sidebar History
       ============================================ */

    async function loadSidebarHistory() {
        var t = I18n.t;
        var listEl = document.getElementById('sidebar-list');
        if (!listEl) return;
        try {
            var data = await API.get('/api/trees');
            if (!data.trees || data.trees.length === 0) {
                listEl.innerHTML = '<div class="sidebar-empty">' + t('historyEmpty') + '</div>';
                return;
            }
            listEl.innerHTML = '';
            data.trees.slice().reverse().forEach(function (tree) {
                var item = document.createElement('button');
                item.className = 'sidebar-item';
                var dateStr = tree.created_at ? new Date(tree.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '';
                var iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>';
                item.innerHTML = '<div class="sidebar-item-icon">' + iconSvg + '</div>' +
                    '<div class="sidebar-item-info"><span class="sidebar-item-name">' + (tree.name || tree.topic || '—') + '</span>' +
                    (dateStr ? '<span class="sidebar-item-date">' + dateStr + '</span>' : '') + '</div>';
                item.addEventListener('click', function () {
                    try {
                        var gd = typeof tree.graph_data === 'string' ? JSON.parse(tree.graph_data) : tree.graph_data;
                        showGraph(gd, tree.topic || tree.name);
                    } catch (e) { Toast.show(t('loadError'), 'error'); }
                });
                listEl.appendChild(item);
            });
        } catch (err) {
            listEl.innerHTML = '<div class="sidebar-empty">' + t('errorPrefix') + err.message + '</div>';
        }
    }

    /* ============================================
       Ghost Card Animation — Background
       ============================================ */

    function startGhostAnimation() {
        var canvas = document.getElementById('ghost-canvas');
        if (!canvas) return;

        function createGhostSet() {
            var w = window.innerWidth;
            var h = window.innerHeight;
            var sidebarW = Math.min(280, w * 0.22);
            var availW = w - sidebarW - 40;
            if (availW < 200) return;

            var count = 3;
            var topBand = Math.random() < 0.5;
            var baseX = sidebarW + 40 + Math.random() * Math.max(20, availW - 480);
            baseX = Math.max(sidebarW + 20, Math.min(baseX, w - 460));
            var baseY = topBand
                ? 30 + Math.random() * Math.max(40, h * 0.18)
                : Math.min(h - 90, h * 0.82 + Math.random() * Math.max(20, h * 0.1));
            var topic = ghostTopics[Math.floor(Math.random() * ghostTopics.length)];

            var cards = [];
            for (var i = 0; i < count; i++) {
                var card = document.createElement('div');
                card.className = 'ghost-card';
                var cx = baseX + (i % 3) * 140 + (Math.random() - 0.5) * 60;
                var cy = baseY + Math.floor(i / 3) * 80 + (Math.random() - 0.5) * 40;
                var label = i === 0 ? topic : topic.substring(0, 12) + '...';
                card.style.left = cx + 'px';
                card.style.top = cy + 'px';
                card.innerHTML = '<div class="ghost-card-title">' + label + '</div>' +
                    '<div class="ghost-card-dots"><span></span><span></span><span></span></div>';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8) translateY(20px)';
                canvas.appendChild(card);
                cards.push({ el: card, x: cx, y: cy });
            }

            var lines = [];
            for (var j = 0; j < cards.length - 1; j++) {
                var line = document.createElement('div');
                line.className = 'ghost-line';
                var x1 = cards[j].x + 60;
                var y1 = cards[j].y + 25;
                var x2 = cards[j + 1].x + 60;
                var y2 = cards[j + 1].y + 25;
                var dx = x2 - x1;
                var dy = y2 - y1;
                var len = Math.sqrt(dx * dx + dy * dy);
                var angle = Math.atan2(dy, dx) * 180 / Math.PI;
                line.style.left = x1 + 'px';
                line.style.top = y1 + 'px';
                line.style.width = len + 'px';
                line.style.transform = 'rotate(' + angle + 'deg)';
                line.style.opacity = '0';
                canvas.appendChild(line);
                lines.push(line);
            }

            var phase = 0;
            var totalDuration = 6000 + Math.random() * 4000;

            function animate() {
                var elapsed = Date.now() - startTime;
                var progress = Math.min(elapsed / totalDuration, 1);

                if (progress < 0.3) {
                    var p = progress / 0.3;
                    cards.forEach(function (c, i) {
                        var delay = i * 120;
                        var cp = Math.max(0, Math.min(1, (p * totalDuration * 0.3 - delay) / 400));
                        c.el.style.opacity = 0.55 * cp;
                        c.el.style.transform = 'scale(' + (0.8 + 0.2 * cp) + ') translateY(' + (20 * (1 - cp)) + 'px)';
                    });
                } else if (progress < 0.5) {
                    var lp = (progress - 0.3) / 0.2;
                    lines.forEach(function (l, i) {
                        var delay = i * 150;
                        var cp = Math.max(0, Math.min(1, (lp * 2000 - delay) / 500));
                        l.style.opacity = cp * 0.2;
                    });
                } else if (progress < 0.85) {
                    cards.forEach(function (c) {
                        c.el.style.opacity = '0.55';
                        c.el.style.transform = 'scale(1) translateY(0)';
                    });
                    lines.forEach(function (l) { l.style.opacity = '0.2'; });
                } else {
                    var fp = (progress - 0.85) / 0.15;
                    cards.forEach(function (c, i) {
                        var delay = (cards.length - 1 - i) * 80;
                        var cp = Math.max(0, Math.min(1, (fp * totalDuration * 0.15 - delay) / 300));
                        c.el.style.opacity = 1 - cp;
                        c.el.style.transform = 'scale(' + (1 - 0.15 * cp) + ') translateY(' + (-15 * cp) + 'px)';
                    });
                    lines.forEach(function (l) {
                        l.style.opacity = 0.2 * (1 - fp);
                    });
                }

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    cards.forEach(function (c) { c.el.remove(); });
                    lines.forEach(function (l) { l.remove(); });
                }
            }

            var startTime = Date.now();
            requestAnimationFrame(animate);
        }

        function scheduleNext() {
            var delay = 3000 + Math.random() * 5000;
            ghostTimer = setTimeout(function () {
                createGhostSet();
                scheduleNext();
            }, delay);
        }

        createGhostSet();
        scheduleNext();
    }

    function stopGhostAnimation() {
        if (ghostTimer) { clearTimeout(ghostTimer); ghostTimer = null; }
        var canvas = document.getElementById('ghost-canvas');
        if (canvas) canvas.innerHTML = '';
    }

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

        var btn = document.getElementById('home-generate-btn');
        btn.disabled = true;
        clearInterval(hintTimer);
        stopGhostAnimation();

        var subtitle = document.getElementById('home-subtitle');
        subtitle.textContent = t('generating') + topic + '\u00BB';
        subtitle.style.opacity = '1';

        showLoading();

        async function abortWith(msg) {
            hideLoading();
            Toast.show(msg, 'error');
            subtitle.textContent = t('homeSubtitle');
            startHints();
            startGhostAnimation();
        }

        try {
            setStage(0);
            var ping;
            try { ping = await API.get('/api/generate/ping'); }
            catch (e) { ping = { ok: false }; }
            if (!ping.ok) { stageFail(0); await wait(900); await abortWith(t('checkFailConn')); return; }
            stageDone(0);

            setStage(1);
            var check;
            try { check = await API.post('/api/generate/check', { topic: topic }, { timeout: 120000 }); }
            catch (e) { check = { ok: false, code: 'connection' }; }
            if (!check.ok) {
                stageFail(1);
                await wait(900);
                var msg = check.code === 'profanity' ? t('checkFailProfanity') :
                    check.code === 'irrelevant' ? t('checkFailIrrelevant') :
                    check.code === 'empty' ? t('inputEmpty') : t('checkFailConn');
                await abortWith(msg);
                return;
            }
            stageDone(1);

            setStage(2);
            var graphData;
            try { graphData = await API.post('/api/generate', { topic: topic }, { timeout: 600000 }); }
            catch (e) { stageFail(2); await wait(900); await abortWith(e.message || t('llmUnavailable')); return; }
            if (!graphData.nodes || graphData.nodes.length < 2) { stageFail(2); await wait(900); await abortWith(t('tooFewData')); return; }
            stageDone(2);
            await wait(450);
            hideLoading();
            showGraph(graphData, topic);
        } catch (err) {
            await abortWith(err.message || t('llmUnavailable'));
        } finally {
            btn.disabled = false;
        }
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
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
                        ${t('graphBack')}
                    </button>
                    <span style="font-size:13px; color:var(--text-secondary); font-weight:500;">${topic}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button class="btn btn-sm" id="graph-save">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                        ${t('graphSave')}
                    </button>
                    <button class="btn btn-sm" id="graph-settings-btn" title="Settings">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
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
            setTimeout(function () { render(); }, 300);
        });
        document.getElementById('graph-save').addEventListener('click', async function () {
            var name = prompt(t('saveTreePrompt'));
            if (!name) return;
            try {
                await API.post('/api/trees', { name: name, graph_data: graphData, topic: topic });
                Toast.show(t('saveTreeSuccess'), 'success');
            } catch (err) {
                Toast.show(err.message, 'error');
            }
        });
        document.getElementById('graph-settings-btn').addEventListener('click', function () {
            window.location.hash = '#/settings';
        });

        GraphRenderer.renderGraph(graphData, topic);
    }

    /* ============================================
       Loading
       ============================================ */

    function showLoading() {
        var t = I18n.t;
        var el = document.getElementById('home-loading');
        el.classList.remove('hidden');

        var cl = document.getElementById('home-loading-checklist');
        cl.innerHTML = '';
        var stages = [t('stageConn'), t('stageCheck'), t('stageTree')];
        stages.forEach(function (text, i) {
            cl.innerHTML += '<div class="loading-check-item" id="hl-stage-' + i + '" style="animation-delay:' + (i * 0.12) + 's">' +
                '<div class="loading-check-spinner"></div>' +
                '<div class="loading-check-circle"><span class="loading-check-mark">\u2713</span></div>' +
                '<span class="loading-check-text">' + text + '</span></div>';
        });

        var tips = [t('tip1'), t('tip2'), t('tip3'), t('tip4')];
        document.getElementById('home-loading-tip').textContent = tips[Math.floor(Math.random() * tips.length)];
    }

    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    function setStage(i) {
        var el = document.getElementById('hl-stage-' + i);
        if (el) el.classList.add('active');
    }

    function stageDone(i) {
        var el = document.getElementById('hl-stage-' + i);
        if (el) { el.classList.remove('active'); el.classList.add('done'); }
    }

    function stageFail(i) {
        var el = document.getElementById('hl-stage-' + i);
        if (!el) return;
        el.classList.remove('active');
        el.classList.add('failed');
        var mark = el.querySelector('.loading-check-mark');
        if (mark) mark.textContent = '\u2715';
    }
    function hideLoading() {
        if (loadingAnimFrame) { clearTimeout(loadingAnimFrame); loadingAnimFrame = null; }
        var el = document.getElementById('home-loading');
        if (el) el.classList.add('hidden');
    }

    return { render: render };
})();
