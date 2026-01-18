import path from 'path';
import { promises as fs } from 'fs';
import { pathToFileURL } from 'url';

async function run(): Promise<void> {
  const outDir = path.resolve(__dirname, '..', 'out');
  await fs.mkdir(outDir, { recursive: true });

  const dbPath = path.join(outDir, 'settlement_phase4_phaseD.db');

  const scenariosUrl = pathToFileURL(
    path.resolve(__dirname, '..', 'settlement-phase4', 'src', 'scenarios.ts')
  ).href;
  const reconcileUrl = pathToFileURL(
    path.resolve(__dirname, '..', 'settlement-phase4', 'src', 'reconcile.ts')
  ).href;
  const loggerUrl = pathToFileURL(
    path.resolve(__dirname, '..', 'settlement-phase4', 'src', 'logger.ts')
  ).href;

  const { runScenarios } = await import(scenariosUrl);
  const { reconcileExpiredBlocks } = await import(reconcileUrl);
  const { StepLogger } = await import(loggerUrl);

  const logger = new StepLogger();

  const scenarios = [
    { name: 'happy-success', tradeId: 'td-happy-success', principalInr: 100, outcome: 'SUCCESS' },
    { name: 'happy-fail', tradeId: 'td-happy-fail', principalInr: 110, outcome: 'FAIL' },
    { name: 'missing-block', tradeId: 'td-missing-block', outcome: 'SUCCESS', missingBlock: true },
    { name: 'expired-before-verify', tradeId: 'td-expired', principalInr: 120, outcome: 'SUCCESS', advanceTimeSec: 10 },
    { name: 'replay-success', tradeId: 'td-replay', principalInr: 130, outcome: 'SUCCESS' },
    { name: 'conflicting', tradeId: 'td-conflict', principalInr: 140, outcome: 'SUCCESS' },
  ];

  const scenarioResults = runScenarios({ dbPath, scenarios, logger });
  const scenarioPath = path.join(outDir, 'scenario_summary.json');
  await fs.writeFile(scenarioPath, JSON.stringify({ ok: true, scenarios: scenarioResults }, null, 2));

  const reconcileReport = reconcileExpiredBlocks({
    dbPath,
    nowIso: new Date(Date.now() + 15000).toISOString(),
    logger,
  });
  const reconcilePath = path.join(outDir, 'reconcile_report.json');
  await fs.writeFile(reconcilePath, JSON.stringify({ ok: true, report: reconcileReport }, null, 2));

  console.log('PHASE D OK');
}

run().catch((error) => {
  console.error('PHASE D FAILED', error);
  process.exitCode = 1;
});
