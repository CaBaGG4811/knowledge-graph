const http = require('http');
const https = require('https');
const { llmFetch, webSearch, cleanText, parseThinkingContent, tryRepairJson } = require('./_lib');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { topic } = req.body || {};
    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
        return res.status(400).json({ error: 'Тема пустая.' });
    }
    if (topic.trim().length > 500) {
        return res.status(400).json({ error: 'Тема слишком длинная (макс. 500 символов).' });
    }

    const trimmedTopic = topic.trim();
    const { llmUrl: userLlmUrl, llmModel: userLlmModel } = req.body || {};
    const llmUrl = userLlmUrl || process.env.LLM_URL || 'http://127.0.0.1:1234/v1/chat/completions';
    const llmModel = userLlmModel || process.env.LLM_MODEL || 'google/gemma-4-12b-qat';

    console.log('[Search] Searching for:', trimmedTopic);
    var searchResults = await webSearch(trimmedTopic);
    var searchContext = '';
    if (searchResults.length > 0) {
        searchContext = '\n\nАктуальная информация из интернета для проверки:\n' + searchResults.map(function (r, i) { return (i + 1) + '. ' + r; }).join('\n');
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
        const llmResponse = await llmFetch(llmUrl, {
            model: llmModel,
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
            return res.status(502).json({ error: `LLM: ${llmResponse.status}` });
        }

        const llmData = await llmResponse.json();
        const msg = llmData.choices?.[0]?.message;
        const rawContent = (msg?.content || msg?.reasoning_content || '').toString();
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
                    parsed = thinkingParsed;
                } else {
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
};
