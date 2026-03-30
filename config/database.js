// config/database.js — SQLite setup (zero-config, file-based)
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_DIR  = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'neurochat.db');

// Create data directory if it doesn't exist
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Create tables ──
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    first_name  TEXT NOT NULL,
    last_name   TEXT DEFAULT '',
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    created_at  INTEGER DEFAULT (strftime('%s','now')),
    last_login  INTEGER
  );

  CREATE TABLE IF NOT EXISTS chats (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    title       TEXT NOT NULL,
    created_at  INTEGER DEFAULT (strftime('%s','now')),
    updated_at  INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id     TEXT NOT NULL,
    role        TEXT NOT NULL CHECK(role IN ('user','assistant')),
    content     TEXT NOT NULL,
    created_at  INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_msgs_chat  ON messages(chat_id, created_at);
`);

console.log('[DB] SQLite database ready:', DB_PATH);

module.exports = db;
