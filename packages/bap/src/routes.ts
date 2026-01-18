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

const router = Router();
const logger = createLogger('BAP');

/**
 * POST /api/discover - Initiate catalog discovery
 */
router.post('/api/discover', async (req: Request, res: Response) => {
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
  
  // Create transaction state with discovery criteria for matching
  await createTransaction(txnId);
  await updateTransaction(txnId, {
    discoveryCriteria: {
      sourceType,
      deliveryMode,
      minQuantity,
      timeWindow,
    },
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
 * DELETE /api/transactions - Clear all in-memory transactions
 */
router.delete('/api/transactions', async (req: Request, res: Response) => {
  const transactions = await getAllTransactions();
  const count = transactions.length;
  await clearAllTransactions();
  logger.info(`Cleared ${count} transactions from Redis`);
  res.json({ status: 'ok', cleared: count });
});

export default router;
