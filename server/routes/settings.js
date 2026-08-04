const express = require('express');
const { getOne, runQuery } = require('../db');

const router = express.Router();

const VALID_THEMES = ['dark', 'light'];
const VALID_FONT_SIZES = ['small', 'medium', 'large'];
const VALID_LANGS = ['ru', 'en', 'zh', 'es', 'hi', 'ar'];

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
        if (typeof theme !== 'string' || !VALID_THEMES.includes(theme)) {
            return res.status(400).json({ error: 'Invalid theme' });
        }
        runQuery('UPDATE settings SET value = ? WHERE key = ?', [theme, 'theme']);
    }
    if (accentColor !== undefined) {
        if (typeof accentColor !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
            return res.status(400).json({ error: 'Invalid accent color' });
        }
        runQuery('UPDATE settings SET value = ? WHERE key = ?', [accentColor, 'accent_color']);
    }
    if (fontSize !== undefined) {
        if (typeof fontSize !== 'string' || !VALID_FONT_SIZES.includes(fontSize)) {
            return res.status(400).json({ error: 'Invalid font size' });
        }
        runQuery('UPDATE settings SET value = ? WHERE key = ?', [fontSize, 'font_size']);
    }
    if (lang !== undefined) {
        if (typeof lang !== 'string' || !VALID_LANGS.includes(lang)) {
            return res.status(400).json({ error: 'Invalid language' });
        }
        runQuery('UPDATE settings SET value = ? WHERE key = ?', [lang, 'lang']);
    }
    if (llmUrl !== undefined) {
        if (typeof llmUrl !== 'string' || llmUrl.length > 500) {
            return res.status(400).json({ error: 'Invalid LLM URL' });
        }
        runQuery('UPDATE settings SET value = ? WHERE key = ?', [llmUrl, 'llm_url']);
    }
    if (llmModel !== undefined) {
        if (typeof llmModel !== 'string' || llmModel.length > 200) {
            return res.status(400).json({ error: 'Invalid model name' });
        }
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
