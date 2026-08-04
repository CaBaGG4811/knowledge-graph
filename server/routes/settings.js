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
    res.json({ theme, accentColor, fontSize, lang, llmUrl, llmModel });
});

router.put('/', (req, res) => {
    var { theme, accentColor, fontSize, lang, llmUrl, llmModel } = req.body;

    if (theme !== undefined) {
        runQuery('UPDATE settings SET value = ? WHERE key = ?', [theme, 'theme']);
    }
    if (accentColor !== undefined) {
        runQuery('UPDATE settings SET value = ? WHERE key = ?', [accentColor, 'accent_color']);
    }
    if (fontSize !== undefined) {
        runQuery('UPDATE settings SET value = ? WHERE key = ?', [fontSize, 'font_size']);
    }
    if (lang !== undefined) {
        runQuery('UPDATE settings SET value = ? WHERE key = ?', [lang, 'lang']);
    }
    if (llmUrl !== undefined) {
        runQuery('UPDATE settings SET value = ? WHERE key = ?', [llmUrl, 'llm_url']);
    }
    if (llmModel !== undefined) {
        runQuery('UPDATE settings SET value = ? WHERE key = ?', [llmModel, 'llm_model']);
    }

    var themeVal = (getOne('SELECT value FROM settings WHERE key = ?', ['theme']) || {}).value || 'dark';
    var accentVal = (getOne('SELECT value FROM settings WHERE key = ?', ['accent_color']) || {}).value || '#e0e0e0';
    var fontVal = (getOne('SELECT value FROM settings WHERE key = ?', ['font_size']) || {}).value || 'medium';
    var langVal = (getOne('SELECT value FROM settings WHERE key = ?', ['lang']) || {}).value || 'ru';
    var llmUrlVal = (getOne('SELECT value FROM settings WHERE key = ?', ['llm_url']) || {}).value || '';
    var llmModelVal = (getOne('SELECT value FROM settings WHERE key = ?', ['llm_model']) || {}).value || '';
    res.json({ theme: themeVal, accentColor: accentVal, fontSize: fontVal, lang: langVal, llmUrl: llmUrlVal, llmModel: llmModelVal });
});

module.exports = router;
