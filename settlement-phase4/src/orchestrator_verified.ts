import { StepLogger } from './logger';
import { openDb, initDb } from './db';
import { MockBankRail } from './bankMock';
import { insertTransferIdempotent } from './repo';
import { getFundBlockByTradeId, getTradeById } from './repo_read';
import { getCounts } from './repo';

export type VerificationOutcome = 'SUCCESS' | 'FAIL';

export interface TradeVerifiedResult {
  tradeId: string;
  outcome: VerificationOutcome;
  bankAction?: { kind: 'RELEASE' | 'REFUND'; amountInr: number; bankReceiptId: string } | null;
  db: { transfer: { action: 'inserted' | 'noop' }; counts: { trades: number; fund_blocks: number; transfers: number } };
  status: 'PAYMENT_RELEASED' | 'PAYMENT_REFUNDED' | 'ERROR_NO_BLOCK' | 'ERROR_ALREADY_SETTLED' | 'ERROR_BLOCK_EXPIRED';
}

export function onTradeVerified(args: { tradeId: string; outcome: VerificationOutcome; logger: StepLogger; dbPath?: string; nowIso?: string }): TradeVerifiedResult {
  const { tradeId, outcome, logger, dbPath, nowIso } = args;
  const db = openDb(dbPath ?? 'escrow.db');
  try {
    initDb(db);

    const trade = getTradeById(db, tradeId);
    const block = getFundBlockByTradeId(db, tradeId);

    if (!block) {
      const gErr = logger.group(4, 'After Trade Verification');
      gErr.info('no block found for trade');
      gErr.done();
      return {
        tradeId,
        outcome,
        bankAction: null,
        db: { transfer: { action: 'noop' }, counts: { trades: 0, fund_blocks: 0, transfers: 0 } },
        status: 'ERROR_NO_BLOCK',
      };
    }

    const g4 = logger.group(4, 'After Trade Verification');

    // expiry check
    const now = nowIso ?? new Date().toISOString();
    if (block.status === 'EXPIRED' || (block.expires_at && block.expires_at < now)) {
      g4.info('block expired');
      g4.done();
      const countsRaw = getCounts(db);
      const counts = { trades: countsRaw.trades, fund_blocks: countsRaw.blocks, transfers: countsRaw.transfers };
      return {
        tradeId,
        outcome,
        bankAction: null,
        db: { transfer: { action: 'noop' }, counts },
        status: 'ERROR_BLOCK_EXPIRED',
      };
    }

    // prevent contradictory second actions: if any transfer already exists, consider settled
    const existingTransfers = db.prepare('SELECT COUNT(*) as c FROM transfers WHERE trade_id = ?').get(tradeId)?.c ?? 0;
    if (existingTransfers > 0) {
      // Even when already settled, emit full step groups for auditability.
      const g4a = logger.group(4, 'After Trade Verification');
      g4a.info('already settled; skipping bank action');
      g4a.done();

      const g5a = logger.group(5, 'Unblock & Transfer');
      g5a.info('no bank movement');
      g5a.done();

      const g6 = logger.group(6, 'TE Persists Transfer');
      g6.info('transfer noop');
      const countsRaw = getCounts(db);
      const counts = { trades: countsRaw.trades, fund_blocks: countsRaw.blocks, transfers: countsRaw.transfers };
      g6.info(`counts trades=${counts.trades} fund_blocks=${counts.fund_blocks} transfers=${counts.transfers}`);
      g6.done();

      return {
        tradeId,
        outcome,
        bankAction: null,
        db: { transfer: { action: 'noop' }, counts },
        status: 'ERROR_ALREADY_SETTLED',
      };
    }

    if (outcome === 'SUCCESS') {
      const amount = trade.principal_inr;
      g4.event('TE', 'Bank', 'Release blocked funds to seller');
      g4.done();

      const bank = new MockBankRail();
      const receipt = bank.releaseFunds({ tradeId, payToSellerInr: amount });

      const g5 = logger.group(5, 'Unblock & Transfer');
      g5.info(`internal transferId=${receipt.transferId}`);
      g5.event('Bank', 'Seller', 'credited');
      g5.event('Bank', 'Buyer', 'notification');
      g5.done();

      const g6 = logger.group(6, 'TE Persists Transfer');
      const tr = insertTransferIdempotent(db, { transferId: receipt.transferId, tradeId, kind: 'RELEASE', amountInr: amount, status: 'PAID' });
      const countsRaw = getCounts(db);
      const counts = { trades: countsRaw.trades, fund_blocks: countsRaw.blocks, transfers: countsRaw.transfers };
      g6.info(`${tr.action}`);
      g6.info(`counts trades=${counts.trades} fund_blocks=${counts.fund_blocks} transfers=${counts.transfers}`);
      g6.done();

      return {
        tradeId,
        outcome,
        bankAction: { kind: 'RELEASE', amountInr: amount, bankReceiptId: receipt.transferId },
        db: { transfer: { action: tr.action }, counts },
        status: 'PAYMENT_RELEASED',
      };
    } else {
      // FAIL -> refund everything (including fee)
      const amount = block.total_blocked_inr;
      g4.event('TE', 'Bank', 'Refund blocked funds to buyer');
      g4.done();

      const g5 = logger.group(5, 'Unblock & Transfer');
      g5.info(`internal refund rf_${tradeId}`);
      g5.event('Bank', 'Buyer', 'credited');
      g5.done();

      const g6 = logger.group(6, 'TE Persists Transfer');
      const refundId = `rf_${tradeId}`;
      const tr = insertTransferIdempotent(db, { transferId: refundId, tradeId, kind: 'REFUND', amountInr: amount, status: 'REFUNDED' });
      const countsRaw = getCounts(db);
      const counts = { trades: countsRaw.trades, fund_blocks: countsRaw.blocks, transfers: countsRaw.transfers };
      g6.info(`${tr.action}`);
      g6.info(`counts trades=${counts.trades} fund_blocks=${counts.fund_blocks} transfers=${counts.transfers}`);
      g6.done();

      return {
        tradeId,
        outcome,
        bankAction: { kind: 'REFUND', amountInr: amount, bankReceiptId: refundId },
        db: { transfer: { action: tr.action }, counts },
        status: 'PAYMENT_REFUNDED',
      };
    }
  } finally {
    try { db.close(); } catch (e) {}
  }
}
