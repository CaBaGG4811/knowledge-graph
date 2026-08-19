const http = require('http');
const https = require('https');

const LLM_API_KEY = process.env.LLM_API_KEY || '';

function llmFetch(url, body, extraHeaders) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const isHttps = parsed.protocol === 'https:';
        const lib = isHttps ? https : http;
        const data = JSON.stringify(body);
        const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
        if (LLM_API_KEY) headers['Authorization'] = 'Bearer ' + LLM_API_KEY;
        if (extraHeaders) Object.assign(headers, extraHeaders);
        const req = lib.request({
            hostname: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname + (parsed.search || ''),
            method: 'POST',
            headers,
            timeout: 600000
        }, (res) => {
            let chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, json: () => Promise.resolve(JSON.parse(Buffer.concat(chunks).toString())), text: () => Promise.resolve(Buffer.concat(chunks).toString()) }));
        });
        req.setTimeout(600000, () => { req.destroy(); reject(new Error('LLM timeout')); });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

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

function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/```[\s\S]*?```/g, '')
        .replace(/#{1,6}\s*/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .replace(/_(.*?)_/g, '$1')
        .replace(/\$[^$]+\$/g, '')
        .replace(/\\\([^)]+\\\)/g, '')
        .replace(/\\\[[^\]]+\\\]/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^\s*[-*+]\s+/gm, '  — ')
        .replace(/^\s*\d+\.\s+/gm, '  ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function parseThinkingContent(text) {
    if (!text || text.length < 20) return null;
    try {
        const jsonMatch = text.match(/\{[\s\S]*"nodes"\s*:\s*\[[\s\S]*\][\s\S]*"edges"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.nodes && parsed.edges) return parsed;
            } catch (_) {}
        }
        const nodes = [];
        const edges = [];
        const blockRegex = /\*?\*?(?:Node|Узел)\s*\d+[.:*\s]+\s*(\w+)/gi;
        let match;
        const positions = [];
        while ((match = blockRegex.exec(text)) !== null) {
            positions.push({ id: match[1].replace(/[:*\s*]/g, ''), pos: match.index });
        }
        if (positions.length === 0) {
            const altRegex = /^[\s\-*]*(\w{2,})\s*[:=\-]/gm;
            while ((match = altRegex.exec(text)) !== null) {
                if (match[1].length > 2 && !/^(label|desc|why|diff|time|level|lead|node|edge|json|tree|type|id|name)$/i.test(match[1])) {
                    positions.push({ id: match[1], pos: match.index });
                }
            }
        }
        for (let i = 0; i < positions.length; i++) {
            const start = positions[i].pos;
            const end = i + 1 < positions.length ? positions[i + 1].pos : text.length;
            const block = text.substring(start, end);
            const defaultId = positions[i].id;
            const idM = block.match(/(?:id|Node\s*\d+)[:\s]+["']?(\w[\w-]*)/i) || { 1: defaultId };
            const labelM = block.match(/(?:Label|Название|name)[:\s]+(.+)/i);
            const descM = block.match(/(?:Desc|Description|Описание)[:\s]+(.+)/i);
            const whyM = block.match(/(?:Why|Зачем|Польза)[:\s]+(.+)/i);
            const diffM = block.match(/(?:Diff|Difficulty|Сложность)[:\s]+(\d)/i);
            const timeM = block.match(/(?:Time|Время)[:\s]+(.+)/i);
            const levelM = block.match(/(?:Level|Уровень)[:\s]+(\d)/i);
            const leadsM = block.match(/(?:LeadsTo|leads_to|Связи)[:\s]*\[([^\]]*)\]/i);
            const id = idM[1].replace(/[:*\s"']/g, '');
            if (!id || id.length < 2) continue;
            const label = (labelM ? labelM[1] : id).trim().replace(/[*"']/g, '').substring(0, 100);
            if (!label || label.length < 1) continue;
            nodes.push({
                id, label,
                description: descM ? descM[1].trim().replace(/[*"']/g, '').substring(0, 300) : '',
                why: whyM ? whyM[1].trim().replace(/[*"']/g, '').substring(0, 200) : '',
                difficulty: diffM ? Math.min(5, Math.max(1, parseInt(diffM[1], 10))) : 3,
                time: timeM ? timeM[1].trim().replace(/[*"']/g, '').substring(0, 50) : '',
                level: levelM ? Math.min(3, Math.max(1, parseInt(levelM[1], 10))) : 1,
                leadsTo: leadsM ? leadsM[1].split(/[,\s]+/).filter(s => s.length > 1).map(s => s.replace(/[*"'\s]/g, '')) : []
            });
        }
        if (nodes.length === 0) return null;
        const nodeIds = new Set(nodes.map(n => n.id));
        for (const n of nodes) {
            for (const t of (n.leadsTo || [])) {
                if (nodeIds.has(t) && t !== n.id) edges.push({ source: n.id, target: t });
            }
        }
        if (edges.length === 0 && nodes.length > 1) {
            for (let i = 0; i < nodes.length - 1; i++) edges.push({ source: nodes[i].id, target: nodes[i + 1].id });
        }
        return { nodes, edges };
    } catch (_) { return null; }
}

function tryRepairJson(text) {
    try {
        const nodesMatch = text.match(/"nodes"\s*:\s*\[([\s\S]*)/);
        if (!nodesMatch) return null;
        let chunk = '[' + nodesMatch[1];
        const openBraces = (chunk.match(/{/g) || []).length;
        const closeBraces = (chunk.match(/}/g) || []).length;
        chunk += '}'.repeat(Math.max(0, openBraces - closeBraces));
        chunk += ']';
        const nodes = [];
        const re = /\{[^{}]*"id"\s*:\s*"([^"]+)"[^{}]*"label"\s*:\s*"([^"]*)"[^{}]*\}/g;
        let m;
        while ((m = re.exec(chunk)) !== null) {
            try { nodes.push(JSON.parse(m[0])); } catch (_) {}
        }
        if (nodes.length === 0) return null;
        const edges = [];
        nodes.forEach(n => {
            (n.leadsTo || []).forEach(target => {
                if (nodes.find(x => x.id === target)) edges.push({ source: n.id, target });
            });
        });
        return { nodes, edges };
    } catch (_) { return null; }
}

module.exports = { llmFetch, webSearch, cleanText, parseThinkingContent, tryRepairJson };
