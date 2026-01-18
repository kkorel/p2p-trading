/**
 * BAP Callback Endpoints - Receives async responses from CDS/BPP
 */

import { Router, Request, Response } from 'express';
import {
  OnDiscoverMessage,
  OnSelectMessage,
  OnInitMessage,
  OnConfirmMessage,
  OnStatusMessage,
  createLogger,
  CatalogOffer,
  Provider,
  matchOffers,
  MatchingCriteria,
  config,
} from '@p2p/shared';
import { logEvent, isDuplicateMessage } from './events';
import { updateTransaction, getTransaction, createTransaction } from './state';

const router = Router();
const logger = createLogger('BAP');

/**
 * POST /callbacks/on_discover - Receive catalog from CDS
 */
router.post('/on_discover', async (req: Request, res: Response) => {
  const message = req.body as OnDiscoverMessage;
  const { context, message: content } = message;
  
  logger.info('Received on_discover callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });
  
  // Check for duplicate
  if (await isDuplicateMessage(context.message_id)) {
    logger.warn('Duplicate on_discover callback ignored', { message_id: context.message_id });
    return res.json({ status: 'ok', message: 'duplicate ignored' });
  }
  
  // Log event
  await logEvent(context.transaction_id, context.message_id, 'on_discover', 'INBOUND', JSON.stringify(message));
  
  // Update transaction state
  let txState = await getTransaction(context.transaction_id);
  if (!txState) {
    txState = await createTransaction(context.transaction_id);
  }
  
  // Get the provider ID to exclude (user's own provider)
  const excludeProviderId = txState.excludeProviderId;
  
  // Filter out user's own provider from catalog
  const filteredProviders = content.catalog.providers.filter(p => p.id !== excludeProviderId);
  
  // Extract providers and offers for matching (excluding user's own)
  const providers = new Map<string, Provider>();
  const allOffers: CatalogOffer[] = [];
  
  for (const providerCatalog of filteredProviders) {
    // Create basic provider entry (trust scores would come from a real provider registry)
    providers.set(providerCatalog.id, {
      id: providerCatalog.id,
      name: providerCatalog.descriptor?.name || 'Unknown',
      trust_score: config.matching.defaultTrustScore,
      total_orders: 0,
      successful_orders: 0,
    });
    
    for (const item of providerCatalog.items) {
      allOffers.push(...item.offers);
    }
  }
  
  // Update catalog with filtered providers
  const filteredCatalog = {
    ...content.catalog,
    providers: filteredProviders,
  };
  
  // Run matching algorithm if we have discovery criteria stored
  let matchingResults = null;
  if (txState.discoveryCriteria && allOffers.length > 0) {
    const criteria: MatchingCriteria = {
      requestedQuantity: txState.discoveryCriteria.minQuantity || 30,
      requestedTimeWindow: txState.discoveryCriteria.timeWindow,
    };
    
    try {
      matchingResults = matchOffers(allOffers, providers, criteria);
    } catch (matchError: any) {
      logger.error(`Matching algorithm error: ${matchError.message}`, {
        transaction_id: context.transaction_id,
        offers: allOffers.map(o => ({ id: o.id, hasTimeWindow: !!o.timeWindow })),
      });
      // Continue without matching results
    }
    
    if (matchingResults && matchingResults.selectedOffer) {
      logger.info(`Matching algorithm selected best offer: ${matchingResults.selectedOffer.offer.id} with score ${matchingResults.selectedOffer.score.toFixed(3)}`, {
        transaction_id: context.transaction_id,
        breakdown: matchingResults.selectedOffer.breakdown,
      });
    }
  }
  
  await updateTransaction(context.transaction_id, {
    catalog: filteredCatalog,
    providers,
    matchingResults,
    status: 'SELECTING',
  });
  
  const itemCount = filteredCatalog.providers.reduce((sum, p) => sum + p.items.length, 0);
  const offerCount = allOffers.length;
  
  if (excludeProviderId) {
    logger.info(`Filtered out user's own provider ${excludeProviderId} from catalog`, {
      transaction_id: context.transaction_id,
    });
  }
  
  logger.info(`Catalog received: ${filteredCatalog.providers.length} providers, ${itemCount} items, ${offerCount} offers`, {
    transaction_id: context.transaction_id,
  });
  
  res.json({ 
    status: 'ok', 
    providers: filteredCatalog.providers.length, 
    items: itemCount, 
    offers: offerCount,
    bestMatch: matchingResults?.selectedOffer ? {
      offer_id: matchingResults.selectedOffer.offer.id,
      score: matchingResults.selectedOffer.score,
      breakdown: matchingResults.selectedOffer.breakdown,
    } : null,
  });
});

/**
 * POST /callbacks/on_select - Receive selection confirmation from BPP
 */
router.post('/on_select', async (req: Request, res: Response) => {
  const message = req.body as OnSelectMessage;
  const { context, message: content } = message;
  
  logger.info('Received on_select callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });
  
  if (await isDuplicateMessage(context.message_id)) {
    return res.json({ status: 'ok', message: 'duplicate ignored' });
  }
  
  await logEvent(context.transaction_id, context.message_id, 'on_select', 'INBOUND', JSON.stringify(message));
  
  await updateTransaction(context.transaction_id, {
    status: 'INITIALIZING',
  });
  
  logger.info(`Selection confirmed: order ${content.order.id}, quote: ${content.order.quote.price.value} ${content.order.quote.price.currency}`, {
    transaction_id: context.transaction_id,
  });
  
  res.json({ status: 'ok', order_id: content.order.id });
});

/**
 * POST /callbacks/on_init - Receive order initialization from BPP
 */
router.post('/on_init', async (req: Request, res: Response) => {
  const message = req.body as any; // Can be OnInitMessage or error
  const { context, message: content, error } = message;
  
  logger.info('Received on_init callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
    hasError: !!error,
  });
  
  if (await isDuplicateMessage(context.message_id)) {
    return res.json({ status: 'ok', message: 'duplicate ignored' });
  }
  
  await logEvent(context.transaction_id, context.message_id, 'on_init', 'INBOUND', JSON.stringify(message));
  
  // Handle error response
  if (error) {
    logger.error(`Order initialization failed: ${error.message}`, {
      transaction_id: context.transaction_id,
      error_code: error.code,
    });
    
    await updateTransaction(context.transaction_id, {
      status: 'DISCOVERING', // Reset status so user can try again
      error: error.message,
    });
    
    return res.json({ status: 'error', error: error.message });
  }
  
  await updateTransaction(context.transaction_id, {
    order: content.order,
    status: 'CONFIRMING',
    error: undefined, // Clear any previous error
  });
  
  logger.info(`Order initialized: ${content.order.id}, status: ${content.order.status}`, {
    transaction_id: context.transaction_id,
  });
  
  res.json({ status: 'ok', order_id: content.order.id, order_status: content.order.status });
});

/**
 * POST /callbacks/on_confirm - Receive order confirmation from BPP
 */
router.post('/on_confirm', async (req: Request, res: Response) => {
  const message = req.body as OnConfirmMessage;
  const { context, message: content } = message;
  
  logger.info('Received on_confirm callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });
  
  if (await isDuplicateMessage(context.message_id)) {
    return res.json({ status: 'ok', message: 'duplicate ignored' });
  }
  
  await logEvent(context.transaction_id, context.message_id, 'on_confirm', 'INBOUND', JSON.stringify(message));
  
  await updateTransaction(context.transaction_id, {
    order: content.order,
    status: 'ACTIVE',
  });
  
  logger.info(`Order confirmed: ${content.order.id}, status: ${content.order.status}`, {
    transaction_id: context.transaction_id,
  });
  
  res.json({ status: 'ok', order_id: content.order.id, order_status: content.order.status });
});

/**
 * POST /callbacks/on_status - Receive order status from BPP
 */
router.post('/on_status', async (req: Request, res: Response) => {
  const message = req.body as OnStatusMessage;
  const { context, message: content } = message;
  
  logger.info('Received on_status callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });
  
  if (await isDuplicateMessage(context.message_id)) {
    return res.json({ status: 'ok', message: 'duplicate ignored' });
  }
  
  await logEvent(context.transaction_id, context.message_id, 'on_status', 'INBOUND', JSON.stringify(message));
  
  await updateTransaction(context.transaction_id, {
    order: content.order,
  });
  
  const fulfillmentState = content.fulfillment?.state?.descriptor?.name || 'Unknown';
  
  logger.info(`Order status: ${content.order.id}, status: ${content.order.status}, fulfillment: ${fulfillmentState}`, {
    transaction_id: context.transaction_id,
  });
  
  res.json({ 
    status: 'ok', 
    order_id: content.order.id, 
    order_status: content.order.status,
    fulfillment: fulfillmentState,
  });
});

export default router;
