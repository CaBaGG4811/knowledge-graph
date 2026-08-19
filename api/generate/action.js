const { llmFetch, cleanText } = require('../../_lib');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { action, label, description, llmUrl: userLlmUrl, llmModel: userLlmModel } = req.body || {};
    const llmUrl = userLlmUrl || process.env.LLM_URL || 'http://127.0.0.1:1234/v1/chat/completions';
    const llmModel = userLlmModel || process.env.LLM_MODEL || 'google/gemma-4-12b-qat';

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
        const llmResponse = await llmFetch(llmUrl, {
            model: llmModel,
            messages: [
                { role: 'system', content: 'Пиши кратко и по делу. Без воды, без roleplay, без «как преподавателя».' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.4,
            max_tokens: 4096
        }, undefined, llmApiKey);

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
};
