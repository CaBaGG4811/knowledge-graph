require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { ensureInit } = require('./db');

const treesRoutes = require('./routes/trees');
const generateRoutes = require('./routes/generate');
const settingsRoutes = require('./routes/settings');
const cardsRoutes = require('./routes/cards');
const providersRoutes = require('./routes/providers');

const app = express();
const PORT = process.env.PORT || 3000;

// Только свой origin и localhost: чужие сайты не должны читать API-ключи с этого сервера
app.use((req, res, next) => {
    var origin = req.headers.origin;
    if (!origin) return next();
    var allowed = false;
    try {
        var originHost = new URL(origin).host;
        allowed = originHost === req.headers.host || /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(originHost);
    } catch (e) {}
    if (!allowed) return res.status(403).json({ error: 'CORS: origin not allowed' });
    cors({ origin: origin })(req, res, next);
});
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
app.use('/api/cards', cardsRoutes);
app.use('/api/providers', providersRoutes);

app.get('/{*any}', (req, res) => {
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
