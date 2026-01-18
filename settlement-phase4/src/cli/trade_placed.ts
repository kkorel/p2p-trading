import fs from 'fs';
import path from 'path';
import { StepLogger } from '../logger';
import { onTradePlaced } from '../orchestrator';

const argv = process.argv.slice(2);
let durationSec = 60;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--durationSec' && argv[i + 1]) {
    const v = Number(argv[i + 1]);
    if (!Number.isNaN(v)) durationSec = v;
    i++;
  }
}

const logger = new StepLogger();
const trade = {
  tradeId: 'T-PLACED-001',
  principalInr: 100000,
  blockDurationSec: durationSec,
  buyerId: 'P7',
  sellerId: 'P1',
};

console.log(`Using durationSec=${durationSec}`);
const result = onTradePlaced({ trade, logger, dbPath: 'escrow.db' });

const outDir = path.join(process.cwd(), 'out');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'trade_placed_result.json');
fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
console.log('OK wrote out/trade_placed_result.json');
