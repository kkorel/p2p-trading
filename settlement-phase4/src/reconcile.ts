import { openDb, initDb } from './db';
import { StepLogger } from './logger';

export function reconcileExpiredBlocks(args: { dbPath?: string; nowIso?: string; logger: StepLogger }) {
  const { dbPath, nowIso, logger } = args;
  const db = openDb(dbPath ?? 'escrow.db');
  try {
    initDb(db);
    const now = nowIso ?? new Date().toISOString();
    const g7 = logger.group(7, 'Reconciliation');
    g7.info(`scanning for expired before ${now}`);
    const rows = db.prepare("SELECT trade_id, block_id, expires_at FROM fund_blocks WHERE status = 'BLOCKED'").all();
    let expired = 0;
    const expiredTradeIds: string[] = [];
    for (const r of rows) {
      const exp = r.expires_at;
      if (!exp) continue;
      if (exp < now) {
        db.prepare("UPDATE fund_blocks SET status = 'EXPIRED' WHERE block_id = ?").run(r.block_id);
        expired++;
        expiredTradeIds.push(r.trade_id);
      }
    }
    g7.info(`checked=${rows.length} expired=${expired}`);
    g7.done();
    return { checked: rows.length, expired, expiredTradeIds };
  } finally {
    try { db.close(); } catch (e) {}
  }
}
