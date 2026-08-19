module.exports = function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id } = req.query || {};
    if (!id) return res.status(400).json({ error: 'ID required' });

    const numId = parseInt(id, 10);

    if (req.method === 'GET') {
        const trees = require('./trees');
        return res.status(404).json({ error: 'Дерево не найдено' });
    }

    if (req.method === 'DELETE') {
        return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
