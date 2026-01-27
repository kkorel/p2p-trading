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
  // VC imports
  VerifiableCredential,
  VerificationOptions,
  verifyCredential,
  parseAndVerifyCredential,
  verifyGenerationProfile,
  getIssuerId,
  validateProviderMatch,
  // Secure client for signed Beckn requests
  secureAxios,
} from '@p2p/shared';
import { logEvent } from './events';
import { createTransaction, getTransaction, updateTransaction, getAllTransactions, clearAllTransactions } from './state';
import { optionalAuthMiddleware, authMiddleware } from './middleware/auth';
import { prisma } from '@p2p/shared';

const router = Router();
const logger = createLogger('BAP');

/**
 * Transform external CDS catalog format (beckn: prefixed) to our internal format
 * External format uses:
 * - catalogs[] instead of catalog.providers[]
 * - beckn:id, beckn:items, beckn:offers with beckn: prefix
 * - offers at catalog level instead of nested in items
 * - Various price formats: beckn:price, schema:price, etc.
 */
function transformExternalCatalogFormat(rawMessage: any): { providers: any[] } {
  // Check if it's already in our internal format
  if (rawMessage.catalog?.providers) {
    return rawMessage.catalog;
  }
  
  // Check for external format with catalogs array
  const catalogs = rawMessage.catalogs || rawMessage.message?.catalogs || [];
  
  if (!catalogs.length) {
    logger.debug('No catalogs found in response');
    return { providers: [] };
  }
  
  const providers: any[] = [];
  
  for (const catalog of catalogs) {
    const providerId = catalog['beckn:providerId'] || catalog.providerId || catalog['beckn:id'] || catalog.id;
    const providerName = catalog['beckn:descriptor']?.['schema:name'] || 
                         catalog.descriptor?.name ||
                         catalog['beckn:bppId'] ||
                         'Unknown Provider';
    
    // IMPORTANT: Extract BPP routing info for proper Beckn flows
    const bppId = catalog['beckn:bppId'] || catalog.bppId || providerId;
    const bppUri = catalog['beckn:bppUri'] || catalog.bppUri || null;
    
    const rawItems = catalog['beckn:items'] || catalog.items || [];
    const catalogOffers = catalog['beckn:offers'] || catalog.offers || [];
    
    // Log raw data for debugging
    console.log(`[TRANSFORM-DEBUG] Provider ${providerId}: rawItems=${rawItems.length}, catalogOffers=${catalogOffers.length}`);
    logger.info(`Processing catalog: provider=${providerId}, items=${rawItems.length}, offers=${catalogOffers.length}`);
    
    const transformedItems: any[] = [];
    
    // Helper function to extract offer data
    const extractOfferData = (offer: any, itemId: string, itemAttrs: any = {}) => {
      const offerId = offer['beckn:id'] || offer.id;
      const offerAttrs = offer['beckn:offerAttributes'] || offer.offerAttributes || {};
      
      // Extract price from multiple possible formats:
      // 1. offer['beckn:price']['schema:price'] (new format at root)
      // 2. offerAttrs['beckn:price']['value'] (old format inside offerAttributes)
      // 3. offerAttrs.price (simplified format)
      const offerPrice = offer['beckn:price'] || {};
      const attrPrice = offerAttrs['beckn:price'] || offerAttrs.price || {};
      const priceValue = attrPrice.value ?? offerPrice['schema:price'] ?? attrPrice['schema:price'] ?? offerPrice.value ?? 0;
      const priceCurrency = attrPrice.currency || offerPrice['schema:priceCurrency'] || attrPrice['schema:priceCurrency'] || offerPrice.currency || 'INR';
      
      // Extract time window from multiple possible locations
      const timeWindow = offerAttrs['beckn:timeWindow'] || offerAttrs.timeWindow || offerAttrs.validityWindow || {};
      const startTime = timeWindow['schema:startTime'] || timeWindow.startTime || null;
      const endTime = timeWindow['schema:endTime'] || timeWindow.endTime || null;
      
      // Extract max quantity from multiple possible formats
      const maxQty = offerAttrs['beckn:maxQuantity'] || offerAttrs.maxQuantity || {};
      const maxQuantity = maxQty.unitQuantity || maxQty || offerAttrs.maximumQuantity || itemAttrs.availableQuantity || 100;
      
      logger.debug('Extracted offer', {
        offerId,
        price: priceValue,
        currency: priceCurrency,
        startTime,
        endTime,
        bppUri,
      });
      
      return {
        id: offerId,
        item_id: itemId,
        provider_id: providerId,
        // BPP routing info for proper Beckn flow
        bpp_id: bppId,
        bpp_uri: bppUri,
        price: {
          value: typeof priceValue === 'number' ? priceValue : parseFloat(priceValue) || 0,
          currency: priceCurrency,
        },
        maxQuantity: typeof maxQuantity === 'number' ? maxQuantity : parseFloat(maxQuantity) || 100,
        timeWindow: startTime && endTime ? {
          startTime,
          endTime,
        } : null,
      };
    };
    
    // Process items if they exist
    if (rawItems.length > 0) {
      for (const item of rawItems) {
        const itemId = item['beckn:id'] || item.id;
        const itemAttrs = item['beckn:itemAttributes'] || item.itemAttributes || {};
        
        const itemOffers: any[] = [];
        
        for (const offer of catalogOffers) {
          const offerItems = offer['beckn:items'] || offer.items || [];
          
          if (offerItems.includes(itemId) || offerItems.length === 0) {
            itemOffers.push(extractOfferData(offer, itemId, itemAttrs));
          }
        }
        
        transformedItems.push({
          id: itemId,
          offers: itemOffers,
          itemAttributes: {
            sourceType: itemAttrs.sourceType || 'MIXED',
            availableQuantity: itemAttrs.availableQuantity || 100,
            deliveryMode: itemAttrs.deliveryMode || 'GRID_INJECTION',
            meterId: itemAttrs.meterId,
          },
        });
      }
    } else if (catalogOffers.length > 0) {
      // FALLBACK: If no items but offers exist, extract offers with their referenced item IDs
      // This handles cases where CDS returns offers without explicit items array
      logger.info('No items found but offers exist, extracting directly', {
        providerId,
        offerCount: catalogOffers.length,
      });
      
      // Group offers by their item references
      const offersByItem = new Map<string, any[]>();
      
      for (const offer of catalogOffers) {
        const offerItemIds = offer['beckn:items'] || offer.items || [];
        // Use first item ID or generate a synthetic one
        const itemId = offerItemIds[0] || `synthetic-item-${providerId}`;
        
        if (!offersByItem.has(itemId)) {
          offersByItem.set(itemId, []);
        }
        offersByItem.get(itemId)!.push(extractOfferData(offer, itemId, {}));
      }
      
      // Create items from grouped offers
      for (const [itemId, offers] of offersByItem) {
        transformedItems.push({
          id: itemId,
          offers,
          itemAttributes: {
            sourceType: 'MIXED',
            availableQuantity: 100,
            deliveryMode: 'GRID_INJECTION',
          },
        });
      }
    }
    
    providers.push({
      id: providerId,
      descriptor: { name: providerName },
      // BPP routing info at provider level
      bpp_id: bppId,
      bpp_uri: bppUri,
      items: transformedItems,
    });
  }
  
  // Count total offers
  const totalOffers = providers.reduce((sum, p) => 
    sum + p.items.reduce((iSum: number, i: any) => iSum + (i.offers?.length || 0), 0), 0);
  
  logger.info(`Transformed ${catalogs.length} catalogs into ${providers.length} providers`, {
    totalOffers,
    providerDetails: providers.map(p => ({
      id: p.id,
      itemCount: p.items.length,
      offerCount: p.items.reduce((sum: number, i: any) => sum + (i.offers?.length || 0), 0),
    })),
  });
  return { providers };
}

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
    where: {tradeId},
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
    where: {tradeId},
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
  // Build JSONPath filter expression for external CDS
  // Format: $[?(@.beckn:itemAttributes.sourceType == 'SOLAR' && ...)]
  // IMPORTANT: External CDS requires at least one filter to return results
  const filterParts: string[] = [];
  if (sourceType) {
    filterParts.push(`@.beckn:itemAttributes.sourceType == '${sourceType}'`);
  } else {
    // When no source type specified, filter for any energy type
    // This ensures we get results from the external CDS
    filterParts.push(`(@.beckn:itemAttributes.sourceType == 'SOLAR' || @.beckn:itemAttributes.sourceType == 'WIND' || @.beckn:itemAttributes.sourceType == 'HYDRO' || @.beckn:itemAttributes.sourceType == 'MIXED')`);
  }
  if (deliveryMode) {
    filterParts.push(`@.beckn:itemAttributes.deliveryMode == '${deliveryMode}'`);
  }
  if (minQuantity) {
    filterParts.push(`@.beckn:itemAttributes.availableQuantity >= ${minQuantity}`);
  }
  
  // Build JSONPath expression
  const expression = `$[?(${filterParts.join(' && ')})]`;
  
  console.log(`[DISCOVER-DEBUG] Filter expression: ${expression}`);
  
  // Create context with location for external CDS
  const context = createContext({
    action: 'discover',
    transaction_id: txnId,
    bap_id: config.bap.id,
    bap_uri: config.bap.uri,
  });
  
  // Build discover message with both filters and intent
  // Filters: JSONPath expression for basic filtering
  // Intent: Time window and quantity for time-based matching
  const discoverMessage = {
    context,
    message: {
      filters: {
        type: 'jsonpath',
        expression,
        expressionType: 'jsonpath',
      },
      intent: timeWindow ? {
        fulfillment: {
          time: timeWindow,
        },
        quantity: minQuantity ? { value: minQuantity } : undefined,
      } : undefined,
    },
  };
  
  // Get the CDS discover URL from external CDS configuration
  // EXTERNAL_CDS_URL (e.g., .../beckn/catalog) → use .../beckn/discover
  const getCdsDiscoverUrl = () => {
    const externalUrl = process.env.EXTERNAL_CDS_URL || config.external.cds;
    // If URL ends with /catalog, replace with /discover for the discover endpoint
    if (externalUrl.endsWith('/catalog')) {
      return externalUrl.replace(/\/catalog$/, '/discover');
    }
    return `${externalUrl}/discover`;
  };
  
  const cdsDiscoverUrl = getCdsDiscoverUrl();
  
  logger.info('Sending discover request', {
    transaction_id: txnId,
    message_id: context.message_id,
    action: 'discover',
    cdsUrl: cdsDiscoverUrl,
  });
  
  // Log outbound event
  await logEvent(txnId, context.message_id, 'discover', 'OUTBOUND', JSON.stringify(discoverMessage));
  
  try {
    const response = await axios.post(cdsDiscoverUrl, discoverMessage);
    
    // Check if the CDS returned catalog data synchronously in the response
    // External CDS may return data in ack.message.catalogs instead of via callback
    const syncCatalog = response.data?.ack?.message?.catalogs || 
                        response.data?.message?.catalogs ||
                        response.data?.catalogs;
    
    if (syncCatalog && syncCatalog.length > 0) {
      logger.info('Processing synchronous catalog response from CDS', {
        transaction_id: txnId,
        catalogCount: syncCatalog.length,
      });
      
      // Log ALL catalogs returned by CDS
      console.log(`[CDS-DEBUG] Total catalogs returned: ${syncCatalog.length}`);
      
      for (let i = 0; i < syncCatalog.length; i++) {
        const cat = syncCatalog[i];
        const items = cat['beckn:items'] || cat.items || [];
        const offers = cat['beckn:offers'] || cat.offers || [];
        const catalogId = cat['beckn:id'] || cat.id;
        const providerId = cat['beckn:providerId'] || cat.providerId;
        const bppId = cat['beckn:bppId'] || cat.bppId;
        
        console.log(`[CDS-DEBUG] Catalog[${i}]: id=${catalogId}, providerId=${providerId}, bppId=${bppId}, items=${items.length}, offers=${offers.length}`);
        
        // Log offer details if any
        if (offers.length > 0) {
          for (const offer of offers) {
            const offerId = offer['beckn:id'] || offer.id;
            console.log(`[CDS-DEBUG]   Offer: ${offerId}`);
          }
        }
        
        logger.info(`Catalog[${i}]: id=${catalogId}, provider=${providerId}, items=${items.length}, offers=${offers.length}`);
      }
      
      // Transform and store the synchronous catalog response
      const catalog = transformExternalCatalogFormat({ catalogs: syncCatalog });
      
      // Get the provider ID to exclude (user's own provider)
      const currentTxState = await getTransaction(txnId);
      const excludeProviderId = currentTxState?.excludeProviderId;
      
      // Filter out user's own provider from catalog
      const filteredProviders = catalog.providers.filter(p => p.id !== excludeProviderId);
      
      // Extract providers and offers for matching
      const providers = new Map<string, Provider>();
      const allOffers: CatalogOffer[] = [];
      
      for (const providerCatalog of filteredProviders) {
        providers.set(providerCatalog.id, {
          id: providerCatalog.id,
          name: providerCatalog.descriptor?.name || 'Unknown',
          trust_score: config.matching.defaultTrustScore,
          total_orders: 0,
          successful_orders: 0,
        });
        
        for (const item of providerCatalog.items || []) {
          allOffers.push(...(item.offers || []));
        }
      }
      
      // Always run matching algorithm to calculate scores for all offers
      let matchingResults = null;
      if (allOffers.length > 0) {
        const criteria: MatchingCriteria = {
          requestedQuantity: currentTxState?.discoveryCriteria?.minQuantity || 1,
          requestedTimeWindow: currentTxState?.discoveryCriteria?.timeWindow,
          maxPrice: currentTxState?.discoveryCriteria?.maxPrice,
        };
        
        try {
          matchingResults = matchOffers(allOffers, providers, criteria);
          logger.info(`Matching: scored ${matchingResults.allOffers.length} offers, ${matchingResults.eligibleCount} eligible`, {
            transaction_id: txnId,
          });
        } catch (matchError: any) {
          logger.error(`Matching algorithm error: ${matchError.message}`, { transaction_id: txnId });
        }
      }
      
      // Update transaction state with the catalog
      await updateTransaction(txnId, {
        catalog: { providers: filteredProviders },
        providers,
        matchingResults,
        status: 'SELECTING',
      });
      
      logger.info(`Synchronous catalog processed: ${filteredProviders.length} providers, ${allOffers.length} offers`, {
        transaction_id: txnId,
      });
    }
    
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
  
  if (!txState || !txState.catalog) {
    return res.status(400).json({ error: 'No catalog found for transaction. Run discover first.' });
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
    // Manual offer selection
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
    
    if (!selectedOffer) {
      return res.status(400).json({ error: `Offer ${offer_id} not found in catalog` });
    }
  } else {
    return res.status(400).json({ error: 'Either offer_id or autoMatch with requestedTimeWindow is required' });
  }
  
  // Determine BPP routing - use offer's bpp_uri if available (external), otherwise use local BPP
  const targetBppUri = selectedOffer.bpp_uri || config.bpp.uri;
  const targetBppId = selectedOffer.bpp_id || selectedOffer.provider_id;
  const isExternalBpp = !!selectedOffer.bpp_uri && selectedOffer.bpp_uri !== config.bpp.uri;
  
  // Create context with correct BPP info
  const context = createContext({
    action: 'select',
    transaction_id,
    bap_id: config.bap.id,
    bap_uri: config.bap.uri,
    bpp_id: targetBppId,
    bpp_uri: targetBppUri,
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
    targetBppUri,
    isExternalBpp,
  });
  
  await logEvent(transaction_id, context.message_id, 'select', 'OUTBOUND', JSON.stringify(selectMessage));
  
  // Update state - store both the offer and the quantity the buyer wants
  await updateTransaction(transaction_id, { selectedOffer, selectedQuantity: quantity });
  
  try {
    // Route to the correct BPP based on offer's bpp_uri
    const bppEndpoint = isExternalBpp ? targetBppUri : `${config.urls.bpp}/select`;
    const targetUrl = isExternalBpp ? `${targetBppUri}/select` : bppEndpoint;
    
    logger.info(`Routing select to BPP: ${targetUrl}`, { isExternalBpp, transaction_id });
    
    // Use secureAxios for external BPPs (handles Beckn HTTP signatures)
    // Use plain axios for local BPP (no signature needed)
    const response = isExternalBpp 
      ? await secureAxios.post(targetUrl, selectMessage)
      : await axios.post(targetUrl, selectMessage);
    
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
    logger.error(`Select request failed: ${error.message}`, { 
      transaction_id,
      status: error.response?.status,
      data: error.response?.data,
    });
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
  
  // Determine BPP routing - use offer's bpp_uri if available (external), otherwise use local BPP
  const targetBppUri = offer.bpp_uri || config.bpp.uri;
  const targetBppId = offer.bpp_id || offer.provider_id;
  const isExternalBpp = !!offer.bpp_uri && offer.bpp_uri !== config.bpp.uri;
  
  // Create context with correct BPP info
  const context = createContext({
    action: 'init',
    transaction_id,
    bap_id: config.bap.id,
    bap_uri: config.bap.uri,
    bpp_id: targetBppId,
    bpp_uri: targetBppUri,
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
    targetBppUri,
    isExternalBpp,
  });
  
  await logEvent(transaction_id, context.message_id, 'init', 'OUTBOUND', JSON.stringify(initMessage));
  
  try {
    // Route to the correct BPP based on offer's bpp_uri
    const targetUrl = isExternalBpp ? `${targetBppUri}/init` : `${config.urls.bpp}/init`;
    
    logger.info(`Routing init to BPP: ${targetUrl}`, { isExternalBpp, transaction_id });
    
    // Use secureAxios for external BPPs (handles Beckn HTTP signatures)
    const response = isExternalBpp 
      ? await secureAxios.post(targetUrl, initMessage)
      : await axios.post(targetUrl, initMessage);
    
    res.json({
      status: 'ok',
      transaction_id,
      message_id: context.message_id,
      ack: response.data,
    });
  } catch (error: any) {
    logger.error(`Init request failed: ${error.message}`, { 
      transaction_id,
      status: error.response?.status,
      data: error.response?.data,
    });
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
  
  // Determine BPP routing - use offer's bpp_uri if available (external), otherwise use local BPP
  const offer = txState.selectedOffer;
  const targetBppUri = offer?.bpp_uri || config.bpp.uri;
  const targetBppId = offer?.bpp_id || offer?.provider_id || config.bpp.id;
  const isExternalBpp = !!offer?.bpp_uri && offer.bpp_uri !== config.bpp.uri;
  
  // Create context with correct BPP info
  const context = createContext({
    action: 'confirm',
    transaction_id,
    bap_id: config.bap.id,
    bap_uri: config.bap.uri,
    bpp_id: targetBppId,
    bpp_uri: targetBppUri,
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
    targetBppUri,
    isExternalBpp,
  });
  
  await logEvent(transaction_id, context.message_id, 'confirm', 'OUTBOUND', JSON.stringify(confirmMessage));
  
  try {
    // Route to the correct BPP based on offer's bpp_uri
    const targetUrl = isExternalBpp ? `${targetBppUri}/confirm` : `${config.urls.bpp}/confirm`;
    
    logger.info(`Routing confirm to BPP: ${targetUrl}`, { isExternalBpp, transaction_id });
    
    // Use secureAxios for external BPPs (handles Beckn HTTP signatures)
    const response = isExternalBpp 
      ? await secureAxios.post(targetUrl, confirmMessage)
      : await axios.post(targetUrl, confirmMessage);

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
  
  // Determine BPP routing - use offer's bpp_uri if available (external), otherwise use local BPP
  const offer = txState.selectedOffer;
  const targetBppUri = offer?.bpp_uri || config.bpp.uri;
  const targetBppId = offer?.bpp_id || offer?.provider_id || config.bpp.id;
  const isExternalBpp = !!offer?.bpp_uri && offer.bpp_uri !== config.bpp.uri;
  
  // Create context with correct BPP info
  const context = createContext({
    action: 'status',
    transaction_id,
    bap_id: config.bap.id,
    bap_uri: config.bap.uri,
    bpp_id: targetBppId,
    bpp_uri: targetBppUri,
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
    targetBppUri,
    isExternalBpp,
  });
  
  await logEvent(transaction_id, context.message_id, 'status', 'OUTBOUND', JSON.stringify(statusMessage));
  
  try {
    // Route to the correct BPP based on offer's bpp_uri
    const targetUrl = isExternalBpp ? `${targetBppUri}/status` : `${config.urls.bpp}/status`;
    
    logger.info(`Routing status to BPP: ${targetUrl}`, { isExternalBpp, transaction_id });
    
    // Use secureAxios for external BPPs (handles Beckn HTTP signatures)
    const response = isExternalBpp 
      ? await secureAxios.post(targetUrl, statusMessage)
      : await axios.post(targetUrl, statusMessage);
    
    res.json({
      status: 'ok',
      transaction_id,
      message_id: context.message_id,
      ack: response.data,
    });
  } catch (error: any) {
    logger.error(`Status request failed: ${error.message}`, { 
      transaction_id,
      status: error.response?.status,
      data: error.response?.data,
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/transactions - Create a new transaction
 */
router.post('/api/transactions', async (req: Request, res: Response) => {
  const txnId = uuidv4();
  await createTransaction(txnId);
  logger.info('Created new transaction', { transaction_id: txnId });
  res.json({ transaction_id: txnId });
});

/**
 * GET /api/transactions - List all transactions
 */
router.get('/api/transactions', async (req: Request, res: Response) => {
  const transactions = await getAllTransactions();
  res.json({ transactions });
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
 * POST /api/settlement/verify-outcome - Decide release/refund
 * Supports both manual outcome and VC-based verification
 * 
 * Body options:
 * 1. Manual: { tradeId, outcome: 'SUCCESS' | 'FAIL' }
 * 2. VC-based: { tradeId, credential: VerifiableCredential, verificationOptions?: VerificationOptions }
 */
router.post('/api/settlement/verify-outcome', async (req: Request, res: Response) => {
  const { tradeId, outcome, credential, verificationOptions } = req.body as {
    tradeId?: string;
    outcome?: SettlementOutcome;
    credential?: unknown;
    verificationOptions?: VerificationOptions;
  };

  if (!tradeId) {
    return res.status(400).json({ error: 'tradeId is required' });
  }

  // Must provide either manual outcome OR credential for VC verification
  if (!outcome && !credential) {
    return res.status(400).json({
      error: 'Either outcome (SUCCESS|FAIL) or credential (VC) is required',
      usage: {
        manual: '{ tradeId, outcome: "SUCCESS" | "FAIL" }',
        vcBased: '{ tradeId, credential: {...}, verificationOptions?: {...} }',
      },
    });
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

  const expired = new Date(record.expiresAt!).getTime() < Date.now();
  if (expired) {
    await updateSettlementRecord(tradeId, { status: 'ERROR_EXPIRED' });
    const updated = await getSettlementRecord(tradeId);
    return res.status(400).json({ error: 'Settlement expired', record: updated, status: 'ERROR_EXPIRED' });
  }

  let finalOutcome: SettlementOutcome;
  let verificationResult = null;
  let vcMetadata: { vcId?: string; vcIssuer?: string; vcClaims?: string } = {};

  if (credential) {
    // VC-based verification
    try {
      verificationResult = await verifyCredential(credential, verificationOptions);
      finalOutcome = verificationResult.verified ? 'SUCCESS' : 'FAIL';
      
      const vc = credential as VerifiableCredential;
      vcMetadata = {
        vcId: vc.id || `vc-${Date.now()}`,
        vcIssuer: getIssuerId(vc.issuer),
        vcClaims: JSON.stringify(verificationResult.claims || {}),
      };

      logger.info('=== [STEP 5] VC-based verification complete', {
        tradeId,
        vcVerified: verificationResult.verified,
        vcId: vcMetadata.vcId,
        issuer: vcMetadata.vcIssuer,
        checksRun: verificationResult.checks.length,
        checksFailed: verificationResult.checks.filter(c => c.status === 'failed').length,
      });
    } catch (error: any) {
      logger.error(`VC verification failed: ${error.message}`, { tradeId });
      return res.status(400).json({
        error: `VC verification failed: ${error.message}`,
        tradeId,
      });
    }
  } else {
    // Manual outcome
    if (outcome !== 'SUCCESS' && outcome !== 'FAIL') {
      return res.status(400).json({ error: 'outcome must be SUCCESS or FAIL' });
    }
    finalOutcome = outcome;
    logger.info('=== [STEP 5] Manual verification outcome set', { tradeId, outcome: finalOutcome });
  }

  // Update settlement record
  await updateSettlementRecord(tradeId, {
    verificationOutcome: finalOutcome,
    verifiedAt: nowIso(),
  });

  // Try to store VC metadata if available (fields may not exist yet)
  if (vcMetadata.vcId) {
    try {
      await prisma.settlementRecord.update({
        where: { tradeId },
        data: {
          vcId: vcMetadata.vcId,
          vcIssuer: vcMetadata.vcIssuer,
          vcVerifiedAt: new Date().toISOString(),
          vcClaims: vcMetadata.vcClaims,
        },
      });
    } catch (e) {
      // Fields may not exist yet if migration hasn't run - that's OK
      logger.debug('Could not store VC metadata fields - schema may need migration');
    }
  }

  const updated = await getSettlementRecord(tradeId);
  logger.info('=== [STEP 6] TE -> Bank: Execute settlement instruction', {
    tradeId,
    action: finalOutcome === 'SUCCESS' ? 'RELEASE' : 'REFUND',
    method: credential ? 'VC-based' : 'manual',
  });

  res.json({
    status: 'ok',
    method: credential ? 'vc-based' : 'manual',
    record: updated,
    payout: buildPayoutInstruction(updated, finalOutcome),
    steps: buildPaymentSteps(updated),
    verificationResult: verificationResult || undefined,
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
 * POST /api/db/reset - Full database reset (clears all trading data)
 * WARNING: This will delete all orders, offers, items, and reset user balances
 */
router.post('/api/db/reset', async (req: Request, res: Response) => {
  try {
    logger.info('=== DATABASE RESET STARTED ===');
    
    // Clear in correct order for foreign key constraints
    const deleteCounts = {
      offerBlocks: 0,
      paymentRecords: 0,
      orders: 0,
      events: 0,
      catalogOffers: 0,
      catalogItems: 0,
      settlementRecords: 0,
      discomFeedback: 0,
      trustScoreHistory: 0,
    };
    
    // 1. Clear offer blocks
    const blocks = await prisma.offerBlock.deleteMany();
    deleteCounts.offerBlocks = blocks.count;
    
    // 2. Clear payment records
    const payments = await prisma.paymentRecord.deleteMany();
    deleteCounts.paymentRecords = payments.count;
    
    // 3. Clear DISCOM feedback
    const feedback = await prisma.discomFeedback.deleteMany();
    deleteCounts.discomFeedback = feedback.count;
    
    // 4. Clear orders
    const orders = await prisma.order.deleteMany();
    deleteCounts.orders = orders.count;
    
    // 5. Clear events
    const events = await prisma.event.deleteMany();
    deleteCounts.events = events.count;
    
    // 6. Clear catalog offers
    const offers = await prisma.catalogOffer.deleteMany();
    deleteCounts.catalogOffers = offers.count;
    
    // 7. Clear catalog items
    const items = await prisma.catalogItem.deleteMany();
    deleteCounts.catalogItems = items.count;
    
    // 8. Clear settlement records
    const settlements = await prisma.settlementRecord.deleteMany();
    deleteCounts.settlementRecords = settlements.count;
    
    // 9. Clear trust score history
    const trustHistory = await prisma.trustScoreHistory.deleteMany();
    deleteCounts.trustScoreHistory = trustHistory.count;
    
    // 10. Reset user balances, trust scores, and meter verification (but keep accounts)
    await prisma.user.updateMany({
      data: {
        balance: 1000, // Reset to default balance
        trustScore: 0.5, // Reset to default trust
        allowedTradeLimit: 10,
        productionCapacity: null, // Reset to null (not 0) so UI doesn't render "0"
        meterVerifiedCapacity: null, // Reset meter verification
        meterDataAnalyzed: false, // Reset meter analyzed flag
        meterPdfUrl: null, // Clear uploaded PDF
        providerId: null, // Unlink providers (they were deleted)
      },
    });
    
    // 11. Clear providers
    const providers = await prisma.provider.deleteMany();
    
    // 12. Clear Redis transaction states
    await clearAllTransactions();
    
    // 13. Reset demo accounts
    initializeDemoAccounts();
    
    logger.info('=== DATABASE RESET COMPLETE ===', deleteCounts);
    
    res.json({
      status: 'ok',
      message: 'Database reset complete',
      deleted: deleteCounts,
      providersDeleted: providers.count,
    });
  } catch (error: any) {
    logger.error(`Database reset failed: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ==================== VERIFIABLE CREDENTIALS ENDPOINTS ====================

/**
 * POST /api/vc/verify - Verify a Verifiable Credential
 * Accepts raw VC JSON and returns verification result
 */
router.post('/api/vc/verify', async (req: Request, res: Response) => {
  const { credential, options } = req.body as {
    credential?: unknown;
    options?: VerificationOptions;
  };

  if (!credential) {
    return res.status(400).json({ error: 'credential is required in request body' });
  }

  try {
    const result = await verifyCredential(credential, options);
    
    logger.info('VC verification completed', {
      verified: result.verified,
      credentialId: result.credentialId,
      issuer: result.issuer,
      checksRun: result.checks.length,
      checksFailed: result.checks.filter(c => c.status === 'failed').length,
    });

    res.json({
      status: 'ok',
      result,
    });
  } catch (error: any) {
    logger.error(`VC verification failed: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/vc/verify-json - Verify a VC from JSON string
 * Useful when receiving VC as a string (e.g., from file upload)
 */
router.post('/api/vc/verify-json', async (req: Request, res: Response) => {
  const { json, options } = req.body as {
    json?: string;
    options?: VerificationOptions;
  };

  if (!json || typeof json !== 'string') {
    return res.status(400).json({ error: 'json string is required in request body' });
  }

  try {
    const result = await parseAndVerifyCredential(json, options);
    
    logger.info('VC JSON verification completed', {
      verified: result.verified,
      credentialId: result.credentialId,
    });

    res.json({
      status: 'ok',
      result,
    });
  } catch (error: any) {
    logger.error(`VC JSON verification failed: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/vc/verify-generation-profile - Verify a Generation Profile VC
 * Specialized endpoint for energy generation credentials
 */
router.post('/api/vc/verify-generation-profile', async (req: Request, res: Response) => {
  const { credential, expectedProviderId, options } = req.body as {
    credential?: unknown;
    expectedProviderId?: string;
    options?: VerificationOptions;
  };

  if (!credential) {
    return res.status(400).json({ error: 'credential is required in request body' });
  }

  try {
    const result = await verifyGenerationProfile(credential, options);
    
    // If provider ID verification is requested, add that check
    if (expectedProviderId && result.verified) {
      const providerCheck = validateProviderMatch(
        credential as VerifiableCredential,
        expectedProviderId
      );
      result.checks.push(providerCheck);
      
      // Update verified status if provider check failed
      if (providerCheck.status === 'failed') {
        result.verified = false;
        result.error = 'Provider ID mismatch';
      }
    }

    logger.info('Generation Profile VC verification completed', {
      verified: result.verified,
      credentialId: result.credentialId,
      providerId: result.generationProfile?.providerId,
      sourceType: result.generationProfile?.sourceType,
      capacityKW: result.generationProfile?.installedCapacityKW,
    });

    res.json({
      status: 'ok',
      result,
      generationProfile: result.generationProfile,
    });
  } catch (error: any) {
    logger.error(`Generation Profile verification failed: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/vc/verify-and-settle/:tradeId - Verify VC and update settlement
 * Combines VC verification with settlement outcome update
 */
router.post('/api/vc/verify-and-settle/:tradeId', async (req: Request, res: Response) => {
  const { tradeId } = req.params;
  const { credential, options } = req.body as {
    credential?: unknown;
    options?: VerificationOptions;
  };

  if (!credential) {
    return res.status(400).json({ error: 'credential is required in request body' });
  }

  // Get settlement record
  const record = await getSettlementRecord(tradeId);
  if (!record) {
    return res.status(404).json({ error: 'Settlement record not found', status: 'ERROR_NO_RECORD' });
  }

  if (record.status === 'RELEASED' || record.status === 'REFUNDED') {
    return res.json({
      status: 'ok',
      message: 'Settlement already completed',
      record,
    });
  }

  if (record.status !== 'FUNDED') {
    return res.status(400).json({ error: 'Escrow not funded yet - cannot verify' });
  }

  try {
    // Verify the credential
    const verificationResult = await verifyCredential(credential, options);
    const vc = credential as VerifiableCredential;
    
    // Determine settlement outcome based on verification
    const outcome: SettlementOutcome = verificationResult.verified ? 'SUCCESS' : 'FAIL';
    
    // Check if settlement has expired
    const expired = new Date(record.expiresAt!).getTime() < Date.now();
    if (expired) {
      await updateSettlementRecord(tradeId, { status: 'ERROR_EXPIRED' });
      const updated = await getSettlementRecord(tradeId);
      return res.status(400).json({
        error: 'Settlement expired',
        record: updated,
        status: 'ERROR_EXPIRED',
        verificationResult,
      });
    }

    // Update settlement with VC verification info
    await updateSettlementRecord(tradeId, {
      verificationOutcome: outcome,
      verifiedAt: nowIso(),
      // Store VC metadata in the existing fields (we'll extend schema later)
    });

    // Also store VC details via separate update for the new fields
    try {
      await prisma.settlementRecord.update({
        where: { tradeId },
        data: {
          vcId: vc.id || `vc-${Date.now()}`,
          vcIssuer: getIssuerId(vc.issuer),
          vcVerifiedAt: new Date().toISOString(),
          vcClaims: JSON.stringify(verificationResult.claims || {}),
        },
      });
    } catch (e) {
      // Fields may not exist yet if migration hasn't run
      logger.warn('Could not store VC metadata - schema may need migration');
    }

    const updated = await getSettlementRecord(tradeId);

    logger.info('=== [VC SETTLEMENT] Verification complete', {
      tradeId,
      outcome,
      vcVerified: verificationResult.verified,
      vcId: vc.id,
      issuer: getIssuerId(vc.issuer),
    });

    res.json({
      status: 'ok',
      tradeId,
      outcome,
      verificationResult,
      record: updated,
      payout: buildPayoutInstruction(updated!, outcome),
      steps: buildPaymentSteps(updated),
    });
  } catch (error: any) {
    logger.error(`VC settlement verification failed: ${error.message}`, { tradeId });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/vc/schemas - Get information about supported VC schemas
 */
router.get('/api/vc/schemas', (req: Request, res: Response) => {
  res.json({
    schemas: [
      {
        type: 'GenerationProfileCredential',
        description: 'Energy generation profile credential for prosumers/providers',
        requiredClaims: ['providerId', 'installedCapacityKW', 'sourceType', 'gridConnectionStatus'],
        optionalClaims: ['providerName', 'authorizedCapacityKW', 'meterId', 'distributionUtility', 'location', 'certifications'],
        contextUrl: 'https://github.com/nfh-trust-labs/vc-schemas/tree/ies-vcs/energy-credentials/generation-profile-vc',
      },
      {
        type: 'GridConnectionCredential',
        description: 'Grid connection credential for energy assets',
        requiredClaims: ['connectionId', 'meterId', 'sanctionedLoad', 'distributionUtility', 'connectionType', 'voltageLevel', 'phaseType', 'tariffCategory', 'status'],
        optionalClaims: ['contractDemand', 'division', 'circle', 'billingCycle', 'connectionDate'],
        contextUrl: 'https://github.com/India-Energy-Stack/ies-specs/tree/main/energy-credentials',
      },
    ],
    verificationEndpoints: {
      verify: 'POST /api/vc/verify',
      verifyJson: 'POST /api/vc/verify-json',
      verifyGenerationProfile: 'POST /api/vc/verify-generation-profile',
      verifyAndSettle: 'POST /api/vc/verify-and-settle/:tradeId',
    },
    vcPortal: config.external.vcPortal,
  });
});

/**
 * GET /api/my-orders - Get orders for the authenticated buyer
 */
router.get('/api/my-orders', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const orders = await (prisma.order as any).findMany({
      where: {buyerId: userId},
      orderBy: {createdAt: 'desc'},
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
            where: {id: itemId},
            select: {sourceType: true},
          });
          sourceType = catalogItem?.sourceType || 'UNKNOWN';
        }
      }

      return {
        id: order.id,
        status: order.status,
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
      };
    }));

    res.json({ orders: formattedOrders });
  } catch (error: any) {
    logger.error(`Failed to get buyer orders: ${error.message}`);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

export default router;
