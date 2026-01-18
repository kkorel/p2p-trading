import fs from 'fs';
import path from 'path';
import { StepLogger } from '../logger';
import { onTradePlaced } from '../orchestrator';
import { onTradeVerified, VerificationOutcome } from '../orchestrator_verified';

function ensureOut() {
  const outDir = path.join(process.cwd(), 'out');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  return outDir;
}

const arg = (process.argv[2] || 'SUCCESS').toUpperCase() as VerificationOutcome;
const logger = new StepLogger();

if (arg === 'FAIL') {
  const trade = { tradeId: 'T-PLACED-FAIL-001', principalInr: 50000, blockDurationSec: 5, buyerId: 'P7', sellerId: 'P1' };
  // create block first
  onTradePlaced({ trade, logger, dbPath: 'escrow.db' });
}

const tradeId = arg === 'SUCCESS' ? 'T-PLACED-001' : 'T-PLACED-FAIL-001';

const r1 = onTradeVerified({ tradeId, outcome: arg, logger, dbPath: 'escrow.db' });
const r2 = onTradeVerified({ tradeId, outcome: arg, logger, dbPath: 'escrow.db' });

// self-check: second should be noop
if (r2.db.transfer.action !== 'noop') throw new Error('idempotency check failed: second transfer not noop');

const outDir = ensureOut();
const outPath = path.join(outDir, arg === 'SUCCESS' ? 'trade_verified_success.json' : 'trade_verified_fail.json');
fs.writeFileSync(outPath, JSON.stringify(r1, null, 2), 'utf8');
console.log(`OK wrote ${path.relative(process.cwd(), outPath)}`);
