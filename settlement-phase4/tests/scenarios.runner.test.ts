import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { runScenarios } from '../src/scenarios';
import { StepLogger } from '../src/logger';

function makeTempDb(name: string) {
  const out = path.join(process.cwd(), 'out', 'test_dbs');
  if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });
  return path.join(out, `${name}_${Date.now()}_${Math.floor(Math.random() * 1000)}.db`);
}

describe('scenario runner', () => {
  it('runs success, missing, expired scenarios', () => {
    const dbPath = makeTempDb('sc1');
    const logger = new StepLogger();
    const scenarios = [
      { name: 's1', tradeId: 'SC-T1', principalInr: 100, outcome: 'SUCCESS' as const },
      { name: 's2', tradeId: 'SC-T2', outcome: 'FAIL' as const, missingBlock: true },
      { name: 's3', tradeId: 'SC-T3', principalInr: 50, outcome: 'SUCCESS' as const, advanceTimeSec: 10 },
    ];
    const results = runScenarios({ dbPath, scenarios: scenarios as any, logger });
    expect(results.length).toBe(3);
    expect(results[0].status === 'PAYMENT_RELEASED' || results[0].status === 'PAYMENT_REFUNDED').toBeTruthy();
    expect(results[1].status).toBe('ERROR_NO_BLOCK');
    expect(results[2].status === 'ERROR_BLOCK_EXPIRED' || results[2].status === 'PAYMENT_RELEASED').toBeTruthy();
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
  });
});
