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
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
                        ${t('settingsBack')}
                    </a>
                </div>
                <h1 class="settings-title">${t('settingsTitle')}</h1>

                <div class="settings-section">
                    <div class="settings-section-title">${t('llmSectionTitle')}</div>
                    <div class="settings-section-subtitle">${t('llmSectionSubtitle')}</div>
                    <div id="llm-provider-root"></div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">${t('sectionAppearance')}</div>
                    <div class="settings-group">
                        <div class="settings-row">
                            <span class="settings-label">${t('settingFontSize')}</span>
                            <div class="settings-control">
                                <button class="settings-option ${s.fontSize === 'small' ? 'active' : ''}" data-setting="fontSize" data-value="small">${t('fontSmall')}</button>
                                <button class="settings-option ${s.fontSize === 'medium' ? 'active' : ''}" data-setting="fontSize" data-value="medium">${t('fontMedium')}</button>
                                <button class="settings-option ${s.fontSize === 'large' ? 'active' : ''}" data-setting="fontSize" data-value="large">${t('fontLarge')}</button>
                            </div>
                        </div>
                        <div class="settings-row">
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

        var providerRoot = document.getElementById('llm-provider-root');
        if (providerRoot && typeof SettingsProvider !== 'undefined') {
            SettingsProvider.mount(providerRoot);
        }
    }

    function bindEvents() {
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
                var s = Store.get('settings');
                s[key] = value;
                Store.set('settings', s);

                if (key === 'lang') {
                    I18n.setLang(value);
                    if (typeof applyLangToHtml === 'function') applyLangToHtml();
                    render();
                    return;
                }

                document.querySelectorAll('.settings-option[data-setting="' + key + '"]').forEach(function (b) {
                    b.classList.toggle('active', b === btn);
                });
                saveSetting(key, value);
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
    }

    return { render: render };
})();
