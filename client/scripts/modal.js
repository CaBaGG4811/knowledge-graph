/* modal.js — модалка с полной карточкой темы */
const ModalManager = (function () {
    'use strict';

    var overlay, currentNode = null, currentGraphData = null, currentTopic = null;

    function setTopic(topic) { currentTopic = topic || null; }

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function ensureDom() {
        if (overlay) return;
        overlay = document.createElement('div');
        overlay.id = 'modal-overlay';
        overlay.className = 'modal-overlay hidden';
        overlay.innerHTML = '<div class="modal-backdrop"></div><div class="modal-card" id="modal-card"></div>';
        document.body.appendChild(overlay);
        overlay.querySelector('.modal-backdrop').addEventListener('click', closeModal);
        document.addEventListener('keydown', function (e) {
            // пока открыто markdown-окно справки — Escape гасит его, а не модалку
            if (e.key === 'Escape' && !document.getElementById('save-help-doc')) closeModal();
        });
    }

    function difficultyBar(level) {
        var t = I18n.t;
        var color = level <= 2 ? '#22c55e' : level === 3 ? '#eab308' : '#ef4444';
        var label = level <= 2 ? t('diffEasy') : level === 3 ? t('diffMedium') : t('diffHard');
        var html = '<div class="diff-bar">';
        for (var i = 1; i <= 5; i++) {
            html += '<div class="diff-seg' + (i <= level ? ' active' : '') + '" style="background:' + (i <= level ? color : 'var(--border-dim)') + '"></div>';
        }
        html += '<span class="diff-label" style="color:' + color + '">' + label + '</span>';
        html += '</div>';
        return html;
    }

    // ——— красивые inline-иконки для кнопок действий ———
    var ACTION_ICONS = {
        detail: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
        simple: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
        child: '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>',
        example: '<polygon points="5 3 19 12 5 21 5 3"/>',
        quiz: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        mistakes: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        summary: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'
    };

    function actionSvg(key, size) {
        var inner = ACTION_ICONS[key];
        if (!inner) return '';
        size = size || 12;
        return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
    }

    var INFO_CIRCLE =
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

    function getPrereqs(nodeId, graphData) {
        if (!graphData) return [];
        return graphData.edges
            .filter(function (e) { return e.target === nodeId; })
            .map(function (e) { return graphData.nodes.find(function (n) { return n.id === e.source; }); })
            .filter(Boolean);
    }

    function openModal(nodeData, graphData) {
        ensureDom();
        var t = I18n.t;
        currentNode = nodeData;
        currentGraphData = graphData || null;

        var prereqs = getPrereqs(nodeData.id, graphData);
        var prereqHtml = prereqs.length
            ? prereqs.map(function (p) { return '<a class="modal-link" data-id="' + escapeHtml(p.id) + '">' + escapeHtml(p.label) + '</a>'; }).join(', ')
            : '<span class="modal-dim">' + t('noPrereqs') + '</span>';

        var leadsToHtml = '';
        if (nodeData.leadsTo && nodeData.leadsTo.length && graphData) {
            leadsToHtml = nodeData.leadsTo.map(function (id) {
                var n = graphData.nodes.find(function (x) { return x.id === id; });
                return n ? '<a class="modal-link" data-id="' + escapeHtml(n.id) + '">' + escapeHtml(n.label) + '</a>' : null;
            }).filter(Boolean).join(', ');
        }
        if (!leadsToHtml) leadsToHtml = '<span class="modal-dim">' + t('endOfBranch') + '</span>';

        var card = document.getElementById('modal-card');
        card.innerHTML = `
            <button class="modal-close" id="modal-close-btn">&times;</button>

            <div class="modal-header">
                <h2 class="modal-title">${escapeHtml(nodeData.label)}</h2>
                <div class="modal-meta-row">
                    ${difficultyBar(nodeData.difficulty || 3)}
                    ${nodeData.time ? '<span class="modal-time-badge">' + escapeHtml(nodeData.time) + '</span>' : ''}
                </div>
            </div>

            <div class="modal-body">
                <div class="modal-block modal-stagger">
                    <div class="modal-block-label">${t('whatIs')}</div>
                    <div class="modal-block-text">${escapeHtml(nodeData.description || '—')}</div>
                </div>

                <div class="modal-block modal-stagger">
                    <div class="modal-block-label">${t('whyLearn')}</div>
                    <div class="modal-block-text">${escapeHtml(nodeData.why && nodeData.why.indexOf('фундаментальная тема') === -1 ? nodeData.why : t('defaultWhy'))}</div>
                </div>

                <div class="modal-dual">
                    <div class="modal-block modal-stagger">
                        <div class="modal-block-label">${t('prerequisites')}</div>
                        <div class="modal-block-text modal-links-container">${prereqHtml}</div>
                    </div>
                    <div class="modal-block modal-stagger">
                        <div class="modal-block-label">${t('leadsTo')}</div>
                        <div class="modal-block-text modal-links-container">${leadsToHtml}</div>
                    </div>
                </div>
            </div>

            <div class="modal-actions" id="modal-actions">
                <button class="modal-action-btn" data-action="detail">${actionSvg('detail', 11)} ${t('actionDetail')}</button>
                <button class="modal-action-btn" data-action="simple">${actionSvg('simple', 11)} ${t('actionSimple')}</button>
                <button class="modal-action-btn" data-action="child">${actionSvg('child', 11)} ${t('actionChild')}</button>
                <button class="modal-action-btn" data-action="example">${actionSvg('example', 11)} ${t('actionExample')}</button>
                <button class="modal-action-btn" data-action="quiz">${actionSvg('quiz', 11)} ${t('actionQuiz')}</button>
                <button class="modal-action-btn" data-action="mistakes">${actionSvg('mistakes', 11)} ${t('actionMistakes')}</button>
                <button class="modal-action-btn" data-action="summary">${actionSvg('summary', 11)} ${t('actionSummary')}</button>
                <button class="modal-action-btn modal-save-card-btn" data-action="saveCard" id="modal-save-card-btn">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                    ${t('saveCardBtn')}
                </button>
            </div>

            <div class="modal-ai-result" id="modal-ai-result"></div>
            <div class="modal-ai-history" id="modal-ai-history"></div>
        `;

        document.getElementById('modal-close-btn').addEventListener('click', closeModal);
        card.querySelectorAll('.modal-action-btn').forEach(function (btn) {
            if (btn.getAttribute('data-action') === 'saveCard') {
                btn.addEventListener('click', function () { saveCurrentCard(btn); });
            } else {
                btn.addEventListener('click', function () { handleAction(btn.getAttribute('data-action')); });
            }
        });
        card.querySelectorAll('.modal-link').forEach(function (link) {
            link.addEventListener('click', function () {
                var id = link.getAttribute('data-id');
                if (id) openModalById(id);
            });
        });

        renderAdditionsHistory();

        // если карточка уже сохранена в «Моё творчество» — кнопка гаснет
        if (nodeData && nodeData.label) {
            if (nodeData.saved_card_id) {
                markCardSaved();
            } else {
                API.get('/api/cards/exists?label=' + encodeURIComponent(nodeData.label)).then(function (res) {
                    if (res.exists && currentNode === nodeData) markCardSaved();
                }).catch(function () {});
            }
        }

        overlay.classList.remove('hidden');
    }

    function openModalById(id) {
        if (!currentGraphData) return;
        var node = currentGraphData.nodes.find(function (n) { return n.id === id; });
        if (node) openModal(node, currentGraphData);
    }

    function closeModal() {
        if (overlay) overlay.classList.add('hidden');
        currentNode = null;
    }

    function markCardSaved() {
        var t = I18n.t;
        var btn = document.getElementById('modal-save-card-btn');
        if (!btn) return;
        btn.disabled = true;
        btn.innerHTML = '<span class="ma-icon">&#10003;</span> ' + t('alreadySaved');
    }

    async function saveCurrentCard(btn) {
        var t = I18n.t;
        if (!currentNode) return;
        try {
            btn.disabled = true;
            await API.post('/api/cards', {
                label: currentNode.label,
                description: currentNode.description || '',
                difficulty: currentNode.difficulty || 3,
                time: currentNode.time || '',
                topic: currentTopic || ''
            });
            markCardSaved();
            Toast.show(t('cardSaved'), 'success');
        } catch (err) {
            btn.disabled = false;
            Toast.show(err.message, 'error');
        }
    }


    // ——— история дополнений карточки (localStorage) ———
    var ADDITIONS_KEY = 'kg_node_additions';

    function loadAdditions() {
        try {
            var all = JSON.parse(localStorage.getItem(ADDITIONS_KEY) || '{}');
            return all && typeof all === 'object' ? all : {};
        } catch (e) { return {}; }
    }

    function additionsKey() {
        return (currentTopic || '') + '||' + (currentNode ? currentNode.label : '');
    }

    function persistAdditions(all) {
        try { localStorage.setItem(ADDITIONS_KEY, JSON.stringify(all)); } catch (e) {}
    }

    function getAdditions() {
        return loadAdditions()[additionsKey()] || [];
    }

    function addAddition(action, text) {
        var all = loadAdditions();
        var key = additionsKey();
        var list = all[key] || [];
        list.unshift({ action: action, text: text, date: Date.now() });
        all[key] = list;
        persistAdditions(all);
    }

    function removeAddition(index) {
        var all = loadAdditions();
        var key = additionsKey();
        var list = all[key] || [];
        if (index >= 0 && index < list.length) {
            list.splice(index, 1);
            all[key] = list;
            persistAdditions(all);
        }
    }

    // ——— заголовки действий ———
    var AI_TITLE_KEYS = {
        detail: 'aiTitleDetail', simple: 'aiTitleSimple', child: 'aiTitleChild',
        example: 'aiTitleExample', quiz: 'aiTitleQuiz', mistakes: 'aiTitleMistakes', summary: 'aiTitleSummary'
    };

    function actionTitle(action) {
        var key = AI_TITLE_KEYS[action];
        return key ? I18n.t(key) : '';
    }

    // ——— markdown-справка по кнопкам сохранения ———
    function openSaveHelpDoc() {
        var t = I18n.t;
        var existing = document.getElementById('save-help-doc');
        if (existing) existing.remove();
        var overlay = document.createElement('div');
        overlay.id = 'save-help-doc';
        overlay.className = 'doc-overlay doc-pending';
        overlay.innerHTML =
            '<div class="doc-backdrop"></div>' +
            '<div class="doc-modal">' +
                '<button class="doc-close" id="doc-close-btn">&times;</button>' +
                '<div class="doc-body">' +
                    '<h1>' + escapeHtml(t('saveHelpTitle')) + '</h1>' +
                    '<p class="doc-lead">' + escapeHtml(t('saveHelpIntro')) + '</p>' +
                    '<h2>' + escapeHtml(t('helpSaveHeading')) + '</h2>' +
                    '<p>' + escapeHtml(t('helpSaveText')) + '</p>' +
                    '<h2>' + escapeHtml(t('helpDeviceHeading')) + '</h2>' +
                    '<p>' + escapeHtml(t('helpDeviceText')) + '</p>' +
                    '<h2>' + escapeHtml(t('helpLibraryHeading')) + '</h2>' +
                    '<p>' + escapeHtml(t('helpLibraryText')) + '</p>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);
        var done = false;
        function closeDoc() {
            if (done) return;
            done = true;
            overlay.classList.add('closing');
            setTimeout(function () { overlay.remove(); }, 180);
        }
        overlay.querySelector('#doc-close-btn').addEventListener('click', closeDoc);
        overlay.querySelector('.doc-backdrop').addEventListener('click', closeDoc);
        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape') { closeDoc(); document.removeEventListener('keydown', esc); }
        });
        requestAnimationFrame(function () { overlay.classList.remove('doc-pending'); });
    }

    function downloadText(filename, text) {
        var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename + '.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function renderAdditionsHistory() {
        var t = I18n.t;
        var el = document.getElementById('modal-ai-history');
        if (!el || !currentNode) { if (el) el.innerHTML = ''; return; }
        var entries = getAdditions();
        var html = '<div class="ai-add-header">' + escapeHtml(t('additionsTitle')) + '</div>';
        if (!entries.length) {
            html += '<div class="ai-add-empty">' + escapeHtml(t('additionsEmpty')) + '</div>';
        } else {
            entries.forEach(function (entry, i) {
                var title = actionTitle(entry.action) || t('saveText');
                var dateStr = new Date(entry.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
                html += '<div class="ai-add-block" data-idx="' + i + '">' +
                    '<div class="ai-add-row">' +
                        '<span class="ai-add-badge">' + escapeHtml(title) + '</span>' +
                        '<span class="ai-add-date">' + escapeHtml(dateStr) + '</span>' +
                        '<button class="ai-add-del" data-idx="' + i + '">' +
                            '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                        '</button>' +
                    '</div>' +
                    '<div class="ai-add-text">' + formatText(entry.text) + '</div>' +
                '</div>';
            });
        }
        el.innerHTML = html;
        el.classList.toggle('has-items', entries.length > 0);

        el.querySelectorAll('.ai-add-del').forEach(function (delBtn) {
            delBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                removeAddition(parseInt(delBtn.getAttribute('data-idx'), 10));
                renderAdditionsHistory();
                Toast.show(t('additionDeleted'), 'success');
            });
        });
        // длинный текст раскрывается кликом
        el.querySelectorAll('.ai-add-block').forEach(function (block) {
            var textEl = block.querySelector('.ai-add-text');
            if (!textEl) return;
            requestAnimationFrame(function () {
                if (textEl.scrollHeight > 120) block.classList.add('clamped');
            });
            block.addEventListener('click', function () {
                block.classList.toggle('expanded');
                block.classList.remove('clamped');
            });
        });
    }

    async function saveAdditionToLibrary(btn, savedTitle, plainText) {
        var t = I18n.t;
        try {
            btn.disabled = true;
            await API.post('/api/cards', {
                label: savedTitle,
                description: plainText,
                difficulty: (currentNode && currentNode.difficulty) || 3,
                time: (currentNode && currentNode.time) || '',
                topic: currentTopic || ''
            });
            Toast.show(t('additionLibSaved'), 'success');
        } catch (err) {
            Toast.show(err.message || t('addDateLoadError'), 'error');
        } finally {
            btn.disabled = false;
        }
    }

    async function handleAction(action) {
        if (!currentNode) return;
        var t = I18n.t;
        var resultEl = document.getElementById('modal-ai-result');
        var actionsEl = document.getElementById('modal-actions');

        resultEl.innerHTML = '<div class="modal-ai-loading"><div class="modal-spinner"></div> ' + t('aiLoading') + '</div>';
        actionsEl.querySelectorAll('.modal-action-btn').forEach(function (b) { b.disabled = true; });

        try {
            var result = await API.post('/api/generate/action', {
                action: action,
                label: currentNode.label,
                description: currentNode.description
            });

            var savedTitle = (actionTitle(action) || t('saveText')) + ' «' + (currentNode.label || '') + '»';
            var headerHtml = '<div class="modal-ai-title">' + escapeHtml(savedTitle) + '</div>';

            var bodyHtml = '';
            var plainText = '';
            if (action === 'quiz' && Array.isArray(result.data)) {
                var quizLines = [];
                bodyHtml = '<div class="quiz-box">';
                result.data.forEach(function (q, i) {
                    if (!q.q || !q.options) return;
                    quizLines.push((i + 1) + '. ' + q.q);
                    q.options.forEach(function (opt, j) {
                        quizLines.push('   ' + String.fromCharCode(65 + j) + ') ' + opt);
                    });
                    quizLines.push('');
                    bodyHtml += '<div class="quiz-q">';
                    bodyHtml += '<div class="quiz-q-num">' + (i + 1) + '</div>';
                    bodyHtml += '<div class="quiz-q-body">';
                    bodyHtml += '<div class="quiz-q-text">' + escapeHtml(q.q) + '</div>';
                    bodyHtml += '<div class="quiz-opts">';
                    q.options.forEach(function (opt, j) {
                        bodyHtml += '<button class="quiz-opt" data-correct="' + (q.correct || 0) + '" data-idx="' + j + '">' + escapeHtml(opt) + '</button>';
                    });
                    bodyHtml += '</div></div></div>';
                });
                bodyHtml += '</div>';
                plainText = savedTitle + '\r\n\r\n' + quizLines.join('\n');
            } else {
                plainText = savedTitle + '\r\n\r\n' + String(result.data || '');
                bodyHtml = '<div class="modal-ai-text">' + formatText(result.data) + '</div>';
            }

            var infoTitle = t('saveHelpTitle');
            resultEl.innerHTML = headerHtml + bodyHtml +
                '<div class="modal-ai-save-row">' +
                    '<button class="btn btn-primary btn-sm" id="modal-save-text">' + escapeHtml(t('saveText')) + '</button>' +
                    '<button class="btn btn-sm" id="modal-save-device">' + escapeHtml(t('saveToDevice')) + '</button>' +
                    '<button class="btn btn-sm" id="modal-save-library">' + escapeHtml(t('saveCardBtn')) + '</button>' +
                    '<button class="save-help-btn" id="modal-save-help" title="' + escapeHtml(infoTitle) + '" aria-label="' + escapeHtml(infoTitle) + '">' + INFO_CIRCLE + '</button>' +
                '</div>';

            document.getElementById('modal-save-text').addEventListener('click', function () {
                addAddition(action, plainText);
                renderAdditionsHistory();
                Toast.show(t('additionSaved'), 'success');
            });
            document.getElementById('modal-save-device').addEventListener('click', function () {
                downloadText(currentNode ? currentNode.label : 'text', plainText);
            });
            document.getElementById('modal-save-library').addEventListener('click', function () {
                saveAdditionToLibrary(this, savedTitle, plainText);
            });
            document.getElementById('modal-save-help').addEventListener('click', function () {
                openSaveHelpDoc();
            });

            if (action === 'quiz' && Array.isArray(result.data)) {
                resultEl.querySelectorAll('.quiz-q').forEach(function (qEl) {
                    qEl.querySelectorAll('.quiz-opt').forEach(function (optBtn) {
                        optBtn.addEventListener('click', function () {
                            if (optBtn.disabled) return;
                            var correct = parseInt(optBtn.getAttribute('data-correct'));
                            var idx = parseInt(optBtn.getAttribute('data-idx'));
                            if (idx === correct) {
                                optBtn.classList.add('correct');
                            } else {
                                optBtn.classList.add('wrong');
                                qEl.querySelectorAll('.quiz-opt').forEach(function (b) {
                                    if (parseInt(b.getAttribute('data-idx')) === correct) b.classList.add('correct');
                                });
                            }
                            qEl.querySelectorAll('.quiz-opt').forEach(function (b) { b.disabled = true; });
                        });
                    });
                });
            }
        } catch (err) {
            resultEl.innerHTML = '<div class="modal-ai-error">' + t('errorPrefix') + err.message + '</div><div class="modal-ai-close"><button class="modal-action-btn" id="modal-ai-err-close">' + t('closeBtn') + '</button></div>';
            var errCloseBtn = document.getElementById('modal-ai-err-close');
            if (errCloseBtn) errCloseBtn.addEventListener('click', function () { resultEl.innerHTML = '' });
        }

        actionsEl.querySelectorAll('.modal-action-btn').forEach(function (b) { b.disabled = false; });
    }

    function formatText(text) {
        if (!text) return '';
        // сначала экранируем HTML из текста модели, потом превращаем markdown в разметку
        text = escapeHtml(text);
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n{2,}/g, '</p><p>')
            .replace(/\n/g, '<br>');
    }

    return { openModal: openModal, openModalById: openModalById, closeModal: closeModal, setTopic: setTopic };
})();
