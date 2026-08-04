const express = require('express');
const http = require('http');
const https = require('https');
const { getOne } = require('../db');

const router = express.Router();

const DEFAULT_LLM_URL = process.env.LLM_URL || 'http://172.25.64.1:1234/v1/chat/completions';
const DEFAULT_LLM_MODEL = process.env.LLM_MODEL || 'google/gemma-4-12b-qat';
const LLM_API_KEY = process.env.LLM_API_KEY || '';

function getLlmConfig() {
    var url = (getOne('SELECT value FROM settings WHERE key = ?', ['llm_url']) || {}).value || '';
    var model = (getOne('SELECT value FROM settings WHERE key = ?', ['llm_model']) || {}).value || '';
    return {
        url: url || DEFAULT_LLM_URL,
        model: model || DEFAULT_LLM_MODEL
    };
}

/* ============================================
   Web Search — DuckDuckGo HTML
   ============================================ */
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

function parseThinkingContent(text) {
    if (!text || text.length < 20) return null;
    try {
        const jsonMatch = text.match(/\{[\s\S]*"nodes"\s*:\s*\[[\s\S]*\][\s\S]*"edges"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.nodes && parsed.edges) {
                    console.log('[Thinking] Found embedded JSON in reasoning');
                    return parsed;
                }
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
                id,
                label,
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
                if (nodeIds.has(t) && t !== n.id) {
                    edges.push({ source: n.id, target: t });
                }
            }
        }
        if (edges.length === 0 && nodes.length > 1) {
            for (let i = 0; i < nodes.length - 1; i++) {
                edges.push({ source: nodes[i].id, target: nodes[i + 1].id });
            }
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
            try {
                const obj = JSON.parse(m[0]);
                nodes.push(obj);
            } catch (_) {}
        }
        if (nodes.length === 0) return null;
        const edges = [];
        nodes.forEach(n => {
            (n.leadsTo || []).forEach(target => {
                if (nodes.find(x => x.id === target)) {
                    edges.push({ source: n.id, target });
                }
            });
        });
        return { nodes, edges };
    } catch (_) { return null; }
}

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
            timeout: 600000,
            agent: isHttps ? https.globalAgent : http.globalAgent
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

// убираем markdown, LaTeX и мусор из текста
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

router.post('/', async (req, res) => {
    const { topic } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
        return res.status(400).json({ error: 'Тема пустая.' });
    }

    if (topic.trim().length > 500) {
        return res.status(400).json({ error: 'Тема слишком длинная (макс. 500 символов).' });
    }

    const trimmedTopic = topic.trim();

    console.log('[Search] Searching for:', trimmedTopic);
    var searchResults = await webSearch(trimmedTopic);
    var searchContext = '';
    if (searchResults.length > 0) {
        searchContext = '\n\nАктуальная информация из интернета для проверки:\n' + searchResults.map(function (r, i) { return (i + 1) + '. ' + r; }).join('\n');
        console.log('[Search] Found', searchResults.length, 'results');
    } else {
        console.log('[Search] No results');
    }

    const systemPrompt = 'Ты помогаешь строить карту знаний. Отвечай ТОЛЬКО валидным JSON без markdown, без пояснений, без кодбеков. Используй предоставленную информацию из интернета для точности.';

    const userPrompt = `Дерево знаний по теме «${trimmedTopic}», 12-15 узлов.
Используй факты из предоставленной информации. Если информации нет — используй свои знания, но стремись к точности.
${searchContext}

Каждый узел:
{
  "id": "id",
  "label": "Название",
  "description": "Что это. 3-5 предложений, простым ясным языком, без воды.",
  "why": "Зачем учить. Конкретная польза. 1-2 предложения.",
  "difficulty": 1-5,
  "time": "время изучения",
  "level": 1-3,
  "leadsTo": ["id"]
}

Только JSON:
{"nodes":[...],"edges":[{"source":"id","target":"id"}]}

- id — латиница без пробелов
- level: 1=базовый, 2=средний, 3=продвинутый
- difficulty: 1=легко, 3=средне, 5=сложно
- leadsTo — куда ведёт тема
- 12-15 узлов минимум`;

    try {
        var llmCfg = getLlmConfig();
        const llmResponse = await llmFetch(llmCfg.url, {
            model: llmCfg.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.3,
            max_tokens: 8192
        });

        if (!llmResponse.ok) {
            const errorText = await llmResponse.text();
            console.error('[LLM]', llmResponse.status, errorText);
            return res.status(502).json({ error: `LM Studio: ${llmResponse.status}` });
        }

        const llmData = await llmResponse.json();
        const msg = llmData.choices?.[0]?.message;
        const rawContent = (msg?.content || msg?.reasoning_content || '').toString();
        const hasReasoning = !!(msg?.reasoning_content);
        const hasContent = !!(msg?.content);
        console.log('[LLM] content length:', (msg?.content || '').length, '| reasoning length:', (msg?.reasoning_content || '').length);
        if (hasReasoning) console.log('[LLM] reasoning preview:', rawContent.substring(0, 300));
        const cleaned = rawContent.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch (parseError) {
            const repaired = tryRepairJson(cleaned);
            if (repaired) {
                parsed = repaired;
            } else {
                const thinkingParsed = parseThinkingContent(rawContent);
                if (thinkingParsed && thinkingParsed.nodes.length >= 3) {
                    console.log('[Thinking] Parsed', thinkingParsed.nodes.length, 'nodes from reasoning_content');
                    parsed = thinkingParsed;
                } else {
                    console.error('[JSON]', cleaned.substring(0, 200));
                    return res.status(500).json({ error: 'Модель вернула некорректный JSON.' });
                }
            }
        }

        if (!parsed.nodes || !Array.isArray(parsed.nodes) || !parsed.edges || !Array.isArray(parsed.edges)) {
            return res.status(500).json({ error: 'Нет nodes или edges.' });
        }

        parsed.nodes = parsed.nodes.map(n => ({
            id: String(n.id),
            label: n.label || 'Без названия',
            description: cleanText(n.description || ''),
            why: cleanText(n.why || ''),
            difficulty: Math.min(5, Math.max(1, parseInt(n.difficulty, 10) || 3)),
            time: n.time || '',
            level: Math.min(3, Math.max(1, parseInt(n.level, 10) || 1)),
            leadsTo: Array.isArray(n.leadsTo) ? n.leadsTo.map(String) : []
        }));

        parsed.edges = parsed.edges
            .filter(e => e.source && e.target)
            .map(e => ({ source: String(e.source), target: String(e.target) }));

        const nodeIds = new Set(parsed.nodes.map(n => n.id));
        parsed.edges = parsed.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

        res.json(parsed);

    } catch (networkError) {
        console.error('[Сеть]', networkError.message);
        res.status(502).json({ error: 'LLM недоступен.' });
    }
});

