import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { onTradePlaced } from '../src/orchestrator';
import { onTradeVerified } from '../src/orchestrator_verified';
import { StepLogger } from '../src/logger';

function makeTempDb(name: string) {
  const out = path.join(process.cwd(), 'out', 'test_dbs');
  if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });
  return path.join(out, `${name}_${Date.now()}_${Math.floor(Math.random() * 1000)}.db`);
}

const logger = new StepLogger();

describe('orchestrator onTradeVerified', () => {
  it('SUCCESS inserts release then noop on replay', () => {
    const dbPath = makeTempDb('ver_success');
    const trade = { tradeId: 'T-VER-1', principalInr: 1000, blockDurationSec: 5, buyerId: 'B', sellerId: 'S' };
    onTradePlaced({ trade, logger, dbPath });
    const r1 = onTradeVerified({ tradeId: trade.tradeId, outcome: 'SUCCESS', logger, dbPath });
    expect(r1.status).toBe('PAYMENT_RELEASED');
    expect(r1.db.transfer.action).toBe('inserted');
    const r2 = onTradeVerified({ tradeId: trade.tradeId, outcome: 'SUCCESS', logger, dbPath });
    expect(r2.db.transfer.action).toBe('noop');
    expect(r1.bankAction).toBeTruthy();
    if (r1.bankAction) expect(r1.bankAction.amountInr).toBe(trade.principalInr);
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
  });

  it('FAIL inserts refund then noop on replay', () => {
    const dbPath = makeTempDb('ver_fail');
    const trade = { tradeId: 'T-VER-2', principalInr: 500, blockDurationSec: 5, buyerId: 'B', sellerId: 'S' };
    onTradePlaced({ trade, logger, dbPath });
    const r1 = onTradeVerified({ tradeId: trade.tradeId, outcome: 'FAIL', logger, dbPath });
    expect(r1.status).toBe('PAYMENT_REFUNDED');
    expect(r1.db.transfer.action).toBe('inserted');
    const r2 = onTradeVerified({ tradeId: trade.tradeId, outcome: 'FAIL', logger, dbPath });
    expect(r2.db.transfer.action).toBe('noop');
    expect(r1.bankAction).toBeTruthy();
    if (r1.bankAction) expect(r1.bankAction.amountInr).toBeGreaterThanOrEqual(trade.principalInr);
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
  });

  it('missing block returns error', () => {
    const dbPath = makeTempDb('ver_noblk');
    const r = onTradeVerified({ tradeId: 'NON_EXISTENT', outcome: 'SUCCESS', logger, dbPath });
    expect(r.status).toBe('ERROR_NO_BLOCK');
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
  });

  it('conflicting actions prevented', () => {
    const dbPath = makeTempDb('ver_conflict');
    const trade = { tradeId: 'T-VER-3', principalInr: 800, blockDurationSec: 5, buyerId: 'B', sellerId: 'S' };
    onTradePlaced({ trade, logger, dbPath });
    const r1 = onTradeVerified({ tradeId: trade.tradeId, outcome: 'SUCCESS', logger, dbPath });
    expect(r1.status).toBe('PAYMENT_RELEASED');
    const r2 = onTradeVerified({ tradeId: trade.tradeId, outcome: 'FAIL', logger, dbPath });
    // should be prevented
    expect(r2.status === 'ERROR_ALREADY_SETTLED' || r2.db.transfer.action === 'noop').toBeTruthy();
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
  });
});
