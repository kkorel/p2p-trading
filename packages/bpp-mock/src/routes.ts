/**
 * BPP Mock Routes - Select, Init, Confirm, Status
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  SelectMessage,
  OnSelectMessage,
  InitMessage,
  OnInitMessage,
  ConfirmMessage,
  OnConfirmMessage,
  StatusMessage,
  OnStatusMessage,
  VerificationStartMessage,
  OnVerificationStartMessage,
  SubmitProofsMessage,
  OnProofsSubmittedMessage,
  AcceptVerificationMessage,
  OnVerificationAcceptedMessage,
  RejectVerificationMessage,
  OnVerificationRejectedMessage,
  SettlementStartMessage,
  OnSettlementInitiatedMessage,
  OnSettlementPendingMessage,
  OnSettlementSettledMessage,
  OnSettlementFailedMessage,
  createAck,
  createNack,
  createCallbackContext,
  createLogger,
  config,
  ErrorCodes,
  OrderItem,
  Quote,
  SettlementType,
} from '@p2p/shared';
import { 
  getOfferById, 
  getItemAvailableQuantity, 
  getProvider, 
  updateProviderStats,
  registerProvider,
  getAllProviders,
  addCatalogItem,
  getProviderItems,
  getAllItems,
  addOffer,
  getProviderOffers,
  getAllOffers,
  updateItemQuantity,
  deleteOffer,
  claimBlocks,
  markBlocksAsSold,
  releaseBlocks,
  getBlockStats,
  getAvailableBlockCount,
  getBlocksForOrder,
} from './catalog';
import { 
  getOrderByTransactionId, 
  getOrderById, 
  createOrder, 
  updateOrderStatus,
  updateOrderStatusByTransactionId 
} from './orders';
import { logEvent, isDuplicateMessage } from './events';
import { getDb, saveDb } from './db';

const router = Router();
const logger = createLogger('BPP');

/**
 * POST /select - Handle offer selection
 */
router.post('/select', async (req: Request, res: Response) => {
  const message = req.body as SelectMessage;
  const { context, message: content } = message;
  
  logger.info('Received select request', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });
  
  // Check for duplicate message
  if (isDuplicateMessage(context.message_id)) {
    logger.warn('Duplicate message detected, returning ACK', {
      transaction_id: context.transaction_id,
      message_id: context.message_id,
    });
    return res.json(createAck(context));
  }
  
  // Log inbound event
  logEvent(context.transaction_id, context.message_id, 'select', 'INBOUND', JSON.stringify(message));
  
  // Validate offers and quantities
  const validationErrors: string[] = [];
  const orderItems: OrderItem[] = [];
  let totalPrice = 0;
  let totalQuantity = 0;
  let currency = 'USD';
  let providerId = '';
  
  for (const item of content.orderItems) {
    const offer = getOfferById(item.offer_id);
    
    if (!offer) {
      validationErrors.push(`Offer ${item.offer_id} not found`);
      continue;
    }
    
    providerId = offer.provider_id;
    
    // Check available blocks instead of max quantity
    const availableBlocks = getAvailableBlockCount(item.offer_id);
    if (item.quantity > availableBlocks) {
      validationErrors.push(`Requested quantity ${item.quantity} exceeds available blocks ${availableBlocks}`);
    }
    
    // Also check item-level availability as a safety check
    const availableQty = getItemAvailableQuantity(item.item_id);
    if (availableQty !== null && item.quantity > availableQty) {
      validationErrors.push(`Requested quantity ${item.quantity} exceeds item available ${availableQty}`);
    }
    
    // Calculate prices
    const itemPrice = offer.price.value * item.quantity;
    totalPrice += itemPrice;
    totalQuantity += item.quantity;
    currency = offer.price.currency;
    
    orderItems.push({
      item_id: item.item_id,
      offer_id: item.offer_id,
      provider_id: offer.provider_id,
      quantity: item.quantity,
      price: { value: itemPrice, currency },
      timeWindow: offer.timeWindow,
    });
  }
  
  if (validationErrors.length > 0) {
    return res.json(createNack(context, {
      code: ErrorCodes.INVALID_REQUEST,
      message: validationErrors.join('; '),
    }));
  }
  
  // Send ACK
  res.json(createAck(context));
  
  // Send callback asynchronously
  setTimeout(async () => {
    try {
      const callbackContext = createCallbackContext(context, 'on_select');
      const provider = getProvider(providerId);
      
      const quote: Quote = {
        price: { value: totalPrice, currency },
        totalQuantity,
      };
      
      const onSelectMessage: OnSelectMessage = {
        context: callbackContext,
        message: {
          order: {
            id: uuidv4(),
            items: content.orderItems,
            quote,
            provider: {
              id: providerId,
              descriptor: provider ? { name: provider.name } : undefined,
            },
          },
        },
      };
      
      logEvent(context.transaction_id, callbackContext.message_id, 'on_select', 'OUTBOUND', JSON.stringify(onSelectMessage));
      
      const callbackUrl = `${context.bap_uri}/callbacks/on_select`;
      logger.info(`Sending on_select callback to ${callbackUrl}`, {
        transaction_id: context.transaction_id,
        action: 'on_select',
      });
      
      await axios.post(callbackUrl, onSelectMessage);
      logger.info('on_select callback sent successfully', { transaction_id: context.transaction_id });
    } catch (error: any) {
      logger.error(`Failed to send on_select callback: ${error.message}`, { transaction_id: context.transaction_id });
    }
  }, config.callbackDelay);
});

