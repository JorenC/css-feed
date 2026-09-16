import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

const dir = path.dirname(config.dbPath);
if (dir && dir !== ".") {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new Database(config.dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS watched_channels (
    channel_id TEXT PRIMARY KEY,
    guild_id   TEXT NOT NULL,
    name       TEXT NOT NULL,
    watched_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    seq          INTEGER PRIMARY KEY AUTOINCREMENT,
    id           TEXT NOT NULL,
    channel_id   TEXT NOT NULL,
    author_id    TEXT,
    author_name  TEXT,
    author_avatar TEXT,
    content      TEXT,
    created_at   TEXT NOT NULL,
    edited_at    TEXT,
    attachments  TEXT,
    UNIQUE(id, channel_id)
  );

  CREATE INDEX IF NOT EXISTS idx_messages_channel_seq ON messages(channel_id, seq);
`);
