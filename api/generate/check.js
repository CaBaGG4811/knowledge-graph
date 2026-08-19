const { llmFetch } = require('../_lib');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { topic } = req.body || {};
    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
        return res.json({ valid: false, reason: 'Тема пустая.' });
    }
    if (topic.trim().length > 500) {
        return res.json({ valid: false, reason: 'Тема слишком длинная.' });
    }

    const trimmedTopic = topic.trim();
    const llmUrl = process.env.LLM_URL || 'http://127.0.0.1:1234/v1/chat/completions';
    const llmModel = process.env.LLM_MODEL || 'google/gemma-4-12b-qat';

    try {
        const checkPrompt = `Оцени тему для дерева знаний: «${trimmedTopic}».

Твоё задание: определи, можно ли построить полноценное дерево знаний из 12-15 узлов по этой теме.

Отвечай ТОЛЬКО JSON без markdown:
{"valid":true,"reason":"Тема подходит для построения дерева знаний."}
или
{"valid":false,"reason":"Краткая причина почему тема не подходит."}

Тема НЕ подходит если:
- Это бессмыслица, набор случайных слов, мусор
- Это слишком узкая/конкретная вещь (имя одного человека, название одной книги)
- Это оскорбления, мат, провокация
- Невозможно построить дерево из 12+ связанных концептов

Тема ПОДХОДИТ если:
- Это осмысленная тема из любой области
- Даже если тема необычная — можно найти связанные концепты
- Даже разговорная/простая формулировка норм («ручка» → дерево про пишушие инструменты)`;

        const llmResponse = await llmFetch(llmUrl, {
            model: llmModel,
            messages: [
                { role: 'system', content: 'Ты строгий валидатор тем. Отвечай только JSON.' },
                { role: 'user', content: checkPrompt }
            ],
            temperature: 0.1,
            max_tokens: 200
        });

        if (!llmResponse.ok) {
            return res.json({ valid: true, reason: '' });
        }

        const llmData = await llmResponse.json();
        var rawContent = (llmData.choices?.[0]?.message?.content || llmData.choices?.[0]?.message?.reasoning_content || '').toString();

        var jsonMatch = rawContent.match(/\{[\s\S]*"valid"[\s\S]*\}/);
        if (jsonMatch) {
            var parsed = JSON.parse(jsonMatch[0]);
            return res.json({ valid: !!parsed.valid, reason: parsed.reason || '' });
        }

        return res.json({ valid: true, reason: '' });
    } catch (err) {
        console.error('[Check]', err.message);
        return res.json({ valid: true, reason: '' });
    }
};
