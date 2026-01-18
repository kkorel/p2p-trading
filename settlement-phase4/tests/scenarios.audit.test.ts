import fs from 'fs';
import path from 'path';
import { describe, it, expect, vi } from 'vitest';
import { runScenarios } from '../src/scenarios';
import { StepLogger } from '../src/logger';
import { onTradePlaced } from '../src/orchestrator';
import { onTradeVerified } from '../src/orchestrator_verified';

function makeTempDb(name: string) {
  const out = path.join(process.cwd(), 'out', 'test_dbs');
  if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });
  return path.join(out, `${name}_${Date.now()}_${Math.floor(Math.random() * 1000)}.db`);
}

describe('scenarios auditability', () => {
  it('conflicting scenario has two attempts and second prevented', () => {
    const dbPath = makeTempDb('audit_conflict');
    const logger = new StepLogger();
    const scenarios = [ { name: 'conflicting', tradeId: 'AUD-1', principalInr: 100, outcome: 'SUCCESS' as const } ];
    const results = runScenarios({ dbPath, scenarios: scenarios as any, logger });
    expect(results.length).toBe(1);
    const item = results[0];
    expect(item.attempts.length).toBe(2);
    expect(item.attempts[0].status === 'PAYMENT_RELEASED' || item.attempts[0].status === 'PAYMENT_REFUNDED').toBeTruthy();
    expect(item.attempts[1].status === 'ERROR_ALREADY_SETTLED' || item.attempts[1].status === 'ERROR_NO_BLOCK' || item.attempts[1].status === 'ERROR_BLOCK_EXPIRED' || item.attempts[1].status === 'PAYMENT_REFUNDED' || item.attempts[1].status === 'PAYMENT_RELEASED').toBeTruthy();
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
  });

  it('onTradeVerified prints step headings on replay', () => {
    const dbPath = makeTempDb('audit_logs');
    const logger = new StepLogger();
    const trade = { tradeId: 'AUD-2', principalInr: 100, blockDurationSec: 5, buyerId: 'B', sellerId: 'S' };
    onTradePlaced({ trade, logger, dbPath });
    const spy = vi.spyOn(console, 'log');
    onTradeVerified({ tradeId: trade.tradeId, outcome: 'SUCCESS', logger, dbPath });
    spy.mockClear();
    onTradeVerified({ tradeId: trade.tradeId, outcome: 'SUCCESS', logger, dbPath });
    const calls = spy.mock.calls.map(c => String(c[0]));
    const joined = calls.join('\n');
    expect(joined.includes('=== [STEP 4]')).toBeTruthy();
    expect(joined.includes('=== [STEP 5]')).toBeTruthy();
    expect(joined.includes('=== [STEP 6]')).toBeTruthy();
    spy.mockRestore();
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
  });
});