/**
 * POST /init - Initialize order (create draft)
 */
router.post('/init', async (req: Request, res: Response) => {
  const message = req.body as InitMessage;
  const { context, message: content } = message;
  
  logger.info('Received init request', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });
  
  if (isDuplicateMessage(context.message_id)) {
    logger.warn('Duplicate message detected', { transaction_id: context.transaction_id });
    return res.json(createAck(context));
  }
  
  logEvent(context.transaction_id, context.message_id, 'init', 'INBOUND', JSON.stringify(message));
  
  // Check if order already exists for this transaction
  const existingOrder = getOrderByTransactionId(context.transaction_id);
  if (existingOrder) {
    logger.info('Order already exists for transaction', { transaction_id: context.transaction_id });
    res.json(createAck(context));
    
    // Return existing order in callback
    setTimeout(async () => {
      try {
        const callbackContext = createCallbackContext(context, 'on_init');
        const onInitMessage: OnInitMessage = {
          context: callbackContext,
          message: { order: existingOrder },
        };
        
        logEvent(context.transaction_id, callbackContext.message_id, 'on_init', 'OUTBOUND', JSON.stringify(onInitMessage));
        await axios.post(`${context.bap_uri}/callbacks/on_init`, onInitMessage);
      } catch (error: any) {
        logger.error(`Failed to send on_init callback: ${error.message}`, { transaction_id: context.transaction_id });
      }
    }, config.callbackDelay);
    
    return;
  }
  
  res.json(createAck(context));
  
  setTimeout(async () => {
    try {
      // Build order items and quote
      const orderItems: OrderItem[] = [];
      let totalPrice = 0;
      let totalQuantity = 0;
      let currency = 'USD';
      let providerId = content.order.provider.id;
      let selectedOfferId = '';
      
      // Temporary order ID for block reservation (will be updated after order creation)
      const tempOrderId = uuidv4();
      
      for (const item of content.order.items) {
        const offer = getOfferById(item.offer_id);
        if (offer) {
          selectedOfferId = offer.id;
          
          // Claim blocks atomically for this purchase
          const claimedBlocks = claimBlocks(item.offer_id, item.quantity, tempOrderId, context.transaction_id);
          
          if (claimedBlocks.length < item.quantity) {
            // Not enough blocks available - release any claimed blocks and fail
            releaseBlocks(context.transaction_id);
            logger.error(`Not enough blocks available: requested ${item.quantity}, got ${claimedBlocks.length}`, {
              transaction_id: context.transaction_id,
              offer_id: item.offer_id,
            });
            throw new Error(`Not enough blocks available: requested ${item.quantity}, available ${claimedBlocks.length}`);
          }
          
          // Sync reserved blocks to CDS
          try {
            await axios.post(`${config.urls.cds}/sync/blocks`, {
              offer_id: item.offer_id,
              block_ids: claimedBlocks.map(b => b.id),
              status: 'RESERVED',
              order_id: tempOrderId,
              transaction_id: context.transaction_id,
            });
            logger.info(`Synced ${claimedBlocks.length} reserved blocks to CDS for offer ${item.offer_id}`);
          } catch (syncError: any) {
            logger.error(`Failed to sync reserved blocks to CDS: ${syncError.message}`);
          }
          
          const itemPrice = offer.price.value * item.quantity;
          totalPrice += itemPrice;
          totalQuantity += item.quantity;
          currency = offer.price.currency;
          
          orderItems.push({
            item_id: item.item_id,
            offer_id: item.offer_id,
            provider_id: offer.provider_id,
            quantity: item.quantity, // This is the actual purchased quantity
            price: { value: itemPrice, currency },
            timeWindow: offer.timeWindow,
          });
        }
      }
      
      const quote: Quote = {
        price: { value: totalPrice, currency },
        totalQuantity,
      };
      
      // Create order in PENDING state
      const order = createOrder(context.transaction_id, providerId, selectedOfferId, orderItems, quote, 'PENDING');
      
      // Update block order_id references to the actual order ID
      const db = getDb();
      db.run(
        `UPDATE offer_blocks SET order_id = ? WHERE order_id = ? AND transaction_id = ?`,
        [order.id, tempOrderId, context.transaction_id]
      );
      saveDb();
      
      const callbackContext = createCallbackContext(context, 'on_init');
      const onInitMessage: OnInitMessage = {
        context: callbackContext,
        message: { order },
      };
      
      logEvent(context.transaction_id, callbackContext.message_id, 'on_init', 'OUTBOUND', JSON.stringify(onInitMessage));
      
      const callbackUrl = `${context.bap_uri}/callbacks/on_init`;
      logger.info(`Sending on_init callback to ${callbackUrl}`, {
        transaction_id: context.transaction_id,
        action: 'on_init',
      });
      
      await axios.post(callbackUrl, onInitMessage);
      logger.info('on_init callback sent successfully', { transaction_id: context.transaction_id });
    } catch (error: any) {
      logger.error(`Failed to send on_init callback: ${error.message}`, { transaction_id: context.transaction_id });
    }
  }, config.callbackDelay);
});

/**
 * POST /confirm - Confirm order (make it active)
 */
