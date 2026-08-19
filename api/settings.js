const settings = {
    theme: 'dark',
    accent_color: '#e0e0e0',
    font_size: 'medium',
    lang: 'ru',
    llm_url: '',
    llm_model: '',
    llm_api_key: ''
};

const VALID_THEMES = ['dark', 'light'];
const VALID_FONT_SIZES = ['small', 'medium', 'large'];
const VALID_LANGS = ['ru', 'en', 'zh', 'es', 'hi', 'ar'];

module.exports = function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        return res.json({
            theme: settings.theme,
            accentColor: settings.accent_color,
            fontSize: settings.font_size,
            lang: settings.lang,
            llmUrl: settings.llm_url,
            llmModel: settings.llm_model,
            llmApiKey: settings.llm_api_key
        });
    }

    if (req.method === 'PUT') {
        const { theme, accentColor, fontSize, lang, llmUrl, llmModel, llmApiKey } = req.body || {};

        if (theme !== undefined) {
            if (typeof theme === 'string' && VALID_THEMES.includes(theme)) settings.theme = theme;
        }
        if (accentColor !== undefined) {
            if (typeof accentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(accentColor)) settings.accent_color = accentColor;
        }
        if (fontSize !== undefined) {
            if (typeof fontSize === 'string' && VALID_FONT_SIZES.includes(fontSize)) settings.font_size = fontSize;
        }
        if (lang !== undefined) {
            if (typeof lang === 'string' && VALID_LANGS.includes(lang)) settings.lang = lang;
        }
        if (llmUrl !== undefined) {
            if (typeof llmUrl === 'string' && llmUrl.length <= 500) settings.llm_url = llmUrl;
        }
        if (llmModel !== undefined) {
            if (typeof llmModel === 'string' && llmModel.length <= 200) settings.llm_model = llmModel;
        }
        if (llmApiKey !== undefined) {
            if (typeof llmApiKey === 'string' && llmApiKey.length <= 500) settings.llm_api_key = llmApiKey;
        }

        return res.json({
            theme: settings.theme,
            accentColor: settings.accent_color,
            fontSize: settings.font_size,
            lang: settings.lang,
            llmUrl: settings.llm_url,
            llmModel: settings.llm_model,
            llmApiKey: settings.llm_api_key
        });
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
