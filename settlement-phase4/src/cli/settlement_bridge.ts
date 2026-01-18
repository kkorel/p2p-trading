import fs from 'fs';
import path from 'path';
import { StepLogger } from '../logger';
import { onTradePlaced } from '../orchestrator';
import { onTradeVerified, VerificationOutcome } from '../orchestrator_verified';

type Args = Record<string, string | undefined>;

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key?.startsWith('--')) continue;
    const value = argv[i + 1];
    args[key.slice(2)] = value;
    i++;
  }
  return args;
}

function requireArg(args: Args, key: string): string {
  const value = args[key];
  if (!value) throw new Error(`missing --${key}`);
  return value;
}

function writeJson(outPath: string, payload: unknown) {
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
}

const argv = process.argv.slice(2);
const args = parseArgs(argv);
const mode = requireArg(args, 'mode');
const tradeId = requireArg(args, 'tradeId');
const outPath = requireArg(args, 'outPath');
const dbPath = requireArg(args, 'dbPath');
const transactionId = args.transactionId || '';
const messageId = args.messageId || '';

const logger = new StepLogger();

if (mode === 'place') {
  const principalInr = Number(requireArg(args, 'principalInr'));
  const durationSec = Number(requireArg(args, 'durationSec'));
  const buyerId = requireArg(args, 'buyerId');
  const sellerId = requireArg(args, 'sellerId');

  const trade = { tradeId, principalInr, blockDurationSec: durationSec, buyerId, sellerId };
  const result = onTradePlaced({ trade, logger, dbPath });

  writeJson(outPath, {
    ok: true,
    tradeId,
    transaction_id: transactionId || undefined,
    order_id: tradeId,
    status: result.status,
    quote: result.quote,
    bank: result.bank,
    ts: new Date().toISOString(),
  });
  process.exit(0);
}

if (mode === 'verify') {
  const outcome = requireArg(args, 'outcome') as VerificationOutcome;
  const result = onTradeVerified({ tradeId, outcome, logger, dbPath });

  writeJson(outPath, {
    ok: true,
    tradeId,
    outcome,
    transaction_id: transactionId || undefined,
    message_id: messageId || undefined,
    status: result.status,
    bankAction: result.bankAction ?? null,
    counts: result.db.counts,
    ts: new Date().toISOString(),
  });
  process.exit(0);
}

throw new Error(`unknown mode ${mode}`);
