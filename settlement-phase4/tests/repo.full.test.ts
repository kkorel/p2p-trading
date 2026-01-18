import fs from 'fs';
import path from 'path';
import { describe, it, expect, afterEach } from 'vitest';
import { openDb, initDb } from '../src/db';
import { upsertTrade, insertFundBlockIdempotent, insertTransferIdempotent, getCounts } from '../src/repo';

function makeTempDb(name: string) {
  const out = path.join(process.cwd(), 'out', 'test_dbs');
  if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });
  return path.join(out, `${name}_${Date.now()}_${Math.floor(Math.random() * 1000)}.db`);
}

describe('repo idempotency full', () => {
  it('fund block idempotent', () => {
    const dbPath = makeTempDb('fundblock');
    const db = openDb(dbPath);
    initDb(db);
    upsertTrade(db, { tradeId: 'T1', buyerId: 'B', sellerId: 'S', principalInr: 100, blockDurationSec: 5 });
    const r1 = insertFundBlockIdempotent(db, { blockId: 'blk_T1', tradeId: 'T1', totalBlockedInr: 100.3, feeInr: 0.3, status: 'BLOCKED' });
    const r2 = insertFundBlockIdempotent(db, { blockId: 'blk_T1', tradeId: 'T1', totalBlockedInr: 100.3, feeInr: 0.3, status: 'BLOCKED' });
    expect(r1.action).toBe('inserted');
    expect(r2.action).toBe('noop');
    const counts = getCounts(db);
    expect(counts.blocks).toBe(1);
    db.close();
    fs.unlinkSync(dbPath);
  });

  it('transfer kinds idempotent and distinct', () => {
    const dbPath = makeTempDb('transfers');
    const db = openDb(dbPath);
    initDb(db);
    upsertTrade(db, { tradeId: 'T2', buyerId: 'B', sellerId: 'S', principalInr: 200, blockDurationSec: 5 });
    const t1 = insertTransferIdempotent(db, { transferId: 'tx1', tradeId: 'T2', kind: 'RELEASE', amountInr: 200, status: 'PAID' });
    const t2 = insertTransferIdempotent(db, { transferId: 'tx1', tradeId: 'T2', kind: 'RELEASE', amountInr: 200, status: 'PAID' });
    expect(t1.action).toBe('inserted');
    expect(t2.action).toBe('noop');
    const t3 = insertTransferIdempotent(db, { transferId: 'rf1', tradeId: 'T2', kind: 'REFUND', amountInr: 200, status: 'REFUNDED' });
    expect(t3.action).toBe('inserted');
    const counts = getCounts(db);
    expect(counts.transfers).toBe(2);
    db.close();
    fs.unlinkSync(dbPath);
  });
});
