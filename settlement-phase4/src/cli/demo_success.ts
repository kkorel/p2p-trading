import fs from 'fs';
import path from 'path';
import { StepLogger } from '../logger';
import { onTradePlaced } from '../orchestrator';
import { onTradeVerified } from '../orchestrator_verified';

const argv = process.argv.slice(2);
let durationSec = 60;
let fresh = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--durationSec' && argv[i + 1]) {
    const v = Number(argv[i + 1]);
    if (!Number.isNaN(v)) durationSec = v;
    i++;
  }
  if (a === '--fresh') fresh = true;
}

const dbPath = 'escrow.db';
if (fresh) {
  try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
}

const logger = new StepLogger();
const trade = { tradeId: 'DEMO-SUCCESS-1', principalInr: 100, blockDurationSec: durationSec, buyerId: 'DEMO-B', sellerId: 'DEMO-S' };

const placeResult = onTradePlaced({ trade, logger, dbPath });
const verifyResult = onTradeVerified({ tradeId: trade.tradeId, outcome: 'SUCCESS', logger, dbPath });

const outDir = path.join(process.cwd(), 'out');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'demo_success_result.json');
fs.writeFileSync(outPath, JSON.stringify({ place: placeResult, verify: verifyResult }, null, 2), 'utf8');
console.log('Wrote', outPath);
