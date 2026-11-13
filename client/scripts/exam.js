/* exam.js — «Проверь меня»: мини-экзамен по узлам дерева */
const ExamManager = (function () {
    'use strict';

    var overlay = null, card = null;
    var questions = [], idx = 0, score = 0, topics = [];

    function ensureDom() {
        if (overlay) return;
        overlay = document.createElement('div');
        overlay.id = 'exam-overlay';
        overlay.className = 'modal-overlay hidden';
        overlay.innerHTML = '<div class="modal-backdrop"></div><div class="modal-card" id="exam-card"></div>';
        document.body.appendChild(overlay);
        card = document.getElementById('exam-card');
        overlay.querySelector('.modal-backdrop').addEventListener('click', close);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) close();
        });
    }

    function close() { if (overlay) overlay.classList.add('hidden'); }

    function escapeHtml(str) {
        return String(str == null).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function pickTopics(nodes, map) {
        var learned = nodes.filter(function (n) { return map[n.id]; });
        var pool = learned.length >= 3
            ? learned
            : nodes.slice().sort(function (a, b) { return (a.difficulty || 3) - (b.difficulty || 3); }).slice(0, 8);
        return pool.slice(0, 8).map(function (n) { return n.label; }).filter(Boolean);
    }

    function shell(bodyHtml) {
        var t = I18n.t;
        card.innerHTML = '<button class="modal-close" id="exam-close-x">&times;</button>' +
            '<div class="modal-header"><h2 class="modal-title">' + t('examTitle') + '</h2></div>' +
            '<div class="modal-body">' + bodyHtml + '</div>' +
            '<div class="modal-actions" id="exam-actions"></div>';
        document.getElementById('exam-close-x').addEventListener('click', close);
    }

    function open(topic, nodes, progressMap) {
        ensureDom();
        topics = pickTopics(nodes || [], progressMap || {});
        if (topics.length < 2) {
            shell('<div class="modal-block-text">' + I18n.t('examEmpty') + '</div>');
            document.getElementById('exam-actions').innerHTML = '<button class="modal-action-btn" id="exam-close-2">' + I18n.t('closeBtn') + '</button>';
            document.getElementById('exam-close-2').addEventListener('click', close);
            overlay.classList.remove('hidden');
            return;
        }
        questions = []; idx = 0; score = 0;
        shell('<div class="exam-loading">' + I18n.t('examLoading') + '</div>');
        overlay.classList.remove('hidden');
        load();
    }

    async function load() {
        try {
            var res = await API.post('/api/generate/action', { action: 'exam', topics: topics });
            if (!Array.isArray(res.data) || !res.data.length) throw new Error(I18n.t('jsonError'));
            questions = res.data;
            idx = 0; score = 0;
            renderQuestion();
        } catch (err) {
            Toast.show(I18n.t('errorPrefix') + err.message, 'error');
            close();
        }
    }

    function renderQuestion() {
        var q = questions[idx];
        shell('<div class="exam-progress">' + (idx + 1) + '/' + questions.length + '</div>' +
            '<div class="exam-question">' + escapeHtml(q.q) + '</div>' +
            '<div class="exam-options">' + q.options.map(function (o, i) {
                return '<button class="exam-option" data-i="' + i + '">' + escapeHtml(o) + '</button>';
            }).join('') + '</div>');
        var locked = false;
        card.querySelectorAll('.exam-option').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (locked) return;
                locked = true;
                var picked = Number(btn.getAttribute('data-i'));
                card.querySelectorAll('.exam-option').forEach(function (b, i) {
                    b.disabled = true;
                    if (i === q.correct) b.classList.add('correct');
                });
                if (picked !== q.correct) btn.classList.add('wrong');
                else score++;
                var next = document.createElement('button');
                next.className = 'btn btn-sm';
                next.textContent = I18n.t(idx === questions.length - 1 ? 'examFinish' : 'examNext');
                next.addEventListener('click', function () {
                    idx++;
                    if (idx < questions.length) renderQuestion(); else renderResult();
                });
                document.getElementById('exam-actions').appendChild(next);
            });
        });
    }

    function renderResult() {
        shell('<div class="exam-score">' + score + '/' + questions.length + '</div>' +
            '<div class="exam-score-label">' + I18n.t('examScoreLabel') + '</div>');
        document.getElementById('exam-actions').innerHTML =
            '<button class="modal-action-btn" id="exam-again">' + I18n.t('examAgain') + '</button>' +
            '<button class="modal-action-btn" id="exam-close-3">' + I18n.t('closeBtn') + '</button>';
        document.getElementById('exam-again').addEventListener('click', function () {
            questions = []; idx = 0; score = 0;
            shell('<div class="exam-loading">' + I18n.t('examLoading') + '</div>');
            load();
        });
        document.getElementById('exam-close-3').addEventListener('click', close);
    }

    return { open: open, close: close };
})();
