const express = require('express');
const { getOne, getAll, runQuery } = require('../db');

const router = express.Router();

function cleanCard(c) {
    return {
        id: c.id,
        label: c.label,
        description: c.description || '',
        difficulty: c.difficulty || 3,
        time: c.time || '',
        topic: c.topic || '',
        created_at: c.created_at
    };
}

router.get('/', (req, res) => {
    try {
        const cards = getAll('SELECT * FROM saved_cards ORDER BY created_at DESC, id DESC').map(cleanCard);
        res.json({ cards });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/exists', (req, res) => {
    const label = String(req.query.label || '').trim();
    if (!label) return res.json({ exists: false });
    try {
        const row = getOne('SELECT id FROM saved_cards WHERE label = ?', [label]);
        res.json({ exists: !!row, id: row ? row.id : null });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/', (req, res) => {
    const { label, description, difficulty, time, topic } = req.body || {};
    if (!label || !String(label).trim()) {
        return res.status(400).json({ error: 'Название карточки обязательно' });
    }
    try {
        runQuery(
            'INSERT INTO saved_cards (label, description, difficulty, time, topic) VALUES (?, ?, ?, ?, ?) ' +
            'ON CONFLICT(label) DO UPDATE SET description = excluded.description, difficulty = excluded.difficulty, time = excluded.time, topic = excluded.topic',
            [String(label).trim().slice(0, 200), description || '', Number(difficulty) || 3, time || '', topic || '']
        );
        const card = getOne('SELECT * FROM saved_cards WHERE label = ?', [String(label).trim().slice(0, 200)]);
        res.json(cleanCard(card));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/:id', (req, res) => {
    const card = getOne('SELECT id FROM saved_cards WHERE id = ?', [req.params.id]);
    if (!card) return res.status(404).json({ error: 'Карточка не найдена' });
    runQuery('DELETE FROM saved_cards WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
});

module.exports = router;
