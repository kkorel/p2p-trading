/**
 * BAP Routes - Consumer-side APIs for initiating flows
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  DiscoverMessage,
  SelectMessage,
  InitMessage,
  ConfirmMessage,
  StatusMessage,
  createContext,
  createLogger,
  config,
  matchOffers,
  MatchingCriteria,
  TimeWindow,
  SourceType,
  DeliveryMode,
  CatalogOffer,
  Provider,
} from '@p2p/shared';
import { logEvent } from './events';
import { createTransaction, getTransaction, updateTransaction, getAllTransactions, clearAllTransactions } from './state';
import { optionalAuthMiddleware, authMiddleware } from './middleware/auth';
import { prisma } from '@p2p/shared';

const router = Router();
const logger = createLogger('BAP');

const ESCROW_ACCOUNT = {
  bankName: 'HDFC Bank',
  accountName: 'P2P Energy Escrow',
  accountNumber: '001234567890',
  ifsc: 'HDFC0001234',
  branch: 'Powai, Mumbai',
};

const DEFAULT_ESCROW_DURATION_SEC = 30 * 60;

// ==================== DEMO ACCOUNTS ====================
// In-memory demo accounts with balances for visualization

type DemoAccount = {
  id: string;
  name: string;
  type: 'buyer' | 'seller' | 'escrow' | 'platform';
  balance: number;
  currency: string;
};

type DemoTransaction = {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  description: string;
  timestamp: string;
};

const INITIAL_BALANCES = {
  buyer: 10000,    // ₹10,000
  seller: 5000,    // ₹5,000
  escrow: 0,       // ₹0 (starts empty)
  platform: 0,     // ₹0 (fees collected)
};

let demoAccounts: Map<string, DemoAccount> = new Map();
let demoTransactions: DemoTransaction[] = [];

function initializeDemoAccounts(): void {
  demoAccounts = new Map([
    ['buyer', { id: 'buyer', name: 'Rahul Kumar (Buyer)', type: 'buyer', balance: INITIAL_BALANCES.buyer, currency: 'INR' }],
    ['seller', { id: 'seller', name: 'SunPower Energy (Seller)', type: 'seller', balance: INITIAL_BALANCES.seller, currency: 'INR' }],
    ['escrow', { id: 'escrow', name: 'P2P Escrow Account', type: 'escrow', balance: INITIAL_BALANCES.escrow, currency: 'INR' }],
    ['platform', { id: 'platform', name: 'Platform Fees', type: 'platform', balance: INITIAL_BALANCES.platform, currency: 'INR' }],
  ]);
  demoTransactions = []; // Clear transaction history
  logger.info('Demo accounts initialized', {
    buyer: INITIAL_BALANCES.buyer,
    seller: INITIAL_BALANCES.seller,
    escrow: INITIAL_BALANCES.escrow,
  });
}

// Initialize on module load
initializeDemoAccounts();

function getDemoAccount(id: string): DemoAccount | undefined {
  return demoAccounts.get(id);
}

function getAllDemoAccounts(): DemoAccount[] {
  return Array.from(demoAccounts.values());
}

function getAllDemoTransactions(): DemoTransaction[] {
  return demoTransactions;
}

function updateDemoBalance(id: string, delta: number): void {
  const account = demoAccounts.get(id);
  if (account) {
    account.balance = roundMoney(account.balance + delta);
    logger.info(`[BALANCE] ${account.name}: ${delta >= 0 ? '+' : ''}₹${delta.toFixed(2)} = ₹${account.balance.toFixed(2)}`);
  }
}

function transferMoney(fromId: string, toId: string, amount: number, description: string): boolean {
  const from = demoAccounts.get(fromId);
  const to = demoAccounts.get(toId);

  if (!from || !to) {
    logger.error(`Transfer failed: account not found (from=${fromId}, to=${toId})`);
    return false;
  }

  if (from.balance < amount) {
    logger.error(`Transfer failed: insufficient balance (${from.name} has ₹${from.balance}, needs ₹${amount})`);
    return false;
  }

  from.balance = roundMoney(from.balance - amount);
  to.balance = roundMoney(to.balance + amount);

  // Record the transaction
  const tx: DemoTransaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    fromId,
    fromName: from.name.split(' (')[0], // Short name
    toId,
    toName: to.name.split(' (')[0],
    amount: roundMoney(amount),
    description,
    timestamp: new Date().toISOString(),
  };
  demoTransactions.unshift(tx); // Add to beginning (newest first)

  // Keep only last 20 transactions
  if (demoTransactions.length > 20) {
    demoTransactions = demoTransactions.slice(0, 20);
  }

  logger.info(`[TRANSFER] ${description}: ₹${amount.toFixed(2)} | ${from.name} (₹${from.balance.toFixed(2)}) → ${to.name} (₹${to.balance.toFixed(2)})`);
  return true;
}

type SettlementStatus =
  | 'INITIATED'
  | 'FUNDED'
  | 'RELEASED'
  | 'REFUNDED'
  | 'ERROR_NO_RECORD'
  | 'ERROR_EXPIRED'
  | 'ERROR_ALREADY_SETTLED';

type SettlementOutcome = 'SUCCESS' | 'FAIL';

type SettlementRecord = {
  tradeId: string;
  orderId: string | null;
  transactionId: string | null;
  buyerId: string | null;
  sellerId: string | null;
  principal: number;
  fee: number;
  total: number;
  expiresAt: string;
  status: SettlementStatus;
  verificationOutcome: SettlementOutcome | null;
  fundedReceipt: string | null;
  payoutReceipt: string | null;
  fundedAt: string | null;
  verifiedAt: string | null;
  payoutAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeFee(principal: number): number {
  return roundMoney(Math.min(20, principal * 0.0003));
}

function nowIso(): string {
  return new Date().toISOString();
}

function toRecord(row: any): SettlementRecord {
  return {
    tradeId: row.tradeId,
    orderId: row.orderId ?? null,
    transactionId: row.transactionId ?? null,
    buyerId: row.buyerId ?? null,
    sellerId: row.sellerId ?? null,
    principal: Number(row.principal ?? 0),
    fee: Number(row.fee ?? 0),
    total: Number(row.total ?? 0),
    expiresAt: row.expiresAt,
    status: row.status,
    verificationOutcome: row.verificationOutcome ?? null,
    fundedReceipt: row.fundedReceipt ?? null,
    payoutReceipt: row.payoutReceipt ?? null,
    fundedAt: row.fundedAt ?? null,
    verifiedAt: row.verifiedAt ?? null,
    payoutAt: row.payoutAt ?? null,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt ?? null,
    updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt ?? null,
  };
}

async function getSettlementRecord(tradeId: string): Promise<SettlementRecord | null> {
  const record = await prisma.settlementRecord.findUnique({
    where: { tradeId },
  });
  return record ? toRecord(record) : null;
}

async function insertSettlementRecord(record: SettlementRecord): Promise<void> {
  await prisma.settlementRecord.create({
    data: {
      tradeId: record.tradeId,
      orderId: record.orderId,
      transactionId: record.transactionId,
      buyerId: record.buyerId,
      sellerId: record.sellerId,
      principal: record.principal,
      fee: record.fee,
      total: record.total,
      expiresAt: record.expiresAt,
      status: record.status,
      verificationOutcome: record.verificationOutcome,
      fundedReceipt: record.fundedReceipt,
      payoutReceipt: record.payoutReceipt,
      fundedAt: record.fundedAt,
      verifiedAt: record.verifiedAt,
      payoutAt: record.payoutAt,
    },
  });
}

async function updateSettlementRecord(tradeId: string, fields: Partial<SettlementRecord>): Promise<void> {
  const updateData: any = {};

  if (fields.status !== undefined) updateData.status = fields.status;
  if (fields.verificationOutcome !== undefined)
    updateData.verificationOutcome = fields.verificationOutcome;
  if (fields.fundedReceipt !== undefined)
    updateData.fundedReceipt = fields.fundedReceipt;
  if (fields.payoutReceipt !== undefined)
    updateData.payoutReceipt = fields.payoutReceipt;
  if (fields.fundedAt !== undefined) updateData.fundedAt = fields.fundedAt;
  if (fields.verifiedAt !== undefined)
    updateData.verifiedAt = fields.verifiedAt;
  if (fields.payoutAt !== undefined) updateData.payoutAt = fields.payoutAt;
  if (fields.orderId !== undefined) updateData.orderId = fields.orderId;
  if (fields.transactionId !== undefined)
    updateData.transactionId = fields.transactionId;
  if (fields.buyerId !== undefined) updateData.buyerId = fields.buyerId;
  if (fields.sellerId !== undefined) updateData.sellerId = fields.sellerId;
  if (fields.principal !== undefined) updateData.principal = fields.principal;
  if (fields.fee !== undefined) updateData.fee = fields.fee;
  if (fields.total !== undefined) updateData.total = fields.total;
  if (fields.expiresAt !== undefined) updateData.expiresAt = fields.expiresAt;

  if (Object.keys(updateData).length === 0) {
    return;
  }

  await prisma.settlementRecord.update({
    where: { tradeId },
    data: updateData,
  });
}

function buildPaymentSteps(record: SettlementRecord | null) {
  const hasRecord = !!record;
  const funded = record?.status === 'FUNDED' || record?.status === 'RELEASED' || record?.status === 'REFUNDED';
  const settled = record?.status === 'RELEASED' || record?.status === 'REFUNDED';
  const isError = record?.status?.startsWith('ERROR_');
  const outcome = record?.verificationOutcome;
  const isRelease = record?.status === 'RELEASED';
  const isRefund = record?.status === 'REFUNDED';

  const steps = [
    { id: 1, label: 'TE -> Bank: Request to block funds', status: hasRecord ? 'complete' : 'pending', time: record?.createdAt ?? null },
    { id: 2, label: 'Bank (internal): Block funds in buyer account', status: funded ? 'complete' : 'pending', time: record?.fundedAt ?? null },
    { id: 3, label: 'Bank -> TE: Block confirmed', status: funded ? 'complete' : 'pending', time: record?.fundedAt ?? null },
    { id: 4, label: 'Bank -> Buyer: Funds blocked notification', status: funded ? 'complete' : 'pending', time: record?.fundedAt ?? null },
    { id: 5, label: 'TE decides outcome using verification result + timing', status: outcome ? 'complete' : isError ? 'error' : 'pending', detail: outcome ?? (isError ? record?.status : null), time: record?.verifiedAt ?? null },
    { id: 6, label: 'TE -> Bank: Execute settlement instruction', status: outcome ? 'complete' : isError ? 'error' : 'pending', detail: outcome === 'SUCCESS' ? 'RELEASE to seller' : outcome === 'FAIL' ? 'REFUND to buyer' : null },
    { id: 7, label: 'Bank (internal): Unblock & transfer/refund', status: settled ? 'complete' : isError ? 'error' : 'pending', time: record?.payoutAt ?? null },
    { id: 8, label: 'Bank -> Seller: Payment credited', status: isRelease ? 'complete' : isRefund ? 'skipped' : isError ? 'error' : 'pending', time: isRelease ? record?.payoutAt ?? null : null },
    { id: 9, label: 'Bank -> Buyer: Funds released/refunded notification', status: settled ? 'complete' : isError ? 'error' : 'pending', time: record?.payoutAt ?? null },
  ];

  return steps;
}

function buildEscrowInstructions(record: SettlementRecord) {
  return {
    bank: ESCROW_ACCOUNT,
    reference: record.tradeId,
    note: 'Use NEFT/RTGS/IMPS. Reference must match Trade ID.',
  };
}

function buildPayoutInstruction(record: SettlementRecord, outcome: SettlementOutcome | null) {
  if (!outcome) return null;
  const amount = outcome === 'SUCCESS' ? record.principal : record.total;
  return {
    action: outcome === 'SUCCESS' ? 'RELEASE' : 'REFUND',
    amount,
    currency: 'INR',
    note: outcome === 'SUCCESS'
      ? 'Pay seller principal from escrow; fee stays with platform.'
      : 'Refund buyer principal + fee in full.',
  };
}

/**
 * POST /api/discover - Initiate catalog discovery
 * Uses optional auth to filter out user's own offers
 */
