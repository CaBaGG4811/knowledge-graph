require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { ensureInit } = require('./db');

const treesRoutes = require('./routes/trees');
const generateRoutes = require('./routes/generate');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'] }));
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
    if (req.url.match(/\.(css|js)$/)) {
        res.set('Cache-Control', 'no-store');
    }
    next();
});
app.use(express.static(path.join(__dirname, '..', 'client')));

app.use('/api/trees', treesRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/settings', settingsRoutes);

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

(async function () {
    console.log('');
    await ensureInit();
    var server = app.listen(PORT, () => {
        console.log('');
        console.log('  ╔══════════════════════════════════════╗');
        console.log('  ║       Карта знаний                   ║');
        console.log('  ╠══════════════════════════════════════╣');
        console.log(`  ║  http://localhost:${PORT}               ║`);
        console.log('  ╚══════════════════════════════════════╝');
        console.log('');
    });
    server.setTimeout(600000);
})();
