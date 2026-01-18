import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { onTradePlaced } from '../src/orchestrator';
import { onTradeVerified } from '../src/orchestrator_verified';
import { reconcileExpiredBlocks } from '../src/reconcile';
import { runScenarios } from '../src/scenarios';
import { StepLogger } from '../src/logger';

function makeTempDb(name: string) {
  const out = path.join(process.cwd(), 'out', 'test_dbs');
  if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });
  return path.join(out, `${name}_${Date.now()}_${Math.floor(Math.random() * 1000)}.db`);
}

describe('report hygiene', () => {
  it('missing block -> bankAction null', () => {
    const dbPath = makeTempDb('rh1');
    const logger = new StepLogger();
    const r = onTradeVerified({ tradeId: 'MISSING-1', outcome: 'SUCCESS', logger, dbPath });
    expect(r.status).toBe('ERROR_NO_BLOCK');
    expect(r.bankAction === null || r.bankAction === undefined).toBeTruthy();
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
  });

  it('expired block -> bankAction null', () => {
    const dbPath = makeTempDb('rh2');
    const logger = new StepLogger();
    const trade = { tradeId: 'EXP-1', principalInr: 100, blockDurationSec: 1, buyerId: 'B', sellerId: 'S' };
    onTradePlaced({ trade, logger, dbPath });
    // advance time past expiry
    const nowIso = new Date(Date.now() + 2000).toISOString();
    reconcileExpiredBlocks({ nowIso, logger, dbPath });
    const r = onTradeVerified({ tradeId: trade.tradeId, outcome: 'SUCCESS', logger, dbPath });
    expect(r.status).toBe('ERROR_BLOCK_EXPIRED');
    expect(r.bankAction === null || r.bankAction === undefined).toBeTruthy();
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
  });

  it('already settled -> bankAction null on replay', () => {
    const dbPath = makeTempDb('rh3');
    const logger = new StepLogger();
    const trade = { tradeId: 'SETTLE-1', principalInr: 100, blockDurationSec: 5, buyerId: 'B', sellerId: 'S' };
    onTradePlaced({ trade, logger, dbPath });
    const r1 = onTradeVerified({ tradeId: trade.tradeId, outcome: 'SUCCESS', logger, dbPath });
    expect(r1.status === 'PAYMENT_RELEASED' || r1.status === 'PAYMENT_REFUNDED').toBeTruthy();
    expect(r1.bankAction).toBeTruthy();
    const r2 = onTradeVerified({ tradeId: trade.tradeId, outcome: 'SUCCESS', logger, dbPath });
    expect(r2.status).toBe('ERROR_ALREADY_SETTLED');
    expect(r2.bankAction === null || r2.bankAction === undefined).toBeTruthy();
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
  });

  it('runScenarios preserves null bankAction for error attempts', () => {
    const dbPath = makeTempDb('rh4');
    const logger = new StepLogger();
    const scenarios = [
      { name: 'miss', tradeId: 'SC-MISS', outcome: 'SUCCESS', missingBlock: true as const },
      { name: 'exp', tradeId: 'SC-EXP', principalInr: 10, outcome: 'SUCCESS' as const, advanceTimeSec: 10 },
    ];
    const results = runScenarios({ dbPath, scenarios: scenarios as any, logger });
    expect(results.length).toBe(2);
    expect(results[0].attempts[0].status).toBe('ERROR_NO_BLOCK');
    expect(results[0].attempts[0].bankAction === null || results[0].attempts[0].bankAction === undefined).toBeTruthy();
    expect(results[1].attempts[0].status === 'ERROR_BLOCK_EXPIRED' || results[1].attempts[0].status === 'PAYMENT_RELEASED').toBeTruthy();
    if (results[1].attempts[0].status === 'ERROR_BLOCK_EXPIRED') {
      expect(results[1].attempts[0].bankAction === null || results[1].attempts[0].bankAction === undefined).toBeTruthy();
    }
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
  });
});
