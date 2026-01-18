import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { onTradePlaced } from '../src/orchestrator';

function makeSilentLogger() {
  return {
    group() {
      return { info() {}, event() {}, done() {} };
    },
  } as any;
}

describe('orchestrator onTradePlaced', () => {
  it('inserts block first time then noop on replay', () => {
    const outDir = path.join(process.cwd(), 'out');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const dbPath = path.join(outDir, `test_tradePlaced_${Date.now()}.db`);

    const logger = makeSilentLogger();
    const trade = { tradeId: 'T-OWL-001', principalInr: 1000, blockDurationSec: 5, buyerId: 'B', sellerId: 'S' };

    const r1 = onTradePlaced({ trade, logger, dbPath });
    expect(r1.db.fundBlock.action).toBe('inserted');
    expect(r1.db.counts.trades).toBe(1);
    expect(r1.db.counts.fund_blocks).toBe(1);

    const r2 = onTradePlaced({ trade, logger, dbPath });
    expect(r2.db.fundBlock.action).toBe('noop');
    expect(r2.db.counts.trades).toBe(1);
    expect(r2.db.counts.fund_blocks).toBe(1);

    // cleanup
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    } catch (e) {
      // ignore
    }
  });
});
