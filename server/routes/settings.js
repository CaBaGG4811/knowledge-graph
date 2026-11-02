const express = require('express');
const { getOne, runQuery } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
    var theme = (getOne('SELECT value FROM settings WHERE key = ?', ['theme']) || {}).value || 'dark';
    var accentColor = (getOne('SELECT value FROM settings WHERE key = ?', ['accent_color']) || {}).value || '#e0e0e0';
    var fontSize = (getOne('SELECT value FROM settings WHERE key = ?', ['font_size']) || {}).value || 'medium';
    var lang = (getOne('SELECT value FROM settings WHERE key = ?', ['lang']) || {}).value || 'ru';
    var llmUrl = (getOne('SELECT value FROM settings WHERE key = ?', ['llm_url']) || {}).value || '';
    var llmModel = (getOne('SELECT value FROM settings WHERE key = ?', ['llm_model']) || {}).value || '';
    var activeProviderId = Number((getOne('SELECT value FROM settings WHERE key = ?', ['active_provider_id']) || {}).value) || null;
    res.json({ theme, accentColor, fontSize, lang, llmUrl, llmModel, activeProviderId });
});

router.put('/', (req, res) => {
    var { theme, accentColor, fontSize, lang, llmUrl, llmModel } = req.body;

    if (theme !== undefined) {
        runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['theme', theme]);
    }
    if (accentColor !== undefined) {
        runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['accent_color', accentColor]);
    }
    if (fontSize !== undefined) {
        runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['font_size', fontSize]);
    }
    if (lang !== undefined) {
        runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['lang', lang]);
    }
    if (llmUrl !== undefined) {
        runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['llm_url', llmUrl]);
    }
    if (llmModel !== undefined) {
        runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['llm_model', llmModel]);
    }

    var themeVal = (getOne('SELECT value FROM settings WHERE key = ?', ['theme']) || {}).value || 'dark';
    var accentVal = (getOne('SELECT value FROM settings WHERE key = ?', ['accent_color']) || {}).value || '#e0e0e0';
    var fontVal = (getOne('SELECT value FROM settings WHERE key = ?', ['font_size']) || {}).value || 'medium';
    var langVal = (getOne('SELECT value FROM settings WHERE key = ?', ['lang']) || {}).value || 'ru';
    var llmUrlVal = (getOne('SELECT value FROM settings WHERE key = ?', ['llm_url']) || {}).value || '';
    var llmModelVal = (getOne('SELECT value FROM settings WHERE key = ?', ['llm_model']) || {}).value || '';
    var activeProviderIdVal = Number((getOne('SELECT value FROM settings WHERE key = ?', ['active_provider_id']) || {}).value) || null;
    res.json({ theme: themeVal, accentColor: accentVal, fontSize: fontVal, lang: langVal, llmUrl: llmUrlVal, llmModel: llmModelVal, activeProviderId: activeProviderIdVal });
});

module.exports = router;
