import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { onTradePlaced } from '../src/orchestrator';
import { onTradeVerified } from '../src/orchestrator_verified';
import { reconcileExpiredBlocks } from '../src/reconcile';
import { StepLogger } from '../src/logger';

function makeTempDb(name: string) {
  const out = path.join(process.cwd(), 'out', 'test_dbs');
  if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });
  return path.join(out, `${name}_${Date.now()}_${Math.floor(Math.random() * 1000)}.db`);
}

const logger = new StepLogger();

describe('expiry behavior', () => {
  it('returns ERROR_BLOCK_EXPIRED after expiry', () => {
    const dbPath = makeTempDb('exp1');
    const trade = { tradeId: 'T-EXP-1', principalInr: 100, blockDurationSec: 1, buyerId: 'B', sellerId: 'S' };
    onTradePlaced({ trade, logger, dbPath });
    const nowIso = new Date(Date.now() + 2000).toISOString();
    reconcileExpiredBlocks({ dbPath, nowIso, logger });
    const r = onTradeVerified({ tradeId: trade.tradeId, outcome: 'SUCCESS', logger, dbPath, nowIso });
    expect(r.status).toBe('ERROR_BLOCK_EXPIRED');
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
  });
});
