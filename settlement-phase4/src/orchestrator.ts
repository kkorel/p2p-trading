import { StepLogger } from './logger';
import { Trade, BlockQuote, makeBlockQuote } from './escrow';
import { MockBankRail, BlockReceipt } from './bankMock';
import { openDb, initDb } from './db';
import { upsertTrade, insertFundBlockIdempotent, getCounts } from './repo';

export interface TradePlacedResult {
  tradeId: string;
  quote: BlockQuote;
  bank: BlockReceipt;
  db: {
    tradeUpserted: true;
    fundBlock: { action: 'inserted' | 'noop' };
    counts: { trades: number; fund_blocks: number; transfers: number };
  };
  status: 'BLOCK_CONFIRMED';
}

export function onTradePlaced(args: { trade: Trade; logger: StepLogger; dbPath?: string }): TradePlacedResult {
  const { trade, logger, dbPath } = args;

  // STEP 1: request
  const g1 = logger.group(1, 'At Trade Placement');
  const quote = makeBlockQuote(trade);
  if (!Number.isFinite(trade.principalInr) || trade.principalInr < 0) {
    throw new Error('invalid principalInr');
  }
  g1.event('TE', 'Bank', `request fund block (amount=${quote.totalBlockedInr}, duration=${trade.blockDurationSec})`);
  g1.done();

  // STEP 2: bank blocks funds
  const bank = new MockBankRail();
  const receipt = bank.blockFunds({ tradeId: trade.tradeId, totalBlockedInr: quote.totalBlockedInr, durationSec: trade.blockDurationSec });
  const g2 = logger.group(2, 'Bank Blocks Funds');
  g2.info(`internal blockId=${receipt.blockId}`);
  g2.event('Bank', 'TE', 'Block confirmed');
  g2.event('Bank', 'Buyer', 'Funds blocked notification');
  g2.done();

  // STEP 3: persist
  const g3 = logger.group(3, 'TE Persists Block');
  const db = openDb(dbPath ?? 'escrow.db');
  try {
    initDb(db);
    upsertTrade(db, trade);
    const fb = insertFundBlockIdempotent(db, { blockId: receipt.blockId, tradeId: trade.tradeId, totalBlockedInr: quote.totalBlockedInr, feeInr: quote.feeInr, status: 'BLOCKED', durationSec: trade.blockDurationSec });
    const countsRaw = getCounts(db);
    const counts = { trades: countsRaw.trades, fund_blocks: countsRaw.blocks, transfers: countsRaw.transfers };
    g3.info(`fund block -> ${fb.action}`);
    g3.info(`counts trades=${counts.trades} fund_blocks=${counts.fund_blocks} transfers=${counts.transfers}`);
    g3.done();

    return {
      tradeId: trade.tradeId,
      quote,
      bank: receipt,
      db: { tradeUpserted: true, fundBlock: { action: fb.action }, counts },
      status: 'BLOCK_CONFIRMED',
    };
  } finally {
    try {
      db.close();
    } catch (e) {
      // ignore
    }
  }
}
