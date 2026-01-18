/**
 * Seller (BPP) Routes - Select, Init, Confirm, Status + Seller Management APIs
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
  createAck,
  createNack,
  createCallbackContext,
  createLogger,
  config,
  ErrorCodes,
  OrderItem,
  Quote,
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
  updateBlocksOrderId,
} from './seller-catalog';
import { 
  getOrderByTransactionId, 
  getOrderById, 
  createOrder, 
  updateOrderStatus,
  updateOrderStatusByTransactionId,
  getOrdersByProviderId,
  getAllOrders,
} from './seller-orders';
import { logEvent, isDuplicateMessage } from './events';

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
  if (await isDuplicateMessage(context.message_id)) {
    logger.warn('Duplicate message detected, returning ACK', {
      transaction_id: context.transaction_id,
      message_id: context.message_id,
    });
    return res.json(createAck(context));
  }
  
  // Log inbound event
  await logEvent(context.transaction_id, context.message_id, 'select', 'INBOUND', JSON.stringify(message));
  
  // Validate offers and quantities
  const validationErrors: string[] = [];
  const orderItems: OrderItem[] = [];
  let totalPrice = 0;
  let totalQuantity = 0;
  let currency = 'USD';
  let providerId = '';
  
  for (const item of content.orderItems) {
    const offer = await getOfferById(item.offer_id);
    
    if (!offer) {
      validationErrors.push(`Offer ${item.offer_id} not found`);
      continue;
    }
    
    providerId = offer.provider_id;
    
    // Check available blocks instead of max quantity
    const availableBlocks = await getAvailableBlockCount(item.offer_id);
    if (item.quantity > availableBlocks) {
      validationErrors.push(`Requested quantity ${item.quantity} exceeds available blocks ${availableBlocks}`);
    }
    
    // Also check item-level availability as a safety check
    const availableQty = await getItemAvailableQuantity(item.item_id);
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
      const provider = await getProvider(providerId);
      
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
      
      await logEvent(context.transaction_id, callbackContext.message_id, 'on_select', 'OUTBOUND', JSON.stringify(onSelectMessage));
      
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
  
  if (await isDuplicateMessage(context.message_id)) {
    logger.warn('Duplicate message detected', { transaction_id: context.transaction_id });
    return res.json(createAck(context));
  }
  
  await logEvent(context.transaction_id, context.message_id, 'init', 'INBOUND', JSON.stringify(message));
  
  // Check if order already exists for this transaction
  const existingOrder = await getOrderByTransactionId(context.transaction_id);
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
        
        await logEvent(context.transaction_id, callbackContext.message_id, 'on_init', 'OUTBOUND', JSON.stringify(onInitMessage));
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
      
      // First pass: calculate prices and validate offers exist
      for (const item of content.order.items) {
        const offer = await getOfferById(item.offer_id);
        if (offer) {
          selectedOfferId = offer.id;
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
      }
      
      const quote: Quote = {
        price: { value: totalPrice, currency },
        totalQuantity,
      };
      
      // Create order first in DRAFT state (so we have a valid order ID for FK constraint)
      const order = await createOrder(context.transaction_id, providerId, selectedOfferId, orderItems, quote, 'DRAFT');
      
      // Now claim blocks using the real order ID
      for (const item of content.order.items) {
        const claimedBlocks = await claimBlocks(item.offer_id, item.quantity, order.id, context.transaction_id);
        
        if (claimedBlocks.length < item.quantity) {
          // Not enough blocks available - release any claimed blocks and fail
          await releaseBlocks(context.transaction_id);
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
            order_id: order.id,
            transaction_id: context.transaction_id,
          });
          logger.info(`Synced ${claimedBlocks.length} reserved blocks to CDS for offer ${item.offer_id}`);
        } catch (syncError: any) {
          logger.error(`Failed to sync reserved blocks to CDS: ${syncError.message}`);
        }
      }
      
      // Update order status to PENDING now that blocks are claimed
      const finalOrder = await updateOrderStatus(order.id, 'PENDING') || order;
      
      const callbackContext = createCallbackContext(context, 'on_init');
      const onInitMessage: OnInitMessage = {
        context: callbackContext,
        message: { order: finalOrder },
      };
      
      await logEvent(context.transaction_id, callbackContext.message_id, 'on_init', 'OUTBOUND', JSON.stringify(onInitMessage));
      
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
  
  if (await isDuplicateMessage(context.message_id)) {
    logger.warn('Duplicate message detected', { transaction_id: context.transaction_id });
    return res.json(createAck(context));
  }
  
  await logEvent(context.transaction_id, context.message_id, 'confirm', 'INBOUND', JSON.stringify(message));
  
  // Get existing order
  let order = await getOrderById(content.order.id) || await getOrderByTransactionId(context.transaction_id);
  
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
        order = await updateOrderStatus(order!.id, 'ACTIVE');
        logger.info('Order status updated to ACTIVE', { transaction_id: context.transaction_id, order_id: order!.id });
        
        // Mark reserved blocks as SOLD
        const soldBlocks = await getBlocksForOrder(order!.id);
        await markBlocksAsSold(order!.id);
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
            const currentQty = await getItemAvailableQuantity(orderItem.item_id);
            if (currentQty !== null) {
              const soldQty = orderItem.quantity; // This is the actual purchased quantity from blocks
              const newQty = Math.max(0, currentQty - soldQty);
              
              await updateItemQuantity(orderItem.item_id, newQty);
              logger.info(`Item ${orderItem.item_id} quantity reduced: ${currentQty} → ${newQty} kWh (sold: ${soldQty} kWh)`, {
                transaction_id: context.transaction_id,
              });
              
              // Sync updated quantity to CDS
              try {
                // Get provider_id from the order item (not from Order which doesn't have it)
                const providerId = orderItem.provider_id || '';
                const items = await getProviderItems(providerId);
                const item = items.find(i => i.id === orderItem.item_id);
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
      
      await logEvent(context.transaction_id, callbackContext.message_id, 'on_confirm', 'OUTBOUND', JSON.stringify(onConfirmMessage));
      
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
  
  if (await isDuplicateMessage(context.message_id)) {
    return res.json(createAck(context));
  }
  
  await logEvent(context.transaction_id, context.message_id, 'status', 'INBOUND', JSON.stringify(message));
  
  // Get order
  const order = await getOrderById(content.order_id) || await getOrderByTransactionId(context.transaction_id);
  
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
      
      await logEvent(context.transaction_id, callbackContext.message_id, 'on_status', 'OUTBOUND', JSON.stringify(onStatusMessage));
      
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
  
  const provider = await registerProvider(name);
  logger.info(`New provider registered: ${provider.id} (${name})`);
  
  // Sync to CDS
  await syncProviderToCDS(provider);
  
  res.json({ status: 'ok', provider });
});

/**
 * GET /seller/providers - List all providers
 */
