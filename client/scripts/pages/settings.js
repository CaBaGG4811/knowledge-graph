/* settings.js — страница настроек */
const SettingsPage = (function () {
    'use strict';

    var accentColors = ['#e0e0e0', '#22c55e', '#3b82f6', '#eab308', '#ef4444', '#a855f7', '#ec4899', '#06b6d4'];

    function render() {
        document.body.style.overflow = 'auto';
        var t = I18n.t;
        var s = Store.get('settings');
        var langList = I18n.getLangList();
        var content = document.getElementById('app-content');
        content.innerHTML = `
            <div class="settings-page">
                <div class="settings-topbar">
                    <a href="#/app" class="btn btn-sm">
                        ${t('settingsBack')}
                    </a>
                </div>
                <h1 class="settings-title">${t('settingsTitle')}</h1>

                <div class="settings-section">
                    <div class="settings-section-title">LLM</div>
                    <div class="settings-group">
                        <div class="settings-row" style="flex-direction:column; align-items:stretch; gap:10px; padding: 14px 0;">
                            <span class="settings-label">${t('settingLlmUrl') || 'URL сервера'}</span>
                            <input type="text" class="settings-input" id="settings-llm-url" placeholder="http://172.29.192.1:1234/v1/chat/completions" value="${s.llmUrl || ''}">
                        </div>
                        <div class="settings-row" style="flex-direction:column; align-items:stretch; gap:10px; padding: 14px 0;">
                            <span class="settings-label">${t('settingLlmModel') || 'Модель'}</span>
                            <input type="text" class="settings-input" id="settings-llm-model" placeholder="google/gemma-4-12b-qat" value="${s.llmModel || ''}">
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">${t('sectionAppearance')}</div>
                    <div class="settings-group">
                        <div class="settings-row" style="flex-direction:column; align-items:stretch; gap:12px; padding:14px 0;">
                            <span class="settings-label">${t('settingFontSize')}</span>
                            <div class="settings-control">
                                <button class="settings-option ${s.fontSize === 'small' ? 'active' : ''}" data-setting="fontSize" data-value="small">${t('fontSmall')}</button>
                                <button class="settings-option ${s.fontSize === 'medium' ? 'active' : ''}" data-setting="fontSize" data-value="medium">${t('fontMedium')}</button>
                                <button class="settings-option ${s.fontSize === 'large' ? 'active' : ''}" data-setting="fontSize" data-value="large">${t('fontLarge')}</button>
                            </div>
                        </div>
                        <div class="settings-row" style="flex-direction:column; align-items:stretch; gap:12px; padding:14px 0;">
                            <span class="settings-label">${t('settingLanguage')}</span>
                            <div class="settings-control">
                                ${langList.map(function (l) {
                                    return '<button class="settings-option ' + (s.lang === l.code ? 'active' : '') + '" data-setting="lang" data-value="' + l.code + '">' + l.name + '</button>';
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        bindEvents();
    }

    function bindEvents() {
        var debounceTimer = null;

        function saveSetting(key, value) {
            var s = Store.get('settings');
            s[key] = value;
            Store.set('settings', s);
            try { API.put('/api/settings', { [key]: value }); } catch (e) {}
        }

        document.querySelectorAll('.settings-option[data-setting]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var key = btn.getAttribute('data-setting');
                var value = btn.getAttribute('data-value');

                document.querySelectorAll('.settings-option[data-setting="' + key + '"]').forEach(function (b) {
                    b.classList.toggle('active', b === btn);
                });

                var s = Store.get('settings');
                s[key] = value;
                Store.set('settings', s);
                Store.applySettings(s);

                try { API.put('/api/settings', { [key]: value }); } catch (e) {}

                if (key === 'lang') {
                    I18n.setLang(value);
                    if (typeof applyLangToHtml === 'function') applyLangToHtml();
                    render();
                    return;
                }
            });
        });

        document.querySelectorAll('.color-swatch').forEach(function (swatch) {
            swatch.addEventListener('click', function () {
                var color = swatch.getAttribute('data-color');
                var s = Store.get('settings');
                s.accentColor = color;
                Store.set('settings', s);
                document.querySelectorAll('.color-swatch').forEach(function (w) {
                    w.classList.toggle('active', w === swatch);
                });
                saveSetting('accentColor', color);
            });
        });

        var urlInput = document.getElementById('settings-llm-url');
        var modelInput = document.getElementById('settings-llm-model');

        if (urlInput) {
            urlInput.addEventListener('input', function () {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(function () { saveSetting('llmUrl', urlInput.value); }, 500);
            });
        }
        if (modelInput) {
            modelInput.addEventListener('input', function () {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(function () { saveSetting('llmModel', modelInput.value); }, 500);
            });
        }
    }

    return { render: render };
})();
