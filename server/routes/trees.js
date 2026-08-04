const express = require('express');
const { getOne, getAll, runQuery } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
    const trees = getAll('SELECT id, name, topic, graph_data, created_at FROM trees ORDER BY created_at DESC');
    res.json({ trees });
});

router.get('/:id', (req, res) => {
    const tree = getOne('SELECT * FROM trees WHERE id = ?', [req.params.id]);
    if (!tree) return res.status(404).json({ error: 'Дерево не найдено' });
    res.json({ tree: { ...tree, graph_data: JSON.parse(tree.graph_data) } });
});

router.post('/', (req, res) => {
    const { name, graph_data, topic } = req.body;
    if (!name || !graph_data) {
        return res.status(400).json({ error: 'Название и данные обязательны' });
    }
    runQuery('INSERT INTO trees (name, graph_data, topic) VALUES (?, ?, ?)',
        [name, JSON.stringify(graph_data), topic || null]);
    const tree = getOne('SELECT id, name, topic, created_at FROM trees ORDER BY id DESC LIMIT 1');
    res.json(tree);
});

router.delete('/:id', (req, res) => {
    const tree = getOne('SELECT id FROM trees WHERE id = ?', [req.params.id]);
    if (!tree) return res.status(404).json({ error: 'Дерево не найдено' });
    runQuery('DELETE FROM trees WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
});

module.exports = router;
