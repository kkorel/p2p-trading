import fs from 'fs';
import path from 'path';
import { StepLogger } from '../logger';
import { runScenarios, Scenario } from '../scenarios';

const logger = new StepLogger();
const scenarios: Scenario[] = [
  { name: 'happy-success', tradeId: 'SC-1', principalInr: 1000, outcome: 'SUCCESS' },
  { name: 'happy-fail', tradeId: 'SC-2', principalInr: 500, outcome: 'FAIL' },
  { name: 'missing-block', tradeId: 'SC-3', outcome: 'FAIL', missingBlock: true },
  { name: 'expired-before-verify', tradeId: 'SC-4', principalInr: 200, outcome: 'SUCCESS', advanceTimeSec: 10 },
  { name: 'replay-success', tradeId: 'SC-5', principalInr: 300, outcome: 'SUCCESS' },
  { name: 'conflicting', tradeId: 'SC-6', principalInr: 400, outcome: 'SUCCESS' },
];

const results = runScenarios({ scenarios, logger });
const outDir = path.join(process.cwd(), 'out');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'scenario_summary.json');
fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
console.log(`OK wrote ${path.relative(process.cwd(), outPath)}`);
