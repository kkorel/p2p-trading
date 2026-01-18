import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { onTradePlaced } from '../src/orchestrator';
import { reconcileExpiredBlocks } from '../src/reconcile';
import { StepLogger } from '../src/logger';

function makeTempDb(name: string) {
  const out = path.join(process.cwd(), 'out', 'test_dbs');
  if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });
  return path.join(out, `${name}_${Date.now()}_${Math.floor(Math.random() * 1000)}.db`);
}

const logger = new StepLogger();

describe('reconcile expired blocks', () => {
  it('expires blocks older than now', () => {
    const dbPath = makeTempDb('rec1');
    const trade = { tradeId: 'T-REC-1', principalInr: 100, blockDurationSec: 1, buyerId: 'B', sellerId: 'S' };
    onTradePlaced({ trade, logger, dbPath });
    const nowIso = new Date(Date.now() + 2000).toISOString();
    const res = reconcileExpiredBlocks({ dbPath, nowIso, logger });
    expect(res.expired).toBeGreaterThanOrEqual(1);
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
  });
});
