import fs from 'fs';
import path from 'path';
import { StepLogger } from '../logger';
import { Trade, makeBlockQuote, calcFeeInr } from '../escrow';

function assert(cond: boolean, msg?: string) {
  if (!cond) throw new Error(msg ?? 'assert failed');
}

// Basic deterministic self-checks
assert(calcFeeInr(100000) === 20, 'expected fee 20 for 100000');
assert(calcFeeInr(1000) === 0.3, 'expected fee 0.3 for 1000');

const trade: Trade = {
  tradeId: 'T-001',
  principalInr: 100000,
  blockDurationSec: 5,
  buyerId: 'P7',
  sellerId: 'P1',
};

const quote = makeBlockQuote(trade);

const logger = new StepLogger();
const g = logger.group(1, 'At Trade Placement');
g.event('TE', 'Bank', `Request fund block (amount=${quote.totalBlockedInr}, duration=${trade.blockDurationSec})`);
g.done();

const outDir = path.join(process.cwd(), 'out');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'block_quote.json');
fs.writeFileSync(outPath, JSON.stringify(quote, null, 2), 'utf8');

console.log('OK wrote out/block_quote.json');
