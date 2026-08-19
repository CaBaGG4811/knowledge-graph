let trees = [];
let nextId = 1;

module.exports = function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        return res.json({ trees: trees.slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')) });
    }

    if (req.method === 'POST') {
        const { name, graph_data, topic } = req.body || {};
        if (!name || !graph_data) {
            return res.status(400).json({ error: 'Название и данные обязательны' });
        }
        const tree = {
            id: nextId++,
            name,
            topic: topic || null,
            graph_data: typeof graph_data === 'string' ? graph_data : JSON.stringify(graph_data),
            created_at: new Date().toISOString()
        };
        trees.push(tree);
        if (trees.length > 50) trees = trees.slice(-50);
        return res.json({ id: tree.id, name: tree.name, topic: tree.topic, created_at: tree.created_at });
    }

    if (req.method === 'DELETE') {
        trees = [];
        nextId = 1;
        return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
