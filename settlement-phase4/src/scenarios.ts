import { StepLogger } from './logger';
import { onTradePlaced } from './orchestrator';
import { onTradeVerified } from './orchestrator_verified';
import { reconcileExpiredBlocks } from './reconcile';

export type Scenario =
  | { name: string; tradeId: string; principalInr: number; outcome: 'SUCCESS' | 'FAIL'; advanceTimeSec?: number }
  | { name: string; tradeId: string; outcome: 'SUCCESS' | 'FAIL'; missingBlock: true };

export function runScenarios(args: { dbPath?: string; scenarios: Scenario[]; logger: StepLogger }) {
  const { dbPath, scenarios, logger } = args;
  const results: any[] = [];
  for (const s of scenarios) {
    const g = logger.group(0, `Scenario ${s.name}`);
    try {
      const summary: any = { name: s.name, tradeId: (s as any).tradeId, attempts: [] };

      if ('missingBlock' in s && s.missingBlock) {
        const args: any = { tradeId: s.tradeId, outcome: s.outcome, logger };
        if (dbPath) args.dbPath = dbPath;
        const r = onTradeVerified(args);
        summary.attempts.push({ label: 'verify', status: r.status, bankAction: r.bankAction ?? null, counts: r.db.counts });
      } else {
        // place trade
        const trade: any = { tradeId: s.tradeId, principalInr: (s as any).principalInr ?? 100, blockDurationSec: 5, buyerId: 'P7', sellerId: 'P1' };
        const placeArgs: any = { trade, logger };
        if (dbPath) placeArgs.dbPath = dbPath;
        onTradePlaced(placeArgs);

        if ((s as any).advanceTimeSec) {
          const nowIso = new Date(Date.now() + ((s as any).advanceTimeSec as number) * 1000).toISOString();
          const recArgs: any = { nowIso, logger };
          if (dbPath) recArgs.dbPath = dbPath;
          reconcileExpiredBlocks(recArgs);
        }

        // primary verify
        const vArgs: any = { tradeId: s.tradeId, outcome: s.outcome, logger };
        if (dbPath) vArgs.dbPath = dbPath;
        const r1 = onTradeVerified(vArgs);
        summary.attempts.push({ label: 'verify', status: r1.status, bankAction: r1.bankAction ?? null, counts: r1.db.counts });

        // replay / conflict handling for specific scenario shapes
        if ((s as any).name === 'replay-success') {
          const r2 = onTradeVerified(vArgs);
          summary.attempts.push({ label: 'replay', status: r2.status, bankAction: r2.bankAction ?? null, counts: r2.db.counts });
        }

        if ((s as any).name === 'conflicting') {
          // perform opposite outcome verify to demonstrate prevention
          const opposite: any = { tradeId: s.tradeId, outcome: s.outcome === 'SUCCESS' ? 'FAIL' : 'SUCCESS', logger };
          if (dbPath) opposite.dbPath = dbPath;
          const r2 = onTradeVerified(opposite);
          summary.attempts.push({ label: 'conflict_attempt', status: r2.status, bankAction: r2.bankAction ?? null, counts: r2.db.counts });
        }
      }

      // expose a top-level summary status and last bankAction/counts for legacy checks
      const last = summary.attempts[summary.attempts.length - 1];
      if (last) {
        summary.status = last.status;
        summary.bankAction = last.bankAction;
        summary.counts = last.counts;
      }

      results.push(summary);
    } finally {
      g.done();
    }
  }
  return results;
}
