const http = require('http');
const https = require('https');

function fetchUrl(url, timeout) {
    return new Promise(function (resolve, reject) {
        var mod = url.startsWith('https') ? https : http;
        var req = mod.get(url, { timeout: timeout || 10000, headers: { 'User-Agent': 'Mozilla/5.0' } }, function (res) {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchUrl(res.headers.location, timeout).then(resolve).catch(reject);
            }
            var data = '';
            res.on('data', function (chunk) { data += chunk; });
            res.on('end', function () { resolve(data); });
        });
        req.on('error', reject);
        req.on('timeout', function () { req.destroy(); reject(new Error('timeout')); });
    });
}

function extractSearchResults(html) {
    var results = [];
    var snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    var titleRegex = /<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/gi;
    var snippets = [];
    var titles = [];
    var m;
    while ((m = snippetRegex.exec(html)) !== null) {
        snippets.push(m[1].replace(/<[^>]+>/g, '').trim());
    }
    while ((m = titleRegex.exec(html)) !== null) {
        titles.push(m[1].replace(/<[^>]+>/g, '').trim());
    }
    for (var i = 0; i < Math.min(snippets.length, 5); i++) {
        results.push((titles[i] ? titles[i] + ': ' : '') + snippets[i]);
    }
    return results;
}

async function webSearch(query) {
    try {
        var encoded = encodeURIComponent(query);
        var url = 'https://html.duckduckgo.com/html/?q=' + encoded;
        var html = await fetchUrl(url, 12000);
        var results = extractSearchResults(html);
        if (results.length === 0) {
            url = 'https://lite.duckduckgo.com/lite/?q=' + encoded;
            html = await fetchUrl(url, 12000);
            results = extractSearchResults(html);
        }
        return results;
    } catch (e) {
        console.error('[Search]', e.message);
        return [];
    }
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { topic } = req.body || {};
    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
        return res.status(400).json({ error: 'Тема пустая.' });
    }

    console.log('[Search] Searching for:', topic.trim());
    var results = await webSearch(topic.trim());
    console.log('[Search] Found', results.length, 'results');

    res.json({ results: results });
};
