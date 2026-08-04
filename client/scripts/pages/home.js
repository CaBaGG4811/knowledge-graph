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
                    <div class="sidebar-header">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <span>${t('menuHistory')}</span>
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
                    <div class="loading-progress-bar-container">
                        <div id="home-loading-bar" class="loading-progress-bar"></div>
                    </div>
                    <div id="home-loading-percent" class="loading-percent">0%</div>
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

            var count = 3 + Math.floor(Math.random() * 3);
            var baseX = 40 + Math.random() * (availW - 300);
            var baseY = 80 + Math.random() * (h - 200);
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
                        c.el.style.opacity = cp;
                        c.el.style.transform = 'scale(' + (0.8 + 0.2 * cp) + ') translateY(' + (20 * (1 - cp)) + 'px)';
                    });
                } else if (progress < 0.5) {
                    var lp = (progress - 0.3) / 0.2;
                    lines.forEach(function (l, i) {
                        var delay = i * 150;
                        var cp = Math.max(0, Math.min(1, (lp * 2000 - delay) / 500));
                        l.style.opacity = cp * 0.3;
                    });
                } else if (progress < 0.85) {
                    cards.forEach(function (c) {
                        c.el.style.opacity = '1';
                        c.el.style.transform = 'scale(1) translateY(0)';
                    });
                    lines.forEach(function (l) { l.style.opacity = '0.3'; });
                } else {
                    var fp = (progress - 0.85) / 0.15;
                    cards.forEach(function (c, i) {
                        var delay = (cards.length - 1 - i) * 80;
                        var cp = Math.max(0, Math.min(1, (fp * totalDuration * 0.15 - delay) / 300));
                        c.el.style.opacity = 1 - cp;
                        c.el.style.transform = 'scale(' + (1 - 0.15 * cp) + ') translateY(' + (-15 * cp) + 'px)';
                    });
                    lines.forEach(function (l) {
                        l.style.opacity = 0.3 * (1 - fp);
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
        startLoadingAnimation();

        try {
            var graphData = await API.post('/api/generate', { topic: topic }, { timeout: 600000 });
            finishLoadingAnimation();
            await new Promise(function (r) { setTimeout(r, 400); });
            if (!graphData.nodes || graphData.nodes.length < 2) {
                throw new Error(t('tooFewData'));
            }
            hideLoading();
            showGraph(graphData, topic);
        } catch (err) {
            hideLoading();
            Toast.show(err.message, 'error');
            subtitle.textContent = t('homeSubtitle');
            startHints();
            startGhostAnimation();
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
        var bar = document.getElementById('home-loading-bar');
        bar.style.width = '0%';
        bar.classList.remove('waiting');
        document.getElementById('home-loading-percent').textContent = '0%';

        var cl = document.getElementById('home-loading-checklist');
        cl.innerHTML = '';
        var steps = [t('step0'), t('step1'), t('step2'), t('step3'), t('step4'), t('step5'), t('step6')];
        steps.forEach(function (text, i) {
            cl.innerHTML += '<div class="loading-check-item" id="hl-step-' + i + '">' +
                '<div class="loading-check-spinner"></div>' +
                '<div class="loading-check-circle"><span class="loading-check-mark">\u2713</span></div>' +
                '<span class="loading-check-text">' + text + '</span></div>';
        });

        var tips = [t('tip0'), t('tip1'), t('tip2'), t('tip3'), t('tip4')];
        document.getElementById('home-loading-tip').textContent = tips[Math.floor(Math.random() * tips.length)];
    }

    function startLoadingAnimation() {
        var bar = document.getElementById('home-loading-bar');
        bar.classList.add('waiting');
        var currentStep = 0;
        var steps = 7;

        function advanceStep() {
            var el = document.getElementById('hl-step-' + currentStep);
            if (!el) return;
            if (currentStep > 0) {
                var prev = document.getElementById('hl-step-' + (currentStep - 1));
                if (prev) { prev.classList.remove('active'); prev.classList.add('done'); }
            }
            el.classList.add('active');
            bar.style.width = Math.round((currentStep / steps) * 100) + '%';
            document.getElementById('home-loading-percent').textContent = Math.round((currentStep / steps) * 100) + '%';
            currentStep++;
            if (currentStep < steps) {
                var delay = currentStep === 1 ? 800 + Math.random() * 400 : 400 + Math.random() * 600;
                loadingAnimFrame = setTimeout(advanceStep, delay);
            }
        }
        loadingAnimFrame = setTimeout(advanceStep, 100);
    }

    function finishLoadingAnimation() {
        if (loadingAnimFrame) { clearTimeout(loadingAnimFrame); loadingAnimFrame = null; }
        var bar = document.getElementById('home-loading-bar');
        if (bar) bar.classList.remove('waiting');
        var steps = 6, i = 0;
        function markDone() {
            if (i >= steps) { if (bar) bar.style.width = '100%'; var p = document.getElementById('home-loading-percent'); if (p) p.textContent = '100%'; return; }
            var el = document.getElementById('hl-step-' + i);
            if (el) { el.classList.remove('active'); el.classList.add('done'); }
            if (bar) bar.style.width = Math.round(((i + 1) / steps) * 100) + '%';
            var p = document.getElementById('home-loading-percent'); if (p) p.textContent = Math.round(((i + 1) / steps) * 100) + '%';
            i++;
            setTimeout(markDone, 60);
        }
        markDone();
    }

    function hideLoading() {
        if (loadingAnimFrame) { clearTimeout(loadingAnimFrame); loadingAnimFrame = null; }
        var el = document.getElementById('home-loading');
        if (el) el.classList.add('hidden');
    }

    return { render: render };
})();