router.get('/seller/providers', async (req: Request, res: Response) => {
  const providers = await getAllProviders();
  res.json({ providers });
});

/**
 * GET /seller/providers/:id - Get provider details
 */
router.get('/seller/providers/:id', async (req: Request, res: Response) => {
  const provider = await getProvider(req.params.id);
  
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  
  const items = await getProviderItems(req.params.id);
  const offers = await getProviderOffers(req.params.id);
  
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
  
  const provider = await getProvider(provider_id);
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  
  const item = await addCatalogItem(
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
router.get('/seller/items', async (req: Request, res: Response) => {
  const { provider_id } = req.query;
  
  const items = provider_id 
    ? await getProviderItems(provider_id as string)
    : await getAllItems();
  
  res.json({ items });
});

/**
 * PUT /seller/items/:id/quantity - Update item quantity
 */
router.put('/seller/items/:id/quantity', async (req: Request, res: Response) => {
  const { quantity } = req.body;
  
  if (quantity === undefined || quantity < 0) {
    return res.status(400).json({ error: 'Valid quantity is required' });
  }
  
  await updateItemQuantity(req.params.id, quantity);
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
  
  const offer = await addOffer(
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
router.get('/seller/offers', async (req: Request, res: Response) => {
  const { provider_id } = req.query;
  
  const offers = provider_id 
    ? await getProviderOffers(provider_id as string)
    : await getAllOffers();
  
  res.json({ offers });
});

/**
 * DELETE /seller/offers/:id - Delete an offer
 */
router.delete('/seller/offers/:id', async (req: Request, res: Response) => {
  await deleteOffer(req.params.id);
  logger.info(`Offer ${req.params.id} deleted`);
  
  // Sync deletion to CDS
  await deleteOfferFromCDS(req.params.id);
  
  res.json({ status: 'ok', deleted: req.params.id });
});

/**
 * GET /seller/orders - Get orders for a provider
 */
router.get('/seller/orders', async (req: Request, res: Response) => {
  const { provider_id } = req.query;
  
  const orders = provider_id 
    ? await getOrdersByProviderId(provider_id as string)
    : await getAllOrders();
  
  // Enrich orders with block information
  const enrichedOrders = await Promise.all(orders.map(async (order) => {
    try {
      if (order.items && order.items.length > 0) {
        const firstItem = order.items[0];
        const itemId = firstItem.item_id;
        const offerId = firstItem.offer_id;
        
        // Get actual purchased quantity from blocks (not from offer max)
        const orderBlocks = await getBlocksForOrder(order.id);
        const actualSoldQty = orderBlocks.length; // Each block = 1 unit
        
        // Get item-level available quantity
        const availableQty = await getItemAvailableQuantity(itemId);
        
        // Get offer block stats
        const blockStats = await getBlockStats(offerId);
        
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
  }));
  
  res.json({ orders: enrichedOrders });
});

export default router;
