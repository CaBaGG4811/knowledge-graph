const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'knowledge-graph.db');
let db = null;
let initPromise = null;
let saveTimeout = null;

function ensureInit() {
    if (!initPromise) {
        initPromise = (async function () {
            const SQL = await initSqlJs();

            if (fs.existsSync(DB_PATH)) {
                const fileBuffer = fs.readFileSync(DB_PATH);
                db = new SQL.Database(fileBuffer);
            } else {
                db = new SQL.Database();
            }

            db.run(`
                CREATE TABLE IF NOT EXISTS trees (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    graph_data TEXT NOT NULL,
                    topic TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            db.run(`
                CREATE TABLE IF NOT EXISTS settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT UNIQUE NOT NULL,
                    value TEXT
                )
            `);

            // дефолтные настройки
            var defaults = {
                theme: 'dark',
                accent_color: '#4a7ab5',
                font_size: 'medium',
                lang: 'ru'
            };
            Object.keys(defaults).forEach(function (k) {
                var exists = getOne('SELECT id FROM settings WHERE key = ?', [k]);
                if (!exists) {
                    runQuery('INSERT INTO settings (key, value) VALUES (?, ?)', [k, defaults[k]]);
                }
            });

            saveToDisk();
            console.log('  База данных инициализирована');
        })();
    }
    return initPromise;
}

function saveToDisk() {
    if (!db) return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        try {
            const data = db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(DB_PATH, buffer);
        } catch (e) {
            console.error('[DB] save error:', e.message);
        }
    }, 500);
}

function runQuery(sql, params) {
    db.run(sql, params || []);
    saveToDisk();
}

function getOne(sql, params) {
    const stmt = db.prepare(sql);
    if (params) stmt.bind(params);
    if (stmt.step()) {
        const cols = stmt.getColumnNames();
        const vals = stmt.get();
        stmt.free();
        const row = {};
        cols.forEach(function (c, i) { row[c] = vals[i]; });
        return row;
    }
    stmt.free();
    return null;
}

function getAll(sql, params) {
    const results = [];
    const stmt = db.prepare(sql);
    if (params) stmt.bind(params);
    while (stmt.step()) {
        const cols = stmt.getColumnNames();
        const vals = stmt.get();
        const row = {};
        cols.forEach(function (c, i) { row[c] = vals[i]; });
        results.push(row);
    }
    stmt.free();
    return results;
}

module.exports = { ensureInit, runQuery, getOne, getAll, saveToDisk };