router.post('/confirm', async (req: Request, res: Response) => {
  const message = req.body as ConfirmMessage;
  const { context, message: content } = message;
  
  logger.info('Received confirm request', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });
  
  if (isDuplicateMessage(context.message_id)) {
    logger.warn('Duplicate message detected', { transaction_id: context.transaction_id });
    return res.json(createAck(context));
  }
  
  logEvent(context.transaction_id, context.message_id, 'confirm', 'INBOUND', JSON.stringify(message));
  
  // Get existing order
  let order = getOrderById(content.order.id) || getOrderByTransactionId(context.transaction_id);
  
  if (!order) {
    return res.json(createNack(context, {
      code: ErrorCodes.ORDER_NOT_FOUND,
      message: `Order ${content.order.id} not found`,
    }));
  }
  
  res.json(createAck(context));
  
  setTimeout(async () => {
    try {
      // Idempotent confirm: only update if not already ACTIVE
      if (order!.status !== 'ACTIVE') {
        order = updateOrderStatus(order!.id, 'ACTIVE');
        logger.info('Order status updated to ACTIVE', { transaction_id: context.transaction_id, order_id: order!.id });
        
        // Mark reserved blocks as SOLD
        const soldBlocks = getBlocksForOrder(order!.id);
        markBlocksAsSold(order!.id);
        logger.info(`Marked ${soldBlocks.length} blocks as SOLD for order ${order!.id}`, { transaction_id: context.transaction_id });
        
        // Sync block status to CDS
        if (soldBlocks.length > 0 && order!.items && order!.items.length > 0) {
          const firstItem = order!.items[0];
          try {
            await axios.post(`${config.urls.cds}/sync/blocks`, {
              offer_id: firstItem.offer_id,
              block_ids: soldBlocks.map(b => b.id),
              status: 'SOLD',
              order_id: order!.id,
              transaction_id: context.transaction_id,
            });
            logger.info(`Synced ${soldBlocks.length} sold blocks to CDS for offer ${firstItem.offer_id}`);
          } catch (syncError: any) {
            logger.error(`Failed to sync block status to CDS: ${syncError.message}`);
          }
        }
        
        // Reduce item available quantity when order is confirmed (for item-level tracking)
        if (order!.items && order!.items.length > 0) {
          for (const orderItem of order!.items) {
            const currentQty = getItemAvailableQuantity(orderItem.item_id);
            if (currentQty !== null) {
              const soldQty = orderItem.quantity; // This is the actual purchased quantity from blocks
              const newQty = Math.max(0, currentQty - soldQty);
              
              updateItemQuantity(orderItem.item_id, newQty);
              logger.info(`Item ${orderItem.item_id} quantity reduced: ${currentQty} → ${newQty} kWh (sold: ${soldQty} kWh)`, {
                transaction_id: context.transaction_id,
              });
              
              // Sync updated quantity to CDS
              try {
                // Get provider_id from the order item (not from Order which doesn't have it)
                const providerId = orderItem.provider_id || '';
                const item = getProviderItems(providerId).find(i => i.id === orderItem.item_id);
                if (item) {
                  await syncItemToCDS({
                    id: item.id,
                    provider_id: item.provider_id,
                    source_type: item.source_type,
                    delivery_mode: item.delivery_mode,
                    available_qty: newQty,
                    production_windows: item.production_windows,
                    meter_id: item.meter_id,
                  });
                  logger.info(`Synced updated quantity to CDS for item ${orderItem.item_id}`);
                }
              } catch (syncError: any) {
                logger.error(`Failed to sync quantity update to CDS: ${syncError.message}`);
              }
            }
          }
        }
      } else {
        logger.info('Order already ACTIVE, idempotent confirm', { transaction_id: context.transaction_id });
      }
      
      const callbackContext = createCallbackContext(context, 'on_confirm');
      const onConfirmMessage: OnConfirmMessage = {
        context: callbackContext,
        message: { order: order! },
      };
      
      logEvent(context.transaction_id, callbackContext.message_id, 'on_confirm', 'OUTBOUND', JSON.stringify(onConfirmMessage));
      
      const callbackUrl = `${context.bap_uri}/callbacks/on_confirm`;
      logger.info(`Sending on_confirm callback to ${callbackUrl}`, {
        transaction_id: context.transaction_id,
        action: 'on_confirm',
      });
      
      await axios.post(callbackUrl, onConfirmMessage);
      logger.info('on_confirm callback sent successfully', { transaction_id: context.transaction_id });
    } catch (error: any) {
      logger.error(`Failed to send on_confirm callback: ${error.message}`, { transaction_id: context.transaction_id });
    }
  }, config.callbackDelay);
});

/**
 * POST /status - Get order status
 */
