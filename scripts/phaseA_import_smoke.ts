import path from 'path';
import { promises as fs } from 'fs';
import { pathToFileURL } from 'url';

async function run(): Promise<void> {
  const orchestratorPath = path.resolve(__dirname, '..', 'settlement-phase4', 'src', 'orchestrator.ts');
  const orchestratorUrl = pathToFileURL(orchestratorPath).href;
  await import(orchestratorUrl);

  const outDir = path.resolve(__dirname, '..', 'out');
  await fs.mkdir(outDir, { recursive: true });

  const payload = { ok: true, ts: new Date().toISOString() };
  const outPath = path.join(outDir, 'phaseA_import_ok.json');
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2));

  // Required observable output
  console.log('PHASE A OK');
}

run().catch((error) => {
  console.error('PHASE A FAILED', error);
  process.exitCode = 1;
});
