export function upsertTrade(db: any, trade: any) {
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO trades(trade_id, buyer_id, seller_id, principal_inr, duration_sec)
     VALUES(?, ?, ?, ?, ?)`
  );
  stmt.run(trade.tradeId, trade.buyerId, trade.sellerId, trade.principalInr, trade.blockDurationSec);
}

export function insertFundBlockIdempotent(
  db: any,
  row: { blockId: string; tradeId: string; totalBlockedInr: number; feeInr: number; status: string; durationSec?: number }
) {
  try {
    const expiresAt = row.durationSec ? new Date(Date.now() + row.durationSec * 1000).toISOString() : null;
    const stmt = db.prepare(
      `INSERT INTO fund_blocks(block_id, trade_id, total_blocked_inr, fee_inr, status, created_at, expires_at)
       VALUES(?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(row.blockId, row.tradeId, row.totalBlockedInr, row.feeInr, row.status, new Date().toISOString(), expiresAt);
    return { action: 'inserted' } as const;
  } catch (err: any) {
    if (String(err.message).includes('UNIQUE constraint failed')) return { action: 'noop' } as const;
    throw err;
  }
}

export function insertTransferIdempotent(db: any, row: { transferId: string; tradeId: string; kind: string; amountInr: number; status: string }) {
  try {
    const stmt = db.prepare(
      `INSERT INTO transfers(transfer_id, trade_id, kind, amount_inr, status, created_at)
       VALUES(?, ?, ?, ?, ?, ?)`
    );
    stmt.run(row.transferId, row.tradeId, row.kind, row.amountInr, row.status, new Date().toISOString());
    return { action: 'inserted' } as const;
  } catch (err: any) {
    if (String(err.message).includes('UNIQUE constraint failed')) return { action: 'noop' } as const;
    throw err;
  }
}

export function getCounts(db: any) {
  const t = db.prepare('SELECT COUNT(*) as c FROM trades').get();
  const b = db.prepare('SELECT COUNT(*) as c FROM fund_blocks').get();
  const tr = db.prepare('SELECT COUNT(*) as c FROM transfers').get();
  return { trades: t.c as number, blocks: b.c as number, transfers: tr.c as number };
}
