export function getFundBlockByTradeId(db: any, tradeId: string) {
  const row = db
    .prepare('SELECT block_id, trade_id, total_blocked_inr, fee_inr, status, created_at, expires_at FROM fund_blocks WHERE trade_id = ?')
    .get(tradeId);
  return row ?? null;
}

export function getTradeById(db: any, tradeId: string) {
  const row = db.prepare('SELECT trade_id, buyer_id, seller_id, principal_inr, duration_sec FROM trades WHERE trade_id = ?').get(tradeId);
  return row ?? null;
}