router.post('/api/discover', optionalAuthMiddleware, async (req: Request, res: Response) => {
  const {
    sourceType,
    deliveryMode,
    minQuantity,
    timeWindow,
    transaction_id
  } = req.body as {
    sourceType?: SourceType;
    deliveryMode?: DeliveryMode;
    minQuantity?: number;
    timeWindow?: TimeWindow;
    transaction_id?: string;
  };

  const txnId = transaction_id || uuidv4();

  // Get user's provider ID to exclude their own offers
  const excludeProviderId = req.user?.providerId || null;
  // Get user's ID for order association
  const buyerId = req.user?.id || null;

  // Create transaction state with discovery criteria for matching
  await createTransaction(txnId);
  await updateTransaction(txnId, {
    discoveryCriteria: {
      sourceType,
      deliveryMode,
      minQuantity,
      timeWindow,
    },
    excludeProviderId, // Store for filtering in callback
    buyerId, // Store buyer ID for order association
  });
  logger.debug('Discovery criteria', {
    sourceType,
    deliveryMode,
    minQuantity,
    timeWindow,
  });
  // Build filter expression
  // Note: deliveryMode is always 'SCHEDULED' for P2P energy trading, so we don't filter by it
  const filterParts: string[] = [];
  if (sourceType) filterParts.push(`sourceType='${sourceType}'`);
  if (minQuantity) filterParts.push(`availableQuantity>=${minQuantity}`);

  const expression = filterParts.length > 0 ? filterParts.join(' && ') : '*';

  // Create context
  const context = createContext({
    action: 'discover',
    transaction_id: txnId,
    bap_id: config.bap.id,
    bap_uri: config.bap.uri,
  });

  // Build discover message
  const discoverMessage: DiscoverMessage = {
    context,
    message: {
      intent: {
        item: {
          itemAttributes: {
            sourceType,
            deliveryMode: 'SCHEDULED', // Always scheduled for P2P energy trading
            availableQuantity: minQuantity,
          },
        },
        fulfillment: timeWindow ? { time: timeWindow } : undefined,
        quantity: minQuantity ? { value: minQuantity, unit: 'kWh' } : undefined,
      },
      filters: {
        type: 'jsonpath',
        expression,
      },
    },
  };

  logger.info('Sending discover request', {
    transaction_id: txnId,
    message_id: context.message_id,
    action: 'discover',
  });

  // Log outbound event
  await logEvent(txnId, context.message_id, 'discover', 'OUTBOUND', JSON.stringify(discoverMessage));

  try {
    const response = await axios.post(`${config.urls.cds}/discover`, discoverMessage);

    res.json({
      status: 'ok',
      transaction_id: txnId,
      message_id: context.message_id,
      ack: response.data,
    });
  } catch (error: any) {
    logger.error(`Discover request failed: ${error.message}`, { transaction_id: txnId });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/select - Select an offer (with matching algorithm)
 */
router.post('/api/select', async (req: Request, res: Response) => {
  const {
    transaction_id,
    offer_id,
    item_id,
    quantity,
    requestedTimeWindow,
    autoMatch
  } = req.body as {
    transaction_id: string;
    offer_id?: string;
    item_id?: string;
    quantity: number;
    requestedTimeWindow?: TimeWindow;
    autoMatch?: boolean;
  };

  const txState = await getTransaction(transaction_id);

  if (!txState) {
    return res.status(400).json({ error: 'Transaction not found.' });
  }

  let selectedOffer: CatalogOffer | undefined;
  let selectedItemId: string | undefined;
  let matchingResult: any;

  if (autoMatch && txState.catalog && requestedTimeWindow) {
    // Use matching algorithm to select best offer
    const allOffers: CatalogOffer[] = [];
    const providers = new Map<string, Provider>();

    for (const providerCatalog of txState.catalog.providers) {
      // Add provider with default trust score (in production, fetch from registry)
      providers.set(providerCatalog.id, {
        id: providerCatalog.id,
        name: providerCatalog.descriptor?.name || 'Unknown',
        trust_score: config.matching.defaultTrustScore,
        total_orders: 0,
        successful_orders: 0,
      });

      for (const item of providerCatalog.items) {
        for (const offer of item.offers) {
          allOffers.push(offer);
        }
      }
    }

    const criteria: MatchingCriteria = {
      requestedQuantity: quantity,
      requestedTimeWindow,
    };

    matchingResult = matchOffers(allOffers, providers, criteria);

    if (matchingResult.selectedOffer) {
      selectedOffer = matchingResult.selectedOffer.offer;
      selectedItemId = selectedOffer.item_id;

      logger.info(`Matching algorithm selected offer: ${selectedOffer.id} with score ${matchingResult.selectedOffer.score.toFixed(3)}`, {
        transaction_id,
        breakdown: matchingResult.selectedOffer.breakdown,
      });
    } else {
      return res.status(400).json({
        error: matchingResult.reason || 'No matching offers found',
        allOffers: matchingResult.allOffers.length,
      });
    }
  } else if (offer_id) {
    // Manual offer selection - first try catalog, then fallback to database
    if (txState.catalog) {
      for (const providerCatalog of txState.catalog.providers) {
        for (const item of providerCatalog.items) {
          for (const offer of item.offers) {
            if (offer.id === offer_id) {
              selectedOffer = offer;
              selectedItemId = item.id;
              break;
            }
          }
          if (selectedOffer) break;
        }
        if (selectedOffer) break;
      }
    }

    // If not found in catalog, look up directly from database (for multi-purchase flow)
    if (!selectedOffer) {
      const dbOffer = await prisma.catalogOffer.findUnique({
        where: { id: offer_id },
        include: {
          item: true,
          provider: true,
        },
      });

      if (dbOffer) {
        // Create a CatalogOffer-compatible object for the selection flow
        selectedOffer = {
          id: dbOffer.id,
          item_id: dbOffer.itemId,
          provider_id: dbOffer.providerId,
          price: { value: dbOffer.priceValue, currency: dbOffer.currency },
          maxQuantity: dbOffer.maxQty,
          timeWindow: {
            startTime: dbOffer.timeWindowStart.toISOString(),
            endTime: dbOffer.timeWindowEnd.toISOString(),
          },
          offerAttributes: {
            pricingModel: dbOffer.pricingModel as any,
            settlementType: dbOffer.settlementType as any,
          },
        };
        selectedItemId = dbOffer.itemId;

        logger.info(`Offer ${offer_id} found in database for multi-purchase flow`, { transaction_id });
      }
    }

    if (!selectedOffer) {
      return res.status(400).json({ error: `Offer ${offer_id} not found` });
    }
  } else {
    return res.status(400).json({ error: 'Either offer_id or autoMatch with requestedTimeWindow is required' });
  }

  // Create context
  const context = createContext({
    action: 'select',
    transaction_id,
    bap_id: config.bap.id,
    bap_uri: config.bap.uri,
    bpp_id: selectedOffer.provider_id,
    bpp_uri: config.bpp.uri,
  });

  // Build select message
  const selectMessage: SelectMessage = {
    context,
    message: {
      orderItems: [{
        item_id: selectedItemId || item_id || selectedOffer.item_id,
        offer_id: selectedOffer.id,
        quantity,
      }],
    },
  };

  logger.info('Sending select request', {
    transaction_id,
    message_id: context.message_id,
    action: 'select',
    offer_id: selectedOffer.id,
  });

  await logEvent(transaction_id, context.message_id, 'select', 'OUTBOUND', JSON.stringify(selectMessage));

  // Update state - store both the offer and the quantity the buyer wants
  await updateTransaction(transaction_id, { selectedOffer, selectedQuantity: quantity });

  try {
    const response = await axios.post(`${config.urls.bpp}/select`, selectMessage);

    res.json({
      status: 'ok',
      transaction_id,
      message_id: context.message_id,
      selected_offer: {
        id: selectedOffer.id,
        provider_id: selectedOffer.provider_id,
        price: selectedOffer.price,
        quantity,
      },
      matching: matchingResult ? {
        score: matchingResult.selectedOffer?.score,
        breakdown: matchingResult.selectedOffer?.breakdown,
        alternativeOffers: matchingResult.allOffers.length,
      } : undefined,
      ack: response.data,
    });
  } catch (error: any) {
    logger.error(`Select request failed: ${error.message}`, { transaction_id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/init - Initialize order
 */
router.post('/api/init', async (req: Request, res: Response) => {
  const { transaction_id } = req.body as { transaction_id: string };

  const txState = await getTransaction(transaction_id);

  if (!txState || !txState.selectedOffer) {
    return res.status(400).json({ error: 'No offer selected. Run select first.' });
  }

  const offer = txState.selectedOffer;

  // Create context
  const context = createContext({
    action: 'init',
    transaction_id,
    bap_id: config.bap.id,
    bap_uri: config.bap.uri,
    bpp_id: offer.provider_id,
    bpp_uri: config.bpp.uri,
  });

  // Build init message - use the quantity from selected offer (set during select)
  const selectedQuantity = txState.selectedQuantity || offer.maxQuantity;

  const initMessage: InitMessage = {
    context,
    message: {
      order: {
        items: [{
          item_id: offer.item_id,
          offer_id: offer.id,
          quantity: selectedQuantity,
        }],
        provider: { id: offer.provider_id },
      },
    },
  };

  logger.info('Sending init request', {
    transaction_id,
    message_id: context.message_id,
    action: 'init',
  });

  await logEvent(transaction_id, context.message_id, 'init', 'OUTBOUND', JSON.stringify(initMessage));

  try {
    const response = await axios.post(`${config.urls.bpp}/init`, initMessage);

    res.json({
      status: 'ok',
      transaction_id,
      message_id: context.message_id,
      ack: response.data,
    });
  } catch (error: any) {
    logger.error(`Init request failed: ${error.message}`, { transaction_id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/confirm - Confirm order
 */
router.post('/api/confirm', async (req: Request, res: Response) => {
  const { transaction_id, order_id } = req.body as { transaction_id: string; order_id?: string };

  const txState = await getTransaction(transaction_id);

  if (!txState) {
    return res.status(400).json({ error: 'Transaction not found' });
  }

  const orderId = order_id || txState.order?.id;

  if (!orderId) {
    return res.status(400).json({ error: 'No order ID available. Run init first or provide order_id.' });
  }

  const providerId = txState.selectedOffer?.provider_id || config.bpp.id;

  // Create context
  const context = createContext({
    action: 'confirm',
    transaction_id,
    bap_id: config.bap.id,
    bap_uri: config.bap.uri,
    bpp_id: providerId,
    bpp_uri: config.bpp.uri,
  });

  // Build confirm message
  const confirmMessage: ConfirmMessage = {
    context,
    message: {
      order: { id: orderId },
    },
  };

  logger.info('Sending confirm request', {
    transaction_id,
    message_id: context.message_id,
    action: 'confirm',
    order_id: orderId,
  });

  await logEvent(transaction_id, context.message_id, 'confirm', 'OUTBOUND', JSON.stringify(confirmMessage));

  try {
    const response = await axios.post(`${config.urls.bpp}/confirm`, confirmMessage);

    // Best-effort settlement initiation (idempotent)
    try {
      const txState = await getTransaction(transaction_id);
      const order = txState?.order;
      const tradeId = order?.id || orderId;
      const orderPrice = Number(order?.quote?.price?.value ?? 0);
      const quantity = Number(order?.quote?.totalQuantity ?? txState?.selectedQuantity ?? 1);
      const unitPrice = Number(txState?.selectedOffer?.price?.value ?? 0);
      const principalValue = orderPrice || roundMoney(unitPrice * quantity);

      if (tradeId && principalValue > 0) {
        const existing = await getSettlementRecord(tradeId);
        if (!existing) {
          const fee = computeFee(principalValue);
          const total = roundMoney(principalValue + fee);
          const expiresAt = new Date(Date.now() + DEFAULT_ESCROW_DURATION_SEC * 1000).toISOString();
          const record: SettlementRecord = {
            tradeId,
            orderId: order?.id || orderId || null,
            transactionId: transaction_id,
            buyerId: config.bap.id,
            sellerId: order?.items?.[0]?.provider_id || txState?.selectedOffer?.provider_id || null,
            principal: roundMoney(principalValue),
            fee,
            total,
            expiresAt,
            status: 'INITIATED',
            verificationOutcome: null,
            fundedReceipt: null,
            payoutReceipt: null,
            fundedAt: null,
            verifiedAt: null,
            payoutAt: null,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          };
          logger.info('=== [STEP 1] TE -> Bank: Request to block funds', {
            tradeId,
            orderId: record.orderId,
            principal: record.principal,
            fee: record.fee,
            total: record.total,
          });
          await insertSettlementRecord(record);
        }
      }
    } catch (error: any) {
      logger.warn(`Settlement initiation skipped: ${error.message}`, { transaction_id });
    }

    res.json({
      status: 'ok',
      transaction_id,
      message_id: context.message_id,
      order_id: orderId,
      ack: response.data,
    });
  } catch (error: any) {
    logger.error(`Confirm request failed: ${error.message}`, { transaction_id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/status - Get order status
 */
router.post('/api/status', async (req: Request, res: Response) => {
  const { transaction_id, order_id } = req.body as { transaction_id: string; order_id?: string };

  const txState = await getTransaction(transaction_id);

  if (!txState) {
    return res.status(400).json({ error: 'Transaction not found' });
  }

  const orderId = order_id || txState.order?.id || '';
  const providerId = txState.selectedOffer?.provider_id || config.bpp.id;

  // Create context
  const context = createContext({
    action: 'status',
    transaction_id,
    bap_id: config.bap.id,
    bap_uri: config.bap.uri,
    bpp_id: providerId,
    bpp_uri: config.bpp.uri,
  });

  // Build status message
  const statusMessage: StatusMessage = {
    context,
    message: {
      order_id: orderId,
    },
  };

  logger.info('Sending status request', {
    transaction_id,
    message_id: context.message_id,
    action: 'status',
  });

  await logEvent(transaction_id, context.message_id, 'status', 'OUTBOUND', JSON.stringify(statusMessage));

  try {
    const response = await axios.post(`${config.urls.bpp}/status`, statusMessage);

    res.json({
      status: 'ok',
      transaction_id,
      message_id: context.message_id,
      ack: response.data,
    });
  } catch (error: any) {
    logger.error(`Status request failed: ${error.message}`, { transaction_id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/transactions - List all transactions
 */
router.get('/api/transactions', async (req: Request, res: Response) => {
  const transactions = await getAllTransactions();
  res.json({ transactions });
});

/**
 * POST /api/transactions - Create a new transaction (for multi-purchase flow)
 */
router.post('/api/transactions', optionalAuthMiddleware, async (req: Request, res: Response) => {
  const txnId = uuidv4();
  const buyerId = req.user?.id || null;

  await createTransaction(txnId);
  await updateTransaction(txnId, { buyerId });

  res.json({ transaction_id: txnId });
});

/**
 * GET /api/transactions/:id - Get transaction details
 */
router.get('/api/transactions/:id', async (req: Request, res: Response) => {
  const txState = await getTransaction(req.params.id);

  if (!txState) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  res.json(txState);
});

/**
 * GET /api/settlement/:tradeId - Get settlement progress for UI
 */
router.get('/api/settlement/:tradeId', async (req: Request, res: Response) => {
  const tradeId = req.params.tradeId;

  try {
    const record = await getSettlementRecord(tradeId);
    if (!record) {
      return res.status(404).json({ error: 'Settlement record not found' });
    }
    const steps = buildPaymentSteps(record);
    res.json({
      tradeId,
      record,
      steps,
      escrow: buildEscrowInstructions(record),
      payout: buildPayoutInstruction(record, record.verificationOutcome),
    });
  } catch (error: any) {
    logger.error(`Settlement status read failed: ${error.message}`, { tradeId });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/settlement/initiate - Create settlement record (manual escrow)
 */
router.post('/api/settlement/initiate', async (req: Request, res: Response) => {
  const { tradeId, order_id, transaction_id, durationSec } = req.body as {
    tradeId?: string;
    order_id?: string;
    transaction_id?: string;
    durationSec?: number;
  };

  const txState = transaction_id ? await getTransaction(transaction_id) : null;
  const order = txState?.order;
  const resolvedTradeId = tradeId || order?.id || order_id;

  if (!resolvedTradeId) {
    return res.status(400).json({ error: 'tradeId or order_id is required' });
  }

  const existing = await getSettlementRecord(resolvedTradeId);
  if (existing) {
    return res.json({
      status: 'ok',
      record: existing,
      steps: buildPaymentSteps(existing),
      escrow: buildEscrowInstructions(existing),
      payout: buildPayoutInstruction(existing, existing.verificationOutcome),
    });
  }

  const principalFromOrder = Number(order?.quote?.price?.value ?? 0);
  const quantity = Number(order?.quote?.totalQuantity ?? txState?.selectedQuantity ?? 1);
  const priceFromOffer = Number(txState?.selectedOffer?.price?.value ?? 0);
  const principal = principalFromOrder || roundMoney(priceFromOffer * quantity);

  if (!principal || principal <= 0) {
    return res.status(400).json({ error: 'Unable to determine principal amount' });
  }

  const fee = computeFee(principal);
  const total = roundMoney(principal + fee);
  const expiresAt = new Date(Date.now() + (durationSec || DEFAULT_ESCROW_DURATION_SEC) * 1000).toISOString();

  const record: SettlementRecord = {
    tradeId: resolvedTradeId,
    orderId: order?.id || order_id || null,
    transactionId: transaction_id || null,
    buyerId: config.bap.id,
    sellerId: order?.items?.[0]?.provider_id || txState?.selectedOffer?.provider_id || null,
    principal: roundMoney(principal),
    fee,
    total,
    expiresAt,
    status: 'INITIATED',
    verificationOutcome: null,
    fundedReceipt: null,
    payoutReceipt: null,
    fundedAt: null,
    verifiedAt: null,
    payoutAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  logger.info('=== [STEP 1] TE -> Bank: Request to block funds', {
    tradeId: record.tradeId,
    orderId: record.orderId,
    principal: record.principal,
    fee: record.fee,
    total: record.total,
    expiresAt: record.expiresAt,
  });

  await insertSettlementRecord(record);

  res.json({
    status: 'ok',
    record,
    steps: buildPaymentSteps(record),
    escrow: buildEscrowInstructions(record),
    payout: buildPayoutInstruction(record, record.verificationOutcome),
  });
});

/**
 * POST /api/settlement/confirm-funded - Record escrow funding receipt (idempotent)
 */
router.post('/api/settlement/confirm-funded', async (req: Request, res: Response) => {
  const { tradeId, receipt } = req.body as { tradeId?: string; receipt?: string };
  if (!tradeId || !receipt) {
    return res.status(400).json({ error: 'tradeId and receipt are required' });
  }

  const record = await getSettlementRecord(tradeId);
  if (!record) {
    return res.status(404).json({ error: 'Settlement record not found', status: 'ERROR_NO_RECORD' });
  }

  if (record.status === 'RELEASED' || record.status === 'REFUNDED' || record.status === 'FUNDED') {
    return res.json({ status: 'ok', record, steps: buildPaymentSteps(record) });
  }

  await updateSettlementRecord(tradeId, {
    status: 'FUNDED',
    fundedReceipt: receipt,
    fundedAt: nowIso(),
  });

  const updated = await getSettlementRecord(tradeId);
  logger.info('=== [STEP 2] Bank (internal): Block funds in buyer account', { tradeId });
  logger.info('=== [STEP 3] Bank -> TE: Block confirmed', { tradeId, receipt });
  logger.info('=== [STEP 4] Bank -> Buyer: Funds blocked notification', { tradeId });

  res.json({ status: 'ok', record: updated, steps: buildPaymentSteps(updated) });
});

/**
 * POST /api/settlement/verify-outcome - Decide release/refund (demo hook)
 */
router.post('/api/settlement/verify-outcome', async (req: Request, res: Response) => {
  const { tradeId, outcome } = req.body as { tradeId?: string; outcome?: SettlementOutcome };
  if (!tradeId || (outcome !== 'SUCCESS' && outcome !== 'FAIL')) {
    return res.status(400).json({ error: 'tradeId and outcome=SUCCESS|FAIL are required' });
  }

  const record = await getSettlementRecord(tradeId);
  if (!record) {
    return res.status(404).json({ error: 'Settlement record not found', status: 'ERROR_NO_RECORD' });
  }

  if (record.status === 'RELEASED' || record.status === 'REFUNDED') {
    return res.json({ status: 'ok', record, payout: buildPayoutInstruction(record, record.verificationOutcome) });
  }

  if (record.status !== 'FUNDED') {
    return res.status(400).json({ error: 'Escrow not funded yet' });
  }

  const expired = new Date(record.expiresAt).getTime() < Date.now();
  if (expired) {
    await updateSettlementRecord(tradeId, { status: 'ERROR_EXPIRED' });
    const updated = await getSettlementRecord(tradeId);
    return res.status(400).json({ error: 'Settlement expired', record: updated, status: 'ERROR_EXPIRED' });
  }

  await updateSettlementRecord(tradeId, {
    verificationOutcome: outcome,
    verifiedAt: nowIso(),
  });

  const updated = await getSettlementRecord(tradeId);
  logger.info('=== [STEP 5] TE decides outcome using verification result + timing', { tradeId, outcome });
  logger.info('=== [STEP 6] TE -> Bank: Execute settlement instruction', {
    tradeId,
    action: outcome === 'SUCCESS' ? 'RELEASE' : 'REFUND',
  });

  res.json({
    status: 'ok',
    record: updated,
    payout: buildPayoutInstruction(updated, outcome),
    steps: buildPaymentSteps(updated),
  });
});

/**
 * POST /api/settlement/confirm-payout - Record payout receipt (idempotent)
 */
router.post('/api/settlement/confirm-payout', async (req: Request, res: Response) => {
  const { tradeId, receipt, action } = req.body as { tradeId?: string; receipt?: string; action?: 'RELEASE' | 'REFUND' };
  if (!tradeId || !receipt) {
    return res.status(400).json({ error: 'tradeId and receipt are required' });
  }

  const record = await getSettlementRecord(tradeId);
  if (!record) {
    return res.status(404).json({ error: 'Settlement record not found', status: 'ERROR_NO_RECORD' });
  }

  if (record.status === 'RELEASED' || record.status === 'REFUNDED') {
    return res.json({ status: 'ok', record, steps: buildPaymentSteps(record) });
  }

  const outcomeAction =
    action ||
    (record.verificationOutcome === 'SUCCESS' ? 'RELEASE' : record.verificationOutcome === 'FAIL' ? 'REFUND' : null);

  if (!outcomeAction) {
    return res.status(400).json({ error: 'Verification outcome missing; provide action=RELEASE|REFUND' });
  }

  const newStatus: SettlementStatus = outcomeAction === 'RELEASE' ? 'RELEASED' : 'REFUNDED';
  await updateSettlementRecord(tradeId, {
    status: newStatus,
    payoutReceipt: receipt,
    payoutAt: nowIso(),
  });

  const updated = await getSettlementRecord(tradeId);
  logger.info('=== [STEP 7] Bank (internal): Unblock & transfer/refund', { tradeId, action: outcomeAction });
  logger.info('=== [STEP 8] Bank -> Seller/Buyer: Payout recorded', { tradeId, action: outcomeAction, receipt });
  logger.info('=== [STEP 9] Bank -> Buyer: Settlement complete', { tradeId, status: newStatus });

  res.json({ status: 'ok', record: updated, steps: buildPaymentSteps(updated) });
});

/**
 * POST /api/settlement/auto-run - Fully automated settlement simulation
 * Runs the complete flow: INITIATED -> FUNDED -> VERIFIED -> RELEASED/REFUNDED
 * with realistic delays and auto-generated receipts
 */
router.post('/api/settlement/auto-run', async (req: Request, res: Response) => {
  const { tradeId, scenario } = req.body as { tradeId?: string; scenario?: 'SUCCESS' | 'FAIL' };

  if (!tradeId) {
    return res.status(400).json({ error: 'tradeId is required' });
  }

  const finalOutcome: SettlementOutcome = scenario === 'FAIL' ? 'FAIL' : 'SUCCESS';

  const record = await getSettlementRecord(tradeId);
  if (!record) {
    return res.status(404).json({ error: 'Settlement record not found. Initiate settlement first.' });
  }

  // If already in progress or completed, just return current state
  if (record.status === 'RELEASED' || record.status === 'REFUNDED') {
    return res.json({ status: 'ok', message: 'Settlement already completed', record });
  }

  logger.info('=== [AUTO-RUN] Starting automated settlement simulation', { tradeId, scenario: finalOutcome });

  // Respond immediately - processing happens async
  res.json({ status: 'ok', message: 'Auto-run started', tradeId, scenario: finalOutcome });

  // Run the simulation in background
  (async () => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const genUtr = () => `UTR${Date.now()}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    const genPayout = () => `PAYOUT${Date.now()}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;

    try {
      // Step 1-4: Escrow funding (3 seconds)
      // Transfer: Buyer -> Escrow (total = principal + fee)
      if (record.status === 'INITIATED') {
        logger.info('=== [AUTO-RUN STEP 2-4] Simulating buyer -> escrow transfer...', { tradeId, amount: record.total });
        await delay(3000);

        // BALANCE TRANSFER: Buyer pays total (principal + fee) to Escrow
        transferMoney('buyer', 'escrow', record.total, 'Buyer → Escrow (funding)');

        const fundedReceipt = genUtr();
        await updateSettlementRecord(tradeId, {
          status: 'FUNDED',
          fundedReceipt,
          fundedAt: nowIso(),
        });
        logger.info('=== [AUTO-RUN STEP 2-4] Escrow funded', { tradeId, receipt: fundedReceipt, amount: record.total });
      }

      // Step 5-6: Verification - wait longer so escrow balance is visible (5 seconds)
      logger.info('=== [AUTO-RUN STEP 5] Simulating trade verification (escrow holding funds)...', { tradeId, outcome: finalOutcome });
      await delay(5000);
      await updateSettlementRecord(tradeId, {
        verificationOutcome: finalOutcome,
        verifiedAt: nowIso(),
      });
      logger.info('=== [AUTO-RUN STEP 5-6] Verification complete', { tradeId, outcome: finalOutcome });

      // Step 7-9: Payout (3 seconds)
      logger.info('=== [AUTO-RUN STEP 7-9] Simulating escrow -> ' + (finalOutcome === 'SUCCESS' ? 'seller' : 'buyer refund') + '...', { tradeId });
      await delay(3000);

      if (finalOutcome === 'SUCCESS') {
        // BALANCE TRANSFER: Escrow pays principal to Seller, fee stays as platform revenue
        transferMoney('escrow', 'seller', record.principal, 'Escrow → Seller (principal)');
        transferMoney('escrow', 'platform', record.fee, 'Escrow → Platform (fee)');
      } else {
        // BALANCE TRANSFER: Escrow refunds total (principal + fee) to Buyer
        transferMoney('escrow', 'buyer', record.total, 'Escrow → Buyer (refund)');
      }

      const payoutReceipt = genPayout();
      const newStatus: SettlementStatus = finalOutcome === 'SUCCESS' ? 'RELEASED' : 'REFUNDED';
      await updateSettlementRecord(tradeId, {
        status: newStatus,
        payoutReceipt,
        payoutAt: nowIso(),
      });
      logger.info('=== [AUTO-RUN COMPLETE] Settlement finished', { tradeId, status: newStatus, receipt: payoutReceipt });

    } catch (error: any) {
      logger.error('=== [AUTO-RUN ERROR] Settlement simulation failed', { tradeId, error: error.message });
    }
  })();
});

/**
 * POST /api/settlement/reset - Clear settlement records (demo reset)
 */
router.post('/api/settlement/reset', async (req: Request, res: Response) => {
  await prisma.settlementRecord.deleteMany({});
  logger.info('Cleared settlement_records for demo reset');
  res.json({ status: 'ok' });
});

/**
 * DELETE /api/transactions - Clear all in-memory transactions
 */
router.delete('/api/transactions', async (req: Request, res: Response) => {
  const transactions = await getAllTransactions();
  const count = transactions.length;
  await clearAllTransactions();
  logger.info(`Cleared ${count} transactions from Redis`);
  res.json({ status: 'ok', cleared: count });
});

// ==================== DEMO ACCOUNT ENDPOINTS ====================

/**
 * GET /api/demo/accounts - Get all demo account balances and transactions
 */
router.get('/api/demo/accounts', (req: Request, res: Response) => {
  const accounts = getAllDemoAccounts();
  const transactions = getAllDemoTransactions();
  res.json({ accounts, transactions });
});

/**
 * GET /api/demo/accounts/:id - Get specific demo account
 */
router.get('/api/demo/accounts/:id', (req: Request, res: Response) => {
  const account = getDemoAccount(req.params.id);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }
  res.json({ account });
});

/**
 * GET /api/demo/transactions - Get transaction history
 */
router.get('/api/demo/transactions', (req: Request, res: Response) => {
  const transactions = getAllDemoTransactions();
  res.json({ transactions });
});

/**
 * POST /api/demo/accounts/reset - Reset all demo accounts to initial balances
 */
router.post('/api/demo/accounts/reset', (req: Request, res: Response) => {
  initializeDemoAccounts();
  const accounts = getAllDemoAccounts();
  res.json({ status: 'ok', message: 'Demo accounts reset to initial balances', accounts });
});

/**
 * POST /api/demo/reset-all - Reset everything for a fresh demo
 */
router.post('/api/demo/reset-all', async (req: Request, res: Response) => {
  // Reset in-memory transactions
  await clearAllTransactions();

  // Reset demo accounts
  initializeDemoAccounts();

  logger.info('=== DEMO RESET === All data cleared, accounts reset');

  res.json({
    status: 'ok',
    message: 'Full demo reset complete',
    accounts: getAllDemoAccounts(),
  });
});

/**
 * GET /api/my-orders - Get orders for the authenticated buyer
 */
router.get('/api/my-orders', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const orders = await (prisma.order as any).findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        provider: true,
        selectedOffer: {
          include: {
            item: true,
          },
        },
      },
    });

    // Transform to API format - need to use Promise.all since we may need async
    // lookups
    const formattedOrders = await Promise.all(orders.map(async (order: any) => {
      let items: any[] = [];
      let quote: any = {};

      try {
        items = JSON.parse(order.itemsJson || '[]');
      } catch {
        items = [];
      }

      try {
        quote = JSON.parse(order.quoteJson || '{}');
      } catch {
        quote = {};
      }

      const selectedOffer = order.selectedOffer;
      const totalQty = order.totalQty || items[0]?.quantity?.value || 0;

      // Calculate price_per_kwh: prefer offer value, fallback to calculating
      // from quote
      let pricePerKwh = selectedOffer?.priceValue || 0;
      if (pricePerKwh === 0 && quote.price?.value && totalQty > 0) {
        pricePerKwh = quote.price.value / totalQty;
      }

      // Get source_type: prefer offer, then stored items, then lookup from
      // catalog
      let sourceType = selectedOffer?.item?.sourceType || items[0]?.source_type;
      if (!sourceType || sourceType === 'UNKNOWN') {
        // Fallback: lookup from catalog item directly
        const itemId = items[0]?.item_id || selectedOffer?.itemId;
        if (itemId) {
          const catalogItem = await prisma.catalogItem.findUnique({
            where: { id: itemId },
            select: { sourceType: true },
          });
          sourceType = catalogItem?.sourceType || 'UNKNOWN';
        }
      }

      // Get delivery time window
      let deliveryStart = selectedOffer?.timeWindowStart;
      let deliveryEnd = selectedOffer?.timeWindowEnd;

      // Fallback: try to get from itemsJson
      if (!deliveryStart && items.length > 0 && items[0].timeWindow) {
        deliveryStart = items[0].timeWindow.startTime ? new Date(items[0].timeWindow.startTime) : null;
        deliveryEnd = items[0].timeWindow.endTime ? new Date(items[0].timeWindow.endTime) : null;
      }

      // Get trust history for this order (to show trust impact)
      const trustHistory = await prisma.trustScoreHistory.findFirst({
        where: { orderId: order.id, userId },
        orderBy: { createdAt: 'desc' },
      });

      // Get DISCOM feedback for completed orders (shows delivery status)
      const discomFeedback = await prisma.discomFeedback.findFirst({
        where: { orderId: order.id },
      });

      // Get payment record for completed orders (shows payment breakdown)
      const paymentRecord = order.status === 'COMPLETED'
        ? await prisma.paymentRecord.findFirst({
          where: { orderId: order.id, type: 'RELEASE' },
        })
        : null;

      return {
        id: order.id,
        transaction_id: order.transactionId,
        status: order.status,
        paymentStatus: order.paymentStatus || 'PENDING',
        created_at: order.createdAt.toISOString(),
        quote: quote.price ? {
          price: quote.price,
          totalQuantity: totalQty,
        } :
          undefined,
        provider: order.provider ? {
          id: order.provider.id,
          name: order.provider.name,
        } :
          undefined,
        itemInfo: {
          item_id: items[0]?.item_id || selectedOffer?.itemId || null,
          offer_id: items[0]?.offer_id || order.selectedOfferId || null,
          source_type: sourceType || 'UNKNOWN',
          price_per_kwh: pricePerKwh,
          quantity: totalQty,
        },
        deliveryTime: deliveryStart ? {
          start: deliveryStart instanceof Date ? deliveryStart.toISOString() : deliveryStart,
          end: deliveryEnd instanceof Date ? deliveryEnd.toISOString() : deliveryEnd,
        } : undefined,
        // Cancellation info
        cancellation: order.status === 'CANCELLED' ? {
          cancelledAt: order.cancelledAt?.toISOString(),
          reason: order.cancelReason,
          penalty: order.cancelPenalty,
          refund: order.cancelRefund,
        } : undefined,
        // DISCOM verification results (delivery status)
        fulfillment: discomFeedback ? {
          verified: true,
          deliveredQty: discomFeedback.deliveredQty,
          expectedQty: discomFeedback.expectedQty,
          deliveryRatio: discomFeedback.deliveryRatio,
          status: discomFeedback.status, // 'FULL' | 'PARTIAL' | 'FAILED'
          trustImpact: discomFeedback.trustImpact,
          verifiedAt: discomFeedback.verifiedAt.toISOString(),
          // Payment breakdown for partial/failed deliveries
          sellerPayment: paymentRecord?.sellerAmount ?? null,
          discomPenalty: paymentRecord?.platformFee ?? null, // Goes to DISCOM for differential
        } : null,
        // Trust impact from this order
        trustImpact: trustHistory ? {
          previousScore: trustHistory.previousScore,
          newScore: trustHistory.newScore,
          change: trustHistory.newScore - trustHistory.previousScore,
          reason: trustHistory.reason,
        } : undefined,
      };
    }));

    res.json({ orders: formattedOrders });
  } catch (error: any) {
    logger.error(`Failed to get buyer orders: ${error.message}`);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

/**
 * POST /api/cancel - Cancel an order (buyer initiated via frontend)
 * 
 * Cancellation rules:
 * - Must be at least 30 minutes before delivery start time
 * - Cannot cancel after delivery has started or completed
 * 
 * Cancellation penalty (10% total):
 * - 5% goes to seller (compensation)
 * - 5% goes to platform (fee)
 * - 90% refunded to buyer
 */
router.post('/api/cancel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { transaction_id, order_id, reason } = req.body as {
      transaction_id: string;
      order_id: string;
      reason?: string;
    };
    const userId = req.user!.id;

    logger.info('Received cancel request from frontend', {
      transaction_id,
      order_id,
      user_id: userId,
    });

    // Get order and verify ownership
    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: {
        blocks: true,
        selectedOffer: true,
        provider: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify the order belongs to this user
    if (order.buyerId !== userId) {
      return res.status(403).json({ error: 'You are not authorized to cancel this order' });
    }

    // Check if order is already delivered/completed
    if (order.status === 'COMPLETED' || order.discomVerified) {
      return res.status(400).json({
        error: 'Cannot cancel an order that has already been delivered',
      });
    }

    // Check if order is in a cancellable state
    if (order.status !== 'ACTIVE' && order.status !== 'PENDING') {
      return res.status(400).json({
        error: `Order in status ${order.status} cannot be cancelled`,
      });
    }

    // Get delivery start time from order items or selected offer
    let deliveryStartTime: Date | null = null;

    if (order.selectedOffer?.timeWindowStart) {
      deliveryStartTime = order.selectedOffer.timeWindowStart;
    } else {
      // Fallback: try to get from itemsJson
      try {
        const items = JSON.parse(order.itemsJson || '[]');
        if (items.length > 0 && items[0].timeWindow?.startTime) {
          deliveryStartTime = new Date(items[0].timeWindow.startTime);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    if (!deliveryStartTime) {
      return res.status(400).json({
        error: 'Could not determine delivery start time for this order',
      });
    }

    // Check if we're at least 30 minutes before delivery start
    const now = new Date();
    const minCancelBufferMs = 30 * 60 * 1000; // 30 minutes
    const timeUntilDelivery = deliveryStartTime.getTime() - now.getTime();

    if (timeUntilDelivery < minCancelBufferMs) {
      const minutesRemaining = Math.max(0, Math.floor(timeUntilDelivery / 60000));
      return res.status(400).json({
        error: `Cancellation not allowed within 30 minutes of delivery start. Only ${minutesRemaining} minutes remaining.`,
      });
    }

    // Calculate cancellation penalty (10% of total paid including platform fee)
    const energyCost = order.totalPrice || 0;
    const originalPlatformFee = Math.round(energyCost * 0.025 * 100) / 100; // 2.5% platform fee
    const totalPaid = energyCost + originalPlatformFee; // What buyer actually paid

    const penaltyRate = 0.10; // 10% total penalty
    const sellerShare = 0.05; // 5% to seller
    const platformShare = 0.05; // 5% to platform

    const totalPenalty = Math.round(totalPaid * penaltyRate * 100) / 100;
    const sellerCompensation = Math.round(totalPaid * sellerShare * 100) / 100;
    const platformPenaltyShare = Math.round(totalPaid * platformShare * 100) / 100;
    const buyerRefund = Math.round((totalPaid - totalPenalty) * 100) / 100; // 90% back to buyer

    // Get buyer and seller for balance updates
    const buyer = await prisma.user.findUnique({ where: { id: userId } });
    // Get seller via provider relation
    const seller = order.providerId
      ? await prisma.user.findFirst({ where: { providerId: order.providerId } })
      : null;

    if (!buyer) {
      return res.status(400).json({ error: 'Buyer not found' });
    }

    // Get block IDs BEFORE the transaction updates them (since orderId will be null after)
    const blocksToRelease = await prisma.offerBlock.findMany({
      where: { orderId: order_id },
      select: { id: true, offerId: true },
    });
    const blockIdsByOffer = new Map<string, string[]>();
    for (const block of blocksToRelease) {
      const ids = blockIdsByOffer.get(block.offerId) || [];
      ids.push(block.id);
      blockIdsByOffer.set(block.offerId, ids);
    }

    // Use transaction for atomic updates
    await prisma.$transaction(async (tx) => {
      // 1. Update order status
      await tx.order.update({
        where: { id: order_id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: 'BUYER',
          cancelReason: reason || 'User requested cancellation',
          // Store financial details in metadata
          cancelPenalty: totalPenalty,
          cancelRefund: buyerRefund,
        },
      });

      // 2. Release reserved blocks back to AVAILABLE
      await tx.offerBlock.updateMany({
        where: {
          orderId: order_id,
          status: { in: ['RESERVED', 'SOLD'] },
        },
        data: {
          status: 'AVAILABLE',
          orderId: null,
          transactionId: null,
          reservedAt: null,
          soldAt: null,
        },
      });

      // 3. Refund 90% to buyer (they had escrowed the full amount)
      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: buyerRefund } },
      });

      // 4. Pay 5% to seller as compensation
      if (seller) {
        await tx.user.update({
          where: { id: seller.id },
          data: { balance: { increment: sellerCompensation } },
        });
      }

      // 5. Platform gets 5% penalty + original 2.5% fee (tracked in payment record)
      // In production, this would go to a platform account

      // 6. Record the payment
      await tx.paymentRecord.create({
        data: {
          type: 'CANCEL_PENALTY',
          orderId: order_id,
          buyerId: userId,
          sellerId: seller?.id,
          totalAmount: totalPaid,
          buyerRefund,
          sellerAmount: sellerCompensation,
          platformFee: platformPenaltyShare + originalPlatformFee, // Penalty share + original fee
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    });

    logger.info(`Order ${order_id} cancelled with penalty`, {
      energyCost,
      originalPlatformFee,
      totalPaid,
      totalPenalty,
      buyerRefund,
      sellerCompensation,
      platformTotal: platformPenaltyShare + originalPlatformFee,
    });

    // Sync released blocks to CDS so they appear in discovery again
    try {
      const sharedConfig = (await import('@p2p/shared')).config;
      // Sync each offer's blocks back to AVAILABLE
      for (const [offerId, blockIds] of blockIdsByOffer) {
        logger.info(`===DEBUG=== Syncing ${blockIds.length} blocks to CDS`, {
          offer_id: offerId,
          block_ids: blockIds.slice(0, 5), // Log first 5 for brevity
          total_blocks: blockIds.length,
        });
        
        await axios.post(`${sharedConfig.urls.cds}/sync/blocks`, {
          offer_id: offerId,
          block_ids: blockIds,
          status: 'AVAILABLE',
          order_id: null,
          transaction_id: null,
        });
        logger.info(`===DEBUG=== Successfully synced ${blockIds.length} released blocks to CDS for offer ${offerId}`);
        
        // Verify blocks were updated
        const verifyBlocks = await prisma.offerBlock.count({
          where: { offerId, status: 'AVAILABLE' },
        });
        logger.info(`===DEBUG=== Offer ${offerId} now has ${verifyBlocks} AVAILABLE blocks in database`);

        // IMPORTANT: Also restore the CatalogItem's availableQty
        // When the order was confirmed, the item qty was reduced. Now we need to add it back.
        const offer = await prisma.catalogOffer.findUnique({
          where: { id: offerId },
          select: { itemId: true, providerId: true },
        });
        
        if (offer) {
          const item = await prisma.catalogItem.findUnique({
            where: { id: offer.itemId },
          });
          
          if (item) {
            const restoredQty = blockIds.length;
            const newQty = item.availableQty + restoredQty;
            
            await prisma.catalogItem.update({
              where: { id: offer.itemId },
              data: { availableQty: newQty },
            });
            
            logger.info(`===DEBUG=== Restored item ${offer.itemId} quantity: ${item.availableQty} → ${newQty} kWh`);
            
            // Sync the updated item to CDS
            await axios.post(`${sharedConfig.urls.cds}/sync/item`, {
              id: item.id,
              provider_id: item.providerId,
              source_type: item.sourceType,
              delivery_mode: item.deliveryMode,
              available_qty: newQty,
              production_windows: JSON.parse(item.productionWindowsJson || '[]'),
              meter_id: item.meterId,
            });
            logger.info(`===DEBUG=== Synced restored item quantity to CDS for item ${offer.itemId}`);
          }
        }
      }
    } catch (syncError: any) {
      logger.error(`Failed to sync released blocks to CDS: ${syncError.message}`);
    }

    // Update buyer trust score (penalty for cancellation)
    try {
      const { updateTrustAfterCancel } = await import('@p2p/shared');

      let cancelledQty = 0;
      try {
        const quote = JSON.parse(order.quoteJson || '{}');
        cancelledQty = quote.totalQuantity || order.totalQty || 0;
      } catch {
        cancelledQty = order.totalQty || 0;
      }

      const { newScore, newLimit, trustImpact } = updateTrustAfterCancel(
        buyer.trustScore,
        cancelledQty,
        cancelledQty,
        true // within window
      );

      await prisma.user.update({
        where: { id: userId },
        data: {
          trustScore: newScore,
          allowedTradeLimit: newLimit,
        },
      });

      await prisma.trustScoreHistory.create({
        data: {
          userId: userId,
          previousScore: buyer.trustScore,
          newScore: newScore,
          previousLimit: buyer.allowedTradeLimit,
          newLimit: newLimit,
          reason: 'BUYER_CANCEL',
          orderId: order_id,
          metadata: JSON.stringify({
            cancelledQty,
            trustImpact,
            cancelReason: reason,
            financials: { buyerRefund, sellerCompensation, platformFee: platformPenaltyShare + originalPlatformFee },
          }),
        },
      });

      logger.info(`Buyer trust updated after cancellation`, {
        userId,
        previousScore: buyer.trustScore,
        newScore,
        trustImpact,
      });
    } catch (trustError: any) {
      // Don't fail the cancel if trust update fails
      logger.error(`Failed to update trust after cancel: ${trustError.message}`);
    }

    res.json({
      status: 'ok',
      message: 'Order cancelled successfully',
      order_id,
      financials: {
        originalAmount: totalPaid, // What buyer originally paid (energy + 2.5% fee)
        refundAmount: buyerRefund, // 90% of total paid
        penaltyAmount: totalPenalty, // 10% of total paid
        penaltyBreakdown: {
          sellerCompensation, // 5% to seller
          platformFee: platformPenaltyShare + originalPlatformFee, // 5% penalty + original 2.5%
        },
      },
    });
  } catch (error: any) {
    logger.error(`Failed to cancel order: ${error.message}`);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

export default router;