router.post('/status', async (req: Request, res: Response) => {
  const message = req.body as StatusMessage;
  const { context, message: content } = message;
  
  logger.info('Received status request', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });
  
  if (isDuplicateMessage(context.message_id)) {
    return res.json(createAck(context));
  }
  
  logEvent(context.transaction_id, context.message_id, 'status', 'INBOUND', JSON.stringify(message));
  
  // Get order
  const order = getOrderById(content.order_id) || getOrderByTransactionId(context.transaction_id);
  
  if (!order) {
    return res.json(createNack(context, {
      code: ErrorCodes.ORDER_NOT_FOUND,
      message: `Order not found`,
    }));
  }
  
  res.json(createAck(context));
  
  setTimeout(async () => {
    try {
      const callbackContext = createCallbackContext(context, 'on_status');
      
      // Stubbed fulfillment for Phase-1
      const onStatusMessage: OnStatusMessage = {
        context: callbackContext,
        message: {
          order,
          fulfillment: {
            id: uuidv4(),
            type: 'ENERGY_DELIVERY',
            state: {
              descriptor: {
                code: order.status === 'ACTIVE' ? 'IN_PROGRESS' : 'PENDING',
                name: order.status === 'ACTIVE' ? 'Energy delivery in progress' : 'Awaiting confirmation',
              },
            },
          },
        },
      };
      
      logEvent(context.transaction_id, callbackContext.message_id, 'on_status', 'OUTBOUND', JSON.stringify(onStatusMessage));
      
      const callbackUrl = `${context.bap_uri}/callbacks/on_status`;
      logger.info(`Sending on_status callback to ${callbackUrl}`, {
        transaction_id: context.transaction_id,
        action: 'on_status',
      });
      
      await axios.post(callbackUrl, onStatusMessage);
      logger.info('on_status callback sent successfully', { transaction_id: context.transaction_id });
    } catch (error: any) {
      logger.error(`Failed to send on_status callback: ${error.message}`, { transaction_id: context.transaction_id });
    }
  }, config.callbackDelay);
});

// ==================== CDS SYNC HELPERS ====================

/**
 * Sync provider to CDS
 */
async function syncProviderToCDS(provider: { id: string; name: string; trust_score?: number }) {
  try {
    await axios.post(`${config.urls.cds}/sync/provider`, provider);
    logger.info(`Synced provider ${provider.id} to CDS`);
  } catch (error: any) {
    logger.error(`Failed to sync provider to CDS: ${error.message}`);
  }
}

/**
 * Sync item to CDS
 */
async function syncItemToCDS(item: any) {
  try {
    await axios.post(`${config.urls.cds}/sync/item`, item);
    logger.info(`Synced item ${item.id} to CDS`);
  } catch (error: any) {
    logger.error(`Failed to sync item to CDS: ${error.message}`);
  }
}

/**
 * Sync offer to CDS
 */
async function syncOfferToCDS(offer: any) {
  try {
    await axios.post(`${config.urls.cds}/sync/offer`, offer);
    logger.info(`Synced offer ${offer.id} to CDS`);
  } catch (error: any) {
    logger.error(`Failed to sync offer to CDS: ${error.message}`);
  }
}

/**
 * Delete offer from CDS
 */
async function deleteOfferFromCDS(offerId: string) {
  try {
    await axios.delete(`${config.urls.cds}/sync/offer/${offerId}`);
    logger.info(`Deleted offer ${offerId} from CDS`);
  } catch (error: any) {
    logger.error(`Failed to delete offer from CDS: ${error.message}`);
  }
}

// ==================== SELLER APIs ====================

/**
 * POST /seller/register - Register as a new provider
 */
router.post('/seller/register', async (req: Request, res: Response) => {
  const { name } = req.body as { name: string };
  
  if (!name) {
    return res.status(400).json({ error: 'Provider name is required' });
  }
  
  const provider = registerProvider(name);
  logger.info(`New provider registered: ${provider.id} (${name})`);
  
  // Sync to CDS
  await syncProviderToCDS(provider);
  
  res.json({ status: 'ok', provider });
});

/**
 * GET /seller/providers - List all providers
 */
router.get('/seller/providers', (req: Request, res: Response) => {
  const providers = getAllProviders();
  res.json({ providers });
});

/**
 * GET /seller/providers/:id - Get provider details
 */
router.get('/seller/providers/:id', (req: Request, res: Response) => {
  const provider = getProvider(req.params.id);
  
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  
  const items = getProviderItems(req.params.id);
  const offers = getProviderOffers(req.params.id);
  
  res.json({ provider, items, offers });
});

/**
 * POST /seller/items - Add a new catalog item (energy listing)
 */
router.post('/seller/items', async (req: Request, res: Response) => {
  const { 
    provider_id, 
    source_type, 
    delivery_mode, 
    available_qty, 
    production_windows,
    meter_id 
  } = req.body;
  
  if (!provider_id || !source_type || !available_qty) {
    return res.status(400).json({ error: 'provider_id, source_type, and available_qty are required' });
  }
  
  const provider = getProvider(provider_id);
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  
  const item = addCatalogItem(
    provider_id,
    source_type,
    'SCHEDULED', // Always scheduled for P2P energy trading
    available_qty,
    production_windows || [],
    meter_id || `meter-${Date.now()}`
  );
  
  logger.info(`New item listed: ${item.id} by provider ${provider_id}`);
  
  // Sync to CDS
  await syncItemToCDS({
    id: item.id,
    provider_id: item.provider_id,
    source_type: item.source_type,
    delivery_mode: item.delivery_mode,
    available_qty: item.available_qty,
    production_windows: item.production_windows,
    meter_id: item.meter_id,
  });
  
  res.json({ status: 'ok', item });
});

/**
 * GET /seller/items - List all items
 */
router.get('/seller/items', (req: Request, res: Response) => {
  const { provider_id } = req.query;
  
  const items = provider_id 
    ? getProviderItems(provider_id as string)
    : getAllItems();
  
  res.json({ items });
});

/**
 * PUT /seller/items/:id/quantity - Update item quantity
 */
