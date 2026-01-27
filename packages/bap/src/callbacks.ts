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
 * Transform external CDS catalog format (beckn: prefixed) to our internal format
 * External format uses:
 * - catalogs[] instead of catalog.providers[]
 * - beckn:id, beckn:items, beckn:offers with beckn: prefix
 * - offers at catalog level instead of nested in items
 */
function transformExternalCatalog(rawMessage: any): { providers: any[] } {
  // Check if it's already in our internal format
  if (rawMessage.catalog?.providers) {
    logger.debug('Catalog already in internal format');
    return rawMessage.catalog;
  }
  
  // Check for external format with catalogs array
  const catalogs = rawMessage.catalogs || rawMessage.message?.catalogs || [];
  
  if (!catalogs.length) {
    logger.warn('No catalogs found in response');
    return { providers: [] };
  }
  
  logger.info(`Transforming ${catalogs.length} external catalogs to internal format`);
  
  const providers: any[] = [];
  
  for (const catalog of catalogs) {
    // Extract provider ID - try multiple possible locations
    const providerId = catalog['beckn:providerId'] || catalog.providerId || catalog['beckn:id'] || catalog.id;
    const providerName = catalog['beckn:descriptor']?.['schema:name'] || 
                         catalog.descriptor?.name ||
                         catalog['beckn:bppId'] ||
                         'Unknown Provider';
    
    // IMPORTANT: Extract BPP routing info for proper Beckn flows
    const bppId = catalog['beckn:bppId'] || catalog.bppId || providerId;
    const bppUri = catalog['beckn:bppUri'] || catalog.bppUri || null;
    
    // Extract items - handle beckn: prefix
    const rawItems = catalog['beckn:items'] || catalog.items || [];
    
    // Extract offers - can be at catalog level or in items
    const catalogOffers = catalog['beckn:offers'] || catalog.offers || [];
    
    const transformedItems: any[] = [];
    
    for (const item of rawItems) {
      const itemId = item['beckn:id'] || item.id;
      const itemAttrs = item['beckn:itemAttributes'] || item.itemAttributes || {};
      const itemProvider = item['beckn:provider'] || item.provider || {};
      
      // Find offers for this item
      const itemOfferIds = item['beckn:offers'] || [];
      const itemOffers: any[] = [];
      
      // If offers are at catalog level, filter by item reference
      for (const offer of catalogOffers) {
        const offerItems = offer['beckn:items'] || offer.items || [];
        const offerId = offer['beckn:id'] || offer.id;
        
        // Check if this offer is for this item
        if (offerItems.includes(itemId) || offerItems.length === 0) {
          const offerAttrs = offer['beckn:offerAttributes'] || offer.offerAttributes || {};
          const price = offerAttrs['beckn:price'] || offerAttrs.price || {};
          const timeWindow = offerAttrs['beckn:timeWindow'] || offerAttrs.timeWindow || {};
          const maxQty = offerAttrs['beckn:maxQuantity'] || offerAttrs.maxQuantity || {};
          
          itemOffers.push({
            id: offerId,
            item_id: itemId,
            provider_id: providerId,
            // BPP routing info for proper Beckn flows
            bpp_id: bppId,
            bpp_uri: bppUri,
            price: {
              value: price.value || 0,
              currency: price.currency || 'INR',
            },
            maxQuantity: maxQty.unitQuantity || offerAttrs.maximumQuantity || itemAttrs.availableQuantity || 100,
            timeWindow: {
              startTime: timeWindow['schema:startTime'] || timeWindow.startTime,
              endTime: timeWindow['schema:endTime'] || timeWindow.endTime,
            },
          });
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
    
    providers.push({
      id: providerId,
      descriptor: {
        name: providerName,
      },
      // BPP routing info at provider level
      bpp_id: bppId,
      bpp_uri: bppUri,
      items: transformedItems,
    });
  }
  
  logger.info(`Transformed catalog: ${providers.length} providers`);
  return { providers };
}

/**
 * POST /callbacks/on_discover - Receive catalog from CDS
 */
router.post('/on_discover', async (req: Request, res: Response) => {
  const message = req.body;
  // Handle different message formats - external CDS uses 'ack' wrapper
  const context = message.context || message.ack?.context;
  const content = message.message || message.ack?.message || message;
  
  if (!context) {
    logger.error('No context found in on_discover callback', { body: JSON.stringify(message).slice(0, 500) });
    return res.status(400).json({ status: 'error', message: 'Missing context' });
  }
  
  logger.info('Received on_discover callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
    hasAckWrapper: !!message.ack,
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
  
  // Transform external catalog format to internal format
  const catalog = transformExternalCatalog(content);
  
  // Get the provider ID to exclude (user's own provider)
  const excludeProviderId = txState.excludeProviderId;
  
  // Filter out user's own provider from catalog
  const filteredProviders = catalog.providers.filter(p => p.id !== excludeProviderId);
  
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
    ...catalog,
    providers: filteredProviders,
  };
  
  // Always run matching algorithm on all offers to calculate scores
  let matchingResults = null;
  if (allOffers.length > 0) {
    const criteria: MatchingCriteria = {
      requestedQuantity: txState.discoveryCriteria?.minQuantity || 1, // Default to 1 if not specified
      requestedTimeWindow: txState.discoveryCriteria?.timeWindow, // Can be undefined
      maxPrice: txState.discoveryCriteria?.maxPrice, // Can be undefined
    };
    
    try {
      matchingResults = matchOffers(allOffers, providers, criteria);
      
      logger.info(`Matching algorithm scored ${matchingResults.allOffers.length} offers, ${matchingResults.eligibleCount} eligible`, {
        transaction_id: context.transaction_id,
        criteria: {
          requestedQuantity: criteria.requestedQuantity,
          hasTimeWindow: !!criteria.requestedTimeWindow,
          maxPrice: criteria.maxPrice,
        },
      });
      
      if (matchingResults.selectedOffer) {
        logger.info(`Best matching offer: ${matchingResults.selectedOffer.offer.id} with score ${matchingResults.selectedOffer.score.toFixed(3)}`, {
          transaction_id: context.transaction_id,
          breakdown: matchingResults.selectedOffer.breakdown,
          matchesFilters: matchingResults.selectedOffer.matchesFilters,
        });
      }
    } catch (matchError: any) {
      logger.error(`Matching algorithm error: ${matchError.message}`, {
        transaction_id: context.transaction_id,
        offers: allOffers.map(o => ({ id: o.id, hasTimeWindow: !!o.timeWindow })),
      });
      // Continue without matching results
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
 * This is where we write the trade to the DEG Ledger
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
  
  // Get transaction state to retrieve buyer info
  const txState = await getTransaction(context.transaction_id);
  
  await updateTransaction(context.transaction_id, {
    order: content.order,
    status: 'ACTIVE',
  });
  
  logger.info(`Order confirmed: ${content.order.id}, status: ${content.order.status}`, {
    transaction_id: context.transaction_id,
  });

  // Write trade to DEG Ledger (async, don't block response)
  // Import dynamically to avoid circular dependencies
  import('./ledger').then(async ({ writeTradeToLedger }) => {
    try {
      const buyerId = txState?.buyerId || 'unknown-buyer';
      const sellerId = content.order.items?.[0]?.provider_id || 'unknown-seller';
      
      const ledgerResult = await writeTradeToLedger(
        context.transaction_id,
        content.order,
        buyerId,
        sellerId
      );
      
      if (ledgerResult.success) {
        logger.info('Trade recorded in ledger', {
          transaction_id: context.transaction_id,
          ledger_record_id: ledgerResult.recordId,
        });
      } else {
        logger.warn('Failed to record trade in ledger (non-blocking)', {
          transaction_id: context.transaction_id,
          error: ledgerResult.error,
        });
      }
    } catch (ledgerError: any) {
      logger.error('Ledger write error (non-blocking)', {
        transaction_id: context.transaction_id,
        error: ledgerError.message,
      });
    }
  }).catch(err => {
    logger.error('Failed to load ledger module', { error: err.message });
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