// AI-действия
router.post('/action', async (req, res) => {
    const { action, label, description } = req.body;

    const prompts = {
        detail: `Объясни подробно: «${label}». ${description || ''}. Развёрнуто, 5-8 предложений, с примерами.`,
        simple: `Объясни просто: «${label}». Без терминов, простыми словами. 4-6 предложений.`,
        child: `Объясни ребёнку 10 лет: «${label}». Простые слова, аналогии из жизни. 4-5 предложений.`,
        example: `2-3 примера: «${label}». Конкретные, наглядные. 2-3 предложения на каждый.`,
        quiz: `3 вопроса по теме «${label}» с 4 ответами. ТОЛЬКО JSON:
[{"q":"Вопрос?","options":["A","B","C","D"],"correct":0}]`,
        mistakes: `3-5 ошибок при изучении «${label}». Что ошибаются и как избежать. 2 предложения на каждую.`,
        summary: `Конспект «${label}». Тезисы, определения, ключевые факты.`
    };

    const prompt = prompts[action];
    if (!prompt) return res.status(400).json({ error: 'Неизвестное действие' });

    try {
        var llmCfg = getLlmConfig();
        const llmResponse = await llmFetch(llmCfg.url, {
            model: llmCfg.model,
            messages: [
                { role: 'system', content: 'Пиши кратко и по делу. Без воды, без roleplay, без «как преподавателя».' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.4,
            max_tokens: 4096
        });

        if (!llmResponse.ok) return res.status(502).json({ error: 'LLM недоступен' });

        const llmData = await llmResponse.json();
        var rawContent = (llmData.choices?.[0]?.message?.content || llmData.choices?.[0]?.message?.reasoning_content || '').toString();

        if (action === 'quiz') {
            try {
                var cleaned = rawContent.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                var match = cleaned.match(/\[[\s\S]*\]/);
                if (match) {
                    var quizData = JSON.parse(match[0]);
                    if (Array.isArray(quizData) && quizData.length > 0) {
                        quizData = quizData.map(function (q) {
                            var correctIdx = parseInt(q.correct, 10) || 1;
                            if (correctIdx > 0 && correctIdx <= (q.options || []).length) correctIdx--;
                            else correctIdx = 0;
                            return { q: q.q || q.question || '', options: q.options || q.answers || [], correct: correctIdx };
                        });
                        return res.json({ action, data: quizData });
                    }
                }
            } catch (e) { console.error('[quiz parse]', e.message); }
            var text = cleanText(rawContent);
            return res.json({ action, data: text });
        }

        var text = cleanText(rawContent);

        res.json({ action, data: text });
    } catch (err) {
        console.error('[AI]', err.message);
        res.status(502).json({ error: err.message });
    }
});

module.exports = router;
