import { openDb, initDb } from '../db';
import { makeBlockQuote } from '../escrow';
import { MockBankRail } from '../bankMock';
import { upsertTrade, insertFundBlockIdempotent, getCounts } from '../repo';
import { StepLogger } from '../logger';

const db = openDb();
initDb(db);

const trade = {
  tradeId: 'T-001',
  principalInr: 100000,
  blockDurationSec: 5,
  buyerId: 'P7',
  sellerId: 'P1',
};

const quote = makeBlockQuote(trade);
const bank = new MockBankRail();
const receipt = bank.blockFunds({ tradeId: trade.tradeId, totalBlockedInr: quote.totalBlockedInr, durationSec: trade.blockDurationSec });

const logger = new StepLogger();
const g1 = logger.group(1, 'At Trade Placement');
g1.event('TE', 'Bank', `request fund block (amount=${quote.totalBlockedInr}, duration=${trade.blockDurationSec})`);
g1.done();

const g2 = logger.group(2, 'Bank Blocks Funds');
g2.info(`internal blockId=${receipt.blockId}`);
g2.event('Bank', 'TE', 'confirmation');
g2.done();

const g3 = logger.group(3, 'TE Persists Block');
upsertTrade(db, trade);
const res1 = insertFundBlockIdempotent(db, { blockId: receipt.blockId, tradeId: trade.tradeId, totalBlockedInr: quote.totalBlockedInr, feeInr: quote.feeInr, status: 'BLOCKED' });
g3.info(`first insert -> ${res1.action}`);
const countsAfterFirst = getCounts(db);
g3.info(`counts after first insert trades=${countsAfterFirst.trades} blocks=${countsAfterFirst.blocks} transfers=${countsAfterFirst.transfers}`);

// replay
const res2 = insertFundBlockIdempotent(db, { blockId: receipt.blockId, tradeId: trade.tradeId, totalBlockedInr: quote.totalBlockedInr, feeInr: quote.feeInr, status: 'BLOCKED' });
g3.info(`replay insert -> ${res2.action}`);
const countsAfterReplay = getCounts(db);
g3.info(`counts after replay trades=${countsAfterReplay.trades} blocks=${countsAfterReplay.blocks} transfers=${countsAfterReplay.transfers}`);
g3.done();

console.log(`OK db_smoke complete trades=${countsAfterReplay.trades} blocks=${countsAfterReplay.blocks} transfers=${countsAfterReplay.transfers}`);
