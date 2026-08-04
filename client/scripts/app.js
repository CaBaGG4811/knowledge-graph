/* app.js — точка входа */
(async function () {
    'use strict';

    try {
        var settings = await API.get('/api/settings');
        Store.set('settings', settings);
        if (settings.lang) I18n.setLang(settings.lang);
    } catch (e) {}

    applyLangToHtml();

    Router.register('/app', HomePage.render);
    Router.register('/settings', SettingsPage.render);
    Router.init();
})();

function applyLangToHtml() {
    var lang = I18n.getLang();
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
}
