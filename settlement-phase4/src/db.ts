import BetterSqlite3 from 'better-sqlite3';

export function openDb(path = 'escrow.db') {
  const db = new BetterSqlite3(path);
  return db;
}

export function initDb(db: any) {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS trades(
      trade_id TEXT PRIMARY KEY,
      buyer_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      principal_inr REAL NOT NULL,
      duration_sec INTEGER NOT NULL
    )`
  ).run();

  db.prepare(
    `CREATE TABLE IF NOT EXISTS fund_blocks(
      block_id TEXT PRIMARY KEY,
      trade_id TEXT NOT NULL UNIQUE,
      total_blocked_inr REAL NOT NULL,
      fee_inr REAL NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT
    )`
  ).run();

  // Migration: ensure expires_at column exists for older DBs
  const info = db.prepare("PRAGMA table_info('fund_blocks')").all();
  const hasExpires = info.some((r: any) => r.name === 'expires_at');
  if (!hasExpires) {
    try {
      db.prepare('ALTER TABLE fund_blocks ADD COLUMN expires_at TEXT').run();
    } catch (e) {
      // ignore if cannot alter
    }
  }

  db.prepare(
    `CREATE TABLE IF NOT EXISTS transfers(
      transfer_id TEXT PRIMARY KEY,
      trade_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      amount_inr REAL NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(trade_id, kind)
    )`
  ).run();
}
