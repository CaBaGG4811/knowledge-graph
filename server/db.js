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

            db.run(`
                CREATE TABLE IF NOT EXISTS saved_cards (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    label TEXT NOT NULL UNIQUE,
                    description TEXT,
                    difficulty INTEGER DEFAULT 3,
                    time TEXT,
                    topic TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // провайдеры ИИ (локальные и облачные)
            db.run(`
                CREATE TABLE IF NOT EXISTS providers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    base_url TEXT NOT NULL,
                    api_key TEXT,
                    model TEXT,
                    api_format TEXT DEFAULT 'openai',
                    auth_type TEXT DEFAULT 'bearer',
                    extra_headers TEXT,
                    preset_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // дефолтные настройки
            var defaults = {
                theme: 'dark',
                accent_color: '#4a7ab5',
                font_size: 'medium',
                lang: 'ru',
                llm_url: '',
                llm_model: '',
                active_provider_id: ''
            };
            Object.keys(defaults).forEach(function (k) {
                var exists = getOne('SELECT id FROM settings WHERE key = ?', [k]);
                if (!exists) {
                    runQuery('INSERT INTO settings (key, value) VALUES (?, ?)', [k, defaults[k]]);
                }
            });

            migrateLegacyProvider();

            saveToDisk();
            console.log('  База данных инициализирована');
        })();
    }
    return initPromise;
}

/* Переносит старые настройки llm_url/llm_model в таблицу провайдеров,
   чтобы пользователь увидел свою локальную модель в новом интерфейсе. */
function migrateLegacyProvider() {
    try {
        var count = getOne('SELECT COUNT(*) AS c FROM providers');
        if (count && count.c > 0) return;

        var activeRow = getOne("SELECT value FROM settings WHERE key = 'active_provider_id'");
        if (activeRow && activeRow.value) return;

        var urlRow = getOne("SELECT value FROM settings WHERE key = 'llm_url'");
        var legacyUrl = urlRow && urlRow.value ? String(urlRow.value) : '';
        if (!legacyUrl) return;

        var modelRow = getOne("SELECT value FROM settings WHERE key = 'llm_model'");
        var legacyModel = modelRow && modelRow.value ? String(modelRow.value) : '';

        runQuery(
            'INSERT INTO providers (name, base_url, api_key, model, api_format, auth_type, preset_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['Текущая модель', legacyUrl, '', legacyModel, 'openai', 'bearer', 'custom']
        );
        var created = getOne('SELECT id FROM providers ORDER BY id DESC LIMIT 1');
        if (created) {
            runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['active_provider_id', String(created.id)]);
        }
    } catch (e) {
        console.error('[DB] migrate providers:', e.message);
    }
}

function saveToDisk() {    if (!db) return;
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