router.put('/seller/items/:id/quantity', (req: Request, res: Response) => {
  const { quantity } = req.body;
  
  if (quantity === undefined || quantity < 0) {
    return res.status(400).json({ error: 'Valid quantity is required' });
  }
  
  updateItemQuantity(req.params.id, quantity);
  logger.info(`Item ${req.params.id} quantity updated to ${quantity}`);
  
  res.json({ status: 'ok', item_id: req.params.id, new_quantity: quantity });
});

/**
 * POST /seller/offers - Add a new offer for an item
 */
router.post('/seller/offers', async (req: Request, res: Response) => {
  const { 
    item_id, 
    provider_id, 
    price_per_kwh, 
    currency, 
    max_qty, 
    time_window 
  } = req.body;
  
  if (!item_id || !provider_id || !price_per_kwh || !max_qty || !time_window) {
    return res.status(400).json({ 
      error: 'item_id, provider_id, price_per_kwh, max_qty, and time_window are required' 
    });
  }
  
  const offer = addOffer(
    item_id,
    provider_id,
    price_per_kwh,
    currency || 'USD',
    max_qty,
    time_window
  );
  
  logger.info(`New offer created: ${offer.id} for item ${item_id}`);
  
  // Sync to CDS
  await syncOfferToCDS({
    id: offer.id,
    item_id: offer.item_id,
    provider_id: offer.provider_id,
    price_value: offer.price.value,
    currency: offer.price.currency,
    max_qty: offer.maxQuantity,
    time_window: offer.timeWindow,
    offer_attributes: offer.offerAttributes,
  });
  
  res.json({ status: 'ok', offer });
});

/**
 * GET /seller/offers - List all offers
 */
router.get('/seller/offers', (req: Request, res: Response) => {
  const { provider_id } = req.query;
  
  const offers = provider_id 
    ? getProviderOffers(provider_id as string)
    : getAllOffers();
  
  res.json({ offers });
});

/**
 * DELETE /seller/offers/:id - Delete an offer
 */
router.delete('/seller/offers/:id', async (req: Request, res: Response) => {
  deleteOffer(req.params.id);
  logger.info(`Offer ${req.params.id} deleted`);
  
  // Sync deletion to CDS
  await deleteOfferFromCDS(req.params.id);
  
  res.json({ status: 'ok', deleted: req.params.id });
});

/**
 * GET /seller/orders - Get orders for a provider
 */
router.get('/seller/orders', (req: Request, res: Response) => {
  const { provider_id } = req.query;
  
  // Import dynamically to avoid circular deps
  const { getOrdersByProviderId, getAllOrders } = require('./orders');
  
  const orders = provider_id 
    ? getOrdersByProviderId(provider_id as string)
    : getAllOrders();
  
  // Enrich orders with block information
  const enrichedOrders = orders.map(order => {
    try {
      if (order.items && order.items.length > 0) {
        const firstItem = order.items[0];
        const itemId = firstItem.item_id;
        const offerId = firstItem.offer_id;
        
        // Get actual purchased quantity from blocks (not from offer max)
        const orderBlocks = getBlocksForOrder(order.id);
        const actualSoldQty = orderBlocks.length; // Each block = 1 unit
        
        // Get item-level available quantity
        const availableQty = getItemAvailableQuantity(itemId);
        
        // Get offer block stats
        const blockStats = getBlockStats(offerId);
        
        return {
          ...order,
          itemInfo: {
            item_id: itemId,
            offer_id: offerId,
            available_quantity: availableQty,
            sold_quantity: actualSoldQty, // Actual purchased quantity from blocks
            remaining_quantity: availableQty !== null ? availableQty - actualSoldQty : null,
            block_stats: blockStats,
          },
        };
      }
    } catch (error: any) {
      logger.error(`Error enriching order ${order.id}: ${error.message}`);
    }
    return order;
  });
  
  res.json({ orders: enrichedOrders });
});

// ============ PHASE-3: VERIFICATION & SETTLEMENT ============

/**
 * POST /verification_start - Handle verification start request
 */
