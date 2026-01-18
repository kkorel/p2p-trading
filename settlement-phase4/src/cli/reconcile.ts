import fs from 'fs';
import path from 'path';
import { StepLogger } from '../logger';
import { reconcileExpiredBlocks } from '../reconcile';

const logger = new StepLogger();
const res = reconcileExpiredBlocks({ logger });
const outDir = path.join(process.cwd(), 'out');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'reconcile_report.json');
fs.writeFileSync(outPath, JSON.stringify(res, null, 2), 'utf8');
console.log(`OK wrote ${path.relative(process.cwd(), outPath)}`);
