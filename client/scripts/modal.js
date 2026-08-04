/* modal.js — модалка с полной карточкой темы */
const ModalManager = (function () {
    'use strict';

    var overlay, currentNode = null, currentGraphData = null;

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function ensureDom() {
        if (overlay) return;
        overlay = document.createElement('div');
        overlay.id = 'modal-overlay';
        overlay.className = 'modal-overlay hidden';
        overlay.innerHTML = '<div class="modal-backdrop"></div><div class="modal-card" id="modal-card"></div>';
        document.body.appendChild(overlay);
        overlay.querySelector('.modal-backdrop').addEventListener('click', closeModal);
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
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
            ? prereqs.map(function (p) { return '<a class="modal-link" data-id="' + p.id + '">' + p.label + '</a>'; }).join(', ')
            : '<span class="modal-dim">' + t('noPrereqs') + '</span>';

        var leadsToHtml = '';
        if (nodeData.leadsTo && nodeData.leadsTo.length && graphData) {
            leadsToHtml = nodeData.leadsTo.map(function (id) {
                var n = graphData.nodes.find(function (x) { return x.id === id; });
                return n ? '<a class="modal-link" data-id="' + n.id + '">' + n.label + '</a>' : null;
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
                <div class="modal-block">
                    <div class="modal-block-label">${t('whatIs')}</div>
                    <div class="modal-block-text">${escapeHtml(nodeData.description) || '—'}</div>
                </div>

                <div class="modal-block">
                    <div class="modal-block-label">${t('whyLearn')}</div>
                    <div class="modal-block-text">${nodeData.why && nodeData.why.indexOf('фундаментальная тема') === -1 ? escapeHtml(nodeData.why) : t('defaultWhy')}</div>
                </div>

                <div class="modal-dual">
                    <div class="modal-block">
                        <div class="modal-block-label">${t('prerequisites')}</div>
                        <div class="modal-block-text modal-links-container">${prereqHtml}</div>
                    </div>
                    <div class="modal-block">
                        <div class="modal-block-label">${t('leadsTo')}</div>
                        <div class="modal-block-text modal-links-container">${leadsToHtml}</div>
                    </div>
                </div>
            </div>

            <div class="modal-actions" id="modal-actions">
                <button class="modal-action-btn" data-action="detail"><span class="ma-icon">i</span> ${t('actionDetail')}</button>
                <button class="modal-action-btn" data-action="simple"><span class="ma-icon">&diams;</span> ${t('actionSimple')}</button>
                <button class="modal-action-btn" data-action="child"><span class="ma-icon">&hearts;</span> ${t('actionChild')}</button>
                <button class="modal-action-btn" data-action="example"><span class="ma-icon">&#9654;</span> ${t('actionExample')}</button>
                <button class="modal-action-btn" data-action="quiz"><span class="ma-icon">?</span> ${t('actionQuiz')}</button>
                <button class="modal-action-btn" data-action="mistakes"><span class="ma-icon">!</span> ${t('actionMistakes')}</button>
                <button class="modal-action-btn" data-action="summary"><span class="ma-icon">&equiv;</span> ${t('actionSummary')}</button>
            </div>

            <div class="modal-ai-result" id="modal-ai-result"></div>
        `;

        document.getElementById('modal-close-btn').addEventListener('click', closeModal);
        card.querySelectorAll('.modal-action-btn').forEach(function (btn) {
            btn.addEventListener('click', function () { handleAction(btn.getAttribute('data-action')); });
        });
        card.querySelectorAll('.modal-link').forEach(function (link) {
            link.addEventListener('click', function () {
                var id = link.getAttribute('data-id');
                if (id) openModalById(id);
            });
        });

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

            var html = '';
            if (action === 'quiz' && Array.isArray(result.data)) {
                html = '<div class="quiz-box">';
                result.data.forEach(function (q, i) {
                    if (!q.q || !q.options) return;
                    html += '<div class="quiz-q">';
                    html += '<div class="quiz-q-num">' + (i + 1) + '</div>';
                    html += '<div class="quiz-q-body">';
                    html += '<div class="quiz-q-text">' + q.q + '</div>';
                    html += '<div class="quiz-opts">';
                    q.options.forEach(function (opt, j) {
                        html += '<button class="quiz-opt" data-correct="' + (q.correct || 0) + '" data-idx="' + j + '">' + opt + '</button>';
                    });
                    html += '</div></div></div>';
                });
                html += '</div>';
            } else {
                html = '<div class="modal-ai-text">' + formatText(result.data) + '</div>';
            }

            resultEl.innerHTML = html + '<div class="modal-ai-actions"><button class="modal-action-btn modal-save-btn" id="modal-save-text">' + (t('saveText') || 'Сохранить') + '</button><button class="modal-action-btn" id="modal-ai-close-btn">' + t('closeBtn') + '</button></div>';
            var closeBtn = document.getElementById('modal-ai-close-btn');
            if (closeBtn) closeBtn.addEventListener('click', function () { resultEl.innerHTML = ''; });
            var saveBtn = document.getElementById('modal-save-text');
            if (saveBtn) saveBtn.addEventListener('click', function () { saveText(resultEl); });

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
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n{2,}/g, '</p><p>')
            .replace(/\n/g, '<br>');
    }

    function saveText(el) {
        var text = el.innerText || el.textContent;
        var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = (currentNode ? currentNode.label : 'text') + '.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return { openModal: openModal, openModalById: openModalById, closeModal: closeModal };
})();