router.post('/verification_start', async (req: Request, res: Response) => {
  const message = req.body as VerificationStartMessage;
  const { context, message: content } = message;
  
  logger.info('Received verification_start request', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    order_id: content.order_id,
  });
  
  if (isDuplicateMessage(context.message_id)) {
    return res.json(createAck(context));
  }
  
  logEvent(context.transaction_id, context.message_id, 'verification_start', 'INBOUND', JSON.stringify(message));
  
  // Get order
  const order = getOrderById(content.order_id);
  if (!order) {
    return res.json(createNack(context, {
      code: ErrorCodes.ORDER_NOT_FOUND,
      message: `Order ${content.order_id} not found`,
    }));
  }
  
  res.json(createAck(context));
  
  setTimeout(async () => {
    try {
      const callbackContext = createCallbackContext(context, 'on_verification_start');
      const caseId = uuidv4();
      
      // Create verification case in DB
      const db = getDb();
      db.run(
        `INSERT INTO verification_cases (
          id, order_id, transaction_id, state, required_proofs_json,
          tolerance_rules_json, window_json, expected_qty, expires_at, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          caseId,
          content.order_id,
          context.transaction_id,
          'PENDING',
          JSON.stringify(content.required_proofs),
          JSON.stringify(content.tolerance_rules),
          JSON.stringify(content.verification_window),
          content.expected_quantity.value,
          content.required_proofs[0]?.deadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          JSON.stringify(message),
        ]
      );
      saveDb();
      
      const onVerificationStartMessage: OnVerificationStartMessage = {
        context: callbackContext,
        message: {
          verification_case: {
            id: caseId,
            order_id: content.order_id,
            state: 'PENDING',
            verification_window: content.verification_window,
            required_proofs: content.required_proofs,
            expected_quantity: content.expected_quantity,
            expires_at: content.required_proofs[0]?.deadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      };
      
      logEvent(context.transaction_id, callbackContext.message_id, 'on_verification_start', 'OUTBOUND', JSON.stringify(onVerificationStartMessage));
      
      await axios.post(`${context.bap_uri}/callbacks/on_verification_start`, onVerificationStartMessage);
      logger.info('on_verification_start callback sent successfully', { transaction_id: context.transaction_id });
    } catch (error: any) {
      logger.error(`Failed to send on_verification_start callback: ${error.message}`, { transaction_id: context.transaction_id });
    }
  }, config.callbackDelay);
});

/**
 * POST /submit_proofs - Handle proof submission
 */
router.post('/submit_proofs', async (req: Request, res: Response) => {
  const message = req.body as SubmitProofsMessage;
  const { context, message: content } = message;
  
  logger.info('Received submit_proofs request', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    verification_case_id: content.verification_case_id,
    proof_count: content.proofs.length,
  });
  
  if (isDuplicateMessage(context.message_id)) {
    return res.json(createAck(context));
  }
  
  logEvent(context.transaction_id, context.message_id, 'submit_proofs', 'INBOUND', JSON.stringify(message));
  
  // Get verification case
  const db = getDb();
  const caseResult = db.exec('SELECT * FROM verification_cases WHERE id = ?', [content.verification_case_id]);
  if (caseResult.length === 0 || caseResult[0].values.length === 0) {
    return res.json(createNack(context, {
      code: ErrorCodes.ORDER_NOT_FOUND,
      message: `Verification case ${content.verification_case_id} not found`,
    }));
  }
  
  res.json(createAck(context));
  
  setTimeout(async () => {
    try {
      // Save proofs
      for (const proof of content.proofs) {
        const proofId = uuidv4();
        db.run(
          `INSERT INTO proofs (
            id, verification_case_id, type, payload_json, source,
            quantity_value, timestamp, raw_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            proofId,
            content.verification_case_id,
            proof.type,
            JSON.stringify(proof),
            proof.source,
            proof.value.quantity,
            proof.timestamp,
            JSON.stringify(proof),
          ]
        );
      }
      saveDb();
      
      // Calculate delivered quantity
      const deliveredQty = content.proofs.reduce((sum, p) => sum + p.value.quantity, 0);
      
      // Get tolerance rules
      const caseRow = caseResult[0].values[0];
      const toleranceRules = JSON.parse(caseRow[5] as string); // tolerance_rules_json
      const expectedQty = caseRow[7] as number; // expected_qty
      
      // Calculate deviation
      const deviationQty = expectedQty - deliveredQty;
      const deviationPercent = (Math.abs(deviationQty) / expectedQty) * 100;
      const withinTolerance = deviationPercent <= toleranceRules.max_deviation_percent;
      
      // Determine state
      const state = withinTolerance ? 'VERIFIED' : 'DEVIATED';
      
      // Update verification case
      db.run(
        `UPDATE verification_cases 
         SET delivered_qty = ?, deviation_qty = ?, deviation_percent = ?,
             state = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [deliveredQty, deviationQty, deviationPercent, state, content.verification_case_id]
      );
      saveDb();
      
      const callbackContext = createCallbackContext(context, 'on_proofs_submitted');
      const onProofsSubmittedMessage: OnProofsSubmittedMessage = {
        context: callbackContext,
        message: {
          verification_case: {
            id: content.verification_case_id,
            order_id: content.order_id,
            state,
            verification_window: JSON.parse(caseRow[6] as string), // window_json
            required_proofs: JSON.parse(caseRow[4] as string), // required_proofs_json
            expected_quantity: { value: expectedQty, unit: 'kWh' },
            delivered_quantity: { value: deliveredQty, unit: 'kWh' },
            deviation: {
              quantity: deviationQty,
              percent: deviationPercent,
            },
            expires_at: caseRow[9] as string, // expires_at
          },
          proofs_received: content.proofs,
        },
      };
      
      logEvent(context.transaction_id, callbackContext.message_id, 'on_proofs_submitted', 'OUTBOUND', JSON.stringify(onProofsSubmittedMessage));
      
      await axios.post(`${context.bap_uri}/callbacks/on_proofs_submitted`, onProofsSubmittedMessage);
      logger.info('on_proofs_submitted callback sent successfully', { transaction_id: context.transaction_id });
    } catch (error: any) {
      logger.error(`Failed to send on_proofs_submitted callback: ${error.message}`, { transaction_id: context.transaction_id });
    }
  }, config.callbackDelay);
});

/**
 * POST /accept_verification - Handle verification acceptance
 */
router.post('/accept_verification', async (req: Request, res: Response) => {
  const message = req.body as AcceptVerificationMessage;
  const { context, message: content } = message;
  
  logger.info('Received accept_verification request', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    verification_case_id: content.verification_case_id,
  });
  
  if (isDuplicateMessage(context.message_id)) {
    return res.json(createAck(context));
  }
  
  logEvent(context.transaction_id, context.message_id, 'accept_verification', 'INBOUND', JSON.stringify(message));
  
  res.json(createAck(context));
  
  setTimeout(async () => {
    try {
      // Update verification case
      const db = getDb();
      db.run(
        `UPDATE verification_cases 
         SET state = 'VERIFIED', decision = 'ACCEPTED', decided_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [content.verification_case_id]
      );
      saveDb();
      
      const callbackContext = createCallbackContext(context, 'on_verification_accepted');
      
      // Get verification case for callback
      const caseResult = db.exec('SELECT * FROM verification_cases WHERE id = ?', [content.verification_case_id]);
      const caseRow = caseResult[0].values[0];
      
      const onVerificationAcceptedMessage: OnVerificationAcceptedMessage = {
        context: callbackContext,
        message: {
          verification_case: {
            id: content.verification_case_id,
            order_id: content.order_id,
            state: 'VERIFIED',
            verification_window: JSON.parse(caseRow[6] as string),
            required_proofs: JSON.parse(caseRow[4] as string),
            expected_quantity: { value: caseRow[7] as number, unit: 'kWh' },
            delivered_quantity: caseRow[8] ? { value: caseRow[8] as number, unit: 'kWh' } : undefined,
            expires_at: caseRow[9] as string,
          },
        },
      };
      
      logEvent(context.transaction_id, callbackContext.message_id, 'on_verification_accepted', 'OUTBOUND', JSON.stringify(onVerificationAcceptedMessage));
      
      await axios.post(`${context.bap_uri}/callbacks/on_verification_accepted`, onVerificationAcceptedMessage);
      logger.info('on_verification_accepted callback sent successfully', { transaction_id: context.transaction_id });
    } catch (error: any) {
      logger.error(`Failed to send on_verification_accepted callback: ${error.message}`, { transaction_id: context.transaction_id });
    }
  }, config.callbackDelay);
});

