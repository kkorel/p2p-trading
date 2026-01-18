import { describe, it, expect } from 'vitest';
import { openDb, initDb } from '../src/db';
import { upsertTrade, insertFundBlockIdempotent, insertTransferIdempotent, getCounts } from '../src/repo';

describe('repo idempotency', () => {
  it('inserts fund block idempotently', () => {
    const db = openDb(':memory:');
    initDb(db);
    const trade = { tradeId: 'T-001', principalInr: 1000, blockDurationSec: 5, buyerId: 'B', sellerId: 'S' };
    upsertTrade(db, trade);

    const r1 = insertFundBlockIdempotent(db, { blockId: 'blk_T-001', tradeId: 'T-001', totalBlockedInr: 1000.3, feeInr: 0.3, status: 'BLOCKED' });
    const r2 = insertFundBlockIdempotent(db, { blockId: 'blk_T-001', tradeId: 'T-001', totalBlockedInr: 1000.3, feeInr: 0.3, status: 'BLOCKED' });

    expect(r1.action).toBe('inserted');
    expect(r2.action).toBe('noop');
    const counts = getCounts(db);
    expect(counts.blocks).toBe(1);
  });

  it('inserts transfer idempotently', () => {
    const db = openDb(':memory:');
    initDb(db);
    const trade = { tradeId: 'T-002', principalInr: 500, blockDurationSec: 5, buyerId: 'B', sellerId: 'S' };
    upsertTrade(db, trade);

    const t1 = insertTransferIdempotent(db, { transferId: 'tx_T-002', tradeId: 'T-002', kind: 'RELEASE', amountInr: 500, status: 'PAID' });
    const t2 = insertTransferIdempotent(db, { transferId: 'tx_T-002', tradeId: 'T-002', kind: 'RELEASE', amountInr: 500, status: 'PAID' });

    expect(t1.action).toBe('inserted');
    expect(t2.action).toBe('noop');
    const counts = getCounts(db);
    expect(counts.transfers).toBe(1);
  });
});
