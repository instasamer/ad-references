import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const DB_PATH = './data/agency.sqlite';

let db = null;

export async function getDb() {
  if (db) return db;

  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const SQL = await initSqlJs();

  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  initTables();
  return db;
}

function initTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      website TEXT,
      google_maps_url TEXT,
      place_id TEXT UNIQUE,
      latitude REAL,
      longitude REAL,
      rating REAL,
      review_count INTEGER DEFAULT 0,
      business_type TEXT,
      city TEXT DEFAULT 'Málaga',

      -- Audit fields
      has_website INTEGER DEFAULT 0,
      website_grade TEXT,
      audit_notes TEXT,
      audited_at TEXT,

      -- Site builder fields
      generated_site_slug TEXT,
      site_built_at TEXT,

      -- Outreach fields
      whatsapp_sent INTEGER DEFAULT 0,
      whatsapp_sent_at TEXT,
      whatsapp_response TEXT,

      -- Pipeline status
      status TEXT DEFAULT 'scraped',

      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS scrape_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT,
      location TEXT,
      results_count INTEGER DEFAULT 0,
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      channel TEXT DEFAULT 'whatsapp',
      direction TEXT DEFAULT 'outbound',
      message TEXT,
      sent_at TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'sent',
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phase TEXT,
      status TEXT DEFAULT 'running',
      details TEXT,
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    )
  `);

  saveDb();
}

export function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}

export function runQuery(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function runExec(sql, params = []) {
  db.run(sql, params);
  saveDb();
}
