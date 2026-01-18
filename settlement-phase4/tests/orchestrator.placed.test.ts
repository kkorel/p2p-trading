import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { onTradePlaced } from '../src/orchestrator';
import { StepLogger } from '../src/logger';

function makeTempDb(name: string) {
  const out = path.join(process.cwd(), 'out', 'test_dbs');
  if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });
  return path.join(out, `${name}_${Date.now()}_${Math.floor(Math.random() * 1000)}.db`);
}

function silentLogger() { return new StepLogger(); }

describe('orchestrator onTradePlaced', () => {
  it('inserts then noop on replay', () => {
    const dbPath = makeTempDb('placed');
    const trade = { tradeId: 'T-PL-1', principalInr: 1000, blockDurationSec: 5, buyerId: 'B', sellerId: 'S' };
    const logger = silentLogger();
    const r1 = onTradePlaced({ trade, logger, dbPath });
    expect(r1.status).toBe('BLOCK_CONFIRMED');
    expect(r1.db.fundBlock.action).toBe('inserted');
    const r2 = onTradePlaced({ trade, logger, dbPath });
    expect(r2.db.fundBlock.action).toBe('noop');
    // deterministic block id
    expect(r1.bank.blockId).toBe(`blk_${trade.tradeId}`);
    // cleanup
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch(e){}
  });

  it('throws on invalid principal', () => {
    const dbPath = makeTempDb('placed2');
    const trade = { tradeId: 'T-PL-NEG', principalInr: -10, blockDurationSec: 5, buyerId: 'B', sellerId: 'S' } as any;
    const logger = silentLogger();
    expect(() => onTradePlaced({ trade, logger, dbPath })).toThrow();
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch(e){}
  });
});