/**
 * POST /reject_verification - Handle verification rejection
 */
router.post('/reject_verification', async (req: Request, res: Response) => {
  const message = req.body as RejectVerificationMessage;
  const { context, message: content } = message;
  
  logger.info('Received reject_verification request', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    verification_case_id: content.verification_case_id,
    reason: content.reason,
  });
  
  if (isDuplicateMessage(context.message_id)) {
    return res.json(createAck(context));
  }
  
  logEvent(context.transaction_id, context.message_id, 'reject_verification', 'INBOUND', JSON.stringify(message));
  
  res.json(createAck(context));
  
  setTimeout(async () => {
    try {
      // Update verification case
      const db = getDb();
      const state = content.reason?.toLowerCase().includes('dispute') ? 'DISPUTED' : 'REJECTED';
      db.run(
        `UPDATE verification_cases 
         SET state = ?, decision = 'REJECTED', rejection_reason = ?, decided_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [state, content.reason || 'Buyer rejected', content.verification_case_id]
      );
      saveDb();
      
      const callbackContext = createCallbackContext(context, 'on_verification_rejected');
      
      // Get verification case for callback
      const caseResult = db.exec('SELECT * FROM verification_cases WHERE id = ?', [content.verification_case_id]);
      const caseRow = caseResult[0].values[0];
      
      const onVerificationRejectedMessage: OnVerificationRejectedMessage = {
        context: callbackContext,
        message: {
          verification_case: {
            id: content.verification_case_id,
            order_id: content.order_id,
            state,
            verification_window: JSON.parse(caseRow[6] as string),
            required_proofs: JSON.parse(caseRow[4] as string),
            expected_quantity: { value: caseRow[7] as number, unit: 'kWh' },
            expires_at: caseRow[9] as string,
          },
        },
      };
      
      logEvent(context.transaction_id, callbackContext.message_id, 'on_verification_rejected', 'OUTBOUND', JSON.stringify(onVerificationRejectedMessage));
      
      await axios.post(`${context.bap_uri}/callbacks/on_verification_rejected`, onVerificationRejectedMessage);
      logger.info('on_verification_rejected callback sent successfully', { transaction_id: context.transaction_id });
    } catch (error: any) {
      logger.error(`Failed to send on_verification_rejected callback: ${error.message}`, { transaction_id: context.transaction_id });
    }
  }, config.callbackDelay);
});

/**
 * POST /settlement_start - Handle settlement start request
 */
router.post('/settlement_start', async (req: Request, res: Response) => {
  const message = req.body as SettlementStartMessage;
  const { context, message: content } = message;
  
  logger.info('Received settlement_start request', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    order_id: content.order_id,
    settlement_type: content.settlement_type,
  });
  
  if (isDuplicateMessage(context.message_id)) {
    return res.json(createAck(context));
  }
  
  logEvent(context.transaction_id, context.message_id, 'settlement_start', 'INBOUND', JSON.stringify(message));
  
  // Get order
  const order = getOrderById(content.order_id);
  if (!order) {
    return res.json(createNack(context, {
      code: ErrorCodes.ORDER_NOT_FOUND,
      message: `Order ${content.order_id} not found`,
    }));
  }
  
  // Get verification case
  const db = getDb();
  const caseResult = db.exec('SELECT * FROM verification_cases WHERE id = ?', [content.verification_case_id]);
  if (caseResult.length === 0 || caseResult[0].values.length === 0) {
    return res.json(createNack(context, {
      code: ErrorCodes.ORDER_NOT_FOUND,
      message: `Verification case ${content.verification_case_id} not found`,
    }));
  }
  
  res.json(createAck(context));
  
  setTimeout(async () => {
    try {
      const settlementId = uuidv4();
      const caseRow = caseResult[0].values[0];
      const deliveredQty = caseRow[8] as number || order.total_qty || 0;
      const pricePerUnit = order.total_price && order.total_qty ? order.total_price / order.total_qty : 0.10; // Default
      const currency = order.currency || 'USD';
      
      // Calculate settlement amount
      const baseAmount = deliveredQty * pricePerUnit;
      const deviationQty = caseRow[10] as number || 0;
      const deviationPercent = caseRow[11] as number || 0;
      
      // Simple penalty calculation (5% penalty if deviation > 5%)
      let penalty = 0;
      if (deviationPercent > 5.0) {
        penalty = baseAmount * 0.05;
      }
      
      const finalAmount = baseAmount - penalty;
      
      const breakdown = {
        base_amount: baseAmount,
        delivered_quantity: deliveredQty,
        price_per_unit: pricePerUnit,
        penalty: penalty > 0 ? penalty : undefined,
        deviation_adjustment: deviationQty !== 0 ? -deviationQty * pricePerUnit : undefined,
      };
      
      // Create settlement
      db.run(
        `INSERT INTO settlements (
          id, order_id, verification_case_id, transaction_id, settlement_type,
          state, amount_value, currency, period_json, breakdown_json, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          settlementId,
          content.order_id,
          content.verification_case_id,
          context.transaction_id,
          content.settlement_type,
          'INITIATED',
          finalAmount,
          currency,
          content.period ? JSON.stringify(content.period) : null,
          JSON.stringify(breakdown),
          JSON.stringify(message),
        ]
      );
      saveDb();
      
      const callbackContext = createCallbackContext(context, 'on_settlement_initiated');
      const onSettlementInitiatedMessage: OnSettlementInitiatedMessage = {
        context: callbackContext,
        message: {
          settlement: {
            id: settlementId,
            order_id: content.order_id,
            state: 'INITIATED',
            amount: { value: finalAmount, currency },
            period: content.period,
            breakdown,
            initiated_at: new Date().toISOString(),
          },
        },
      };
      
      logEvent(context.transaction_id, callbackContext.message_id, 'on_settlement_initiated', 'OUTBOUND', JSON.stringify(onSettlementInitiatedMessage));
      
      await axios.post(`${context.bap_uri}/callbacks/on_settlement_initiated`, onSettlementInitiatedMessage);
      logger.info('on_settlement_initiated callback sent successfully', { transaction_id: context.transaction_id });
      
      // Simulate settlement progression: INITIATED → PENDING → SETTLED
      setTimeout(async () => {
        try {
          // Update to PENDING
          db.run('UPDATE settlements SET state = ? WHERE id = ?', ['PENDING', settlementId]);
          saveDb();
          
          const pendingContext = createCallbackContext(callbackContext, 'on_settlement_pending');
          const onSettlementPendingMessage: OnSettlementPendingMessage = {
            context: pendingContext,
            message: {
              settlement: {
                id: settlementId,
                order_id: content.order_id,
                state: 'PENDING',
                amount: { value: finalAmount, currency },
                period: content.period,
                breakdown,
                initiated_at: onSettlementInitiatedMessage.message.settlement.initiated_at,
              },
            },
          };
          
          logEvent(context.transaction_id, pendingContext.message_id, 'on_settlement_pending', 'OUTBOUND', JSON.stringify(onSettlementPendingMessage));
          await axios.post(`${context.bap_uri}/callbacks/on_settlement_pending`, onSettlementPendingMessage);
          
          // After another delay, mark as SETTLED
          setTimeout(async () => {
            try {
              db.run(
                'UPDATE settlements SET state = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['SETTLED', settlementId]
              );
              saveDb();
              
              const settledContext = createCallbackContext(pendingContext, 'on_settlement_settled');
              const onSettlementSettledMessage: OnSettlementSettledMessage = {
                context: settledContext,
                message: {
                  settlement: {
                    id: settlementId,
                    order_id: content.order_id,
                    state: 'SETTLED',
                    amount: { value: finalAmount, currency },
                    period: content.period,
                    breakdown,
                    initiated_at: onSettlementInitiatedMessage.message.settlement.initiated_at,
                    completed_at: new Date().toISOString(),
                  },
                },
              };
              
              logEvent(context.transaction_id, settledContext.message_id, 'on_settlement_settled', 'OUTBOUND', JSON.stringify(onSettlementSettledMessage));
              await axios.post(`${context.bap_uri}/callbacks/on_settlement_settled`, onSettlementSettledMessage);
              logger.info('Settlement completed successfully', { transaction_id: context.transaction_id, settlementId });
            } catch (error: any) {
              logger.error(`Failed to send on_settlement_settled callback: ${error.message}`, { transaction_id: context.transaction_id });
            }
          }, config.callbackDelay * 2);
        } catch (error: any) {
          logger.error(`Failed to send on_settlement_pending callback: ${error.message}`, { transaction_id: context.transaction_id });
        }
      }, config.callbackDelay);
    } catch (error: any) {
      logger.error(`Failed to send on_settlement_initiated callback: ${error.message}`, { transaction_id: context.transaction_id });
    }
  }, config.callbackDelay);
});

export default router;
