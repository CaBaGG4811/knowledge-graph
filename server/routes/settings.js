const express = require('express');
const { getOne, runQuery } = require('../db');

const router = express.Router();

const THEMES = ['dark', 'light', 'midnight', 'sand'];
const LANGS = ['ru', 'en', 'zh', 'es', 'hi', 'ar'];
const FONT_SIZES = ['small', 'medium', 'large'];

function safeValue(value, allowed, fallback) {
    return allowed.indexOf(value) === -1 ? fallback : value;
}

router.get('/', (req, res) => {
    var theme = safeValue((getOne('SELECT value FROM settings WHERE key = ?', ['theme']) || {}).value, THEMES, 'dark');
    var accentColor = (getOne('SELECT value FROM settings WHERE key = ?', ['accent_color']) || {}).value || '#e0e0e0';
    var fontSize = safeValue((getOne('SELECT value FROM settings WHERE key = ?', ['font_size']) || {}).value, FONT_SIZES, 'medium');
    var lang = safeValue((getOne('SELECT value FROM settings WHERE key = ?', ['lang']) || {}).value, LANGS, 'ru');
    var llmUrl = (getOne('SELECT value FROM settings WHERE key = ?', ['llm_url']) || {}).value || '';
    var llmModel = (getOne('SELECT value FROM settings WHERE key = ?', ['llm_model']) || {}).value || '';
    var activeProviderId = Number((getOne('SELECT value FROM settings WHERE key = ?', ['active_provider_id']) || {}).value) || null;
    res.json({ theme, accentColor, fontSize, lang, llmUrl, llmModel, activeProviderId });
});

router.put('/', (req, res) => {
    var { theme, accentColor, fontSize, lang, llmUrl, llmModel } = req.body;

    if (theme !== undefined) {
        runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['theme', safeValue(theme, THEMES, 'dark')]);
    }
    if (accentColor !== undefined) {
        runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['accent_color', String(accentColor).slice(0, 32)]);
    }
    if (fontSize !== undefined) {
        runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['font_size', safeValue(fontSize, FONT_SIZES, 'medium')]);
    }
    if (lang !== undefined) {
        runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['lang', safeValue(lang, LANGS, 'ru')]);
    }
    if (llmUrl !== undefined) {
        runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['llm_url', llmUrl]);
    }
    if (llmModel !== undefined) {
        runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['llm_model', llmModel]);
    }

    var themeVal = safeValue((getOne('SELECT value FROM settings WHERE key = ?', ['theme']) || {}).value, THEMES, 'dark');
    var accentVal = (getOne('SELECT value FROM settings WHERE key = ?', ['accent_color']) || {}).value || '#e0e0e0';
    var fontVal = safeValue((getOne('SELECT value FROM settings WHERE key = ?', ['font_size']) || {}).value, FONT_SIZES, 'medium');
    var langVal = safeValue((getOne('SELECT value FROM settings WHERE key = ?', ['lang']) || {}).value, LANGS, 'ru');
    var llmUrlVal = (getOne('SELECT value FROM settings WHERE key = ?', ['llm_url']) || {}).value || '';
    var llmModelVal = (getOne('SELECT value FROM settings WHERE key = ?', ['llm_model']) || {}).value || '';
    var activeProviderIdVal = Number((getOne('SELECT value FROM settings WHERE key = ?', ['active_provider_id']) || {}).value) || null;
    res.json({ theme: themeVal, accentColor: accentVal, fontSize: fontVal, lang: langVal, llmUrl: llmUrlVal, llmModel: llmModelVal, activeProviderId: activeProviderIdVal });
});

module.exports = router;
