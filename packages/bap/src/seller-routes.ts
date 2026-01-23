/**
 * Seller (BPP) Routes - Select, Init, Confirm, Status + Seller Management APIs
 * With concurrency-safe operations using distributed locks
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
  withOrderLock,
  withTransactionLock,
  InsufficientBlocksError,
  createIdempotencyMiddleware,
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
  claimBlocksStrict,
  markBlocksAsSold,
  releaseBlocks,
  releaseBlocksByOrderId,
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
import { authMiddleware } from './middleware/auth';
import { prisma } from './db';
import { getTransaction } from './state';

const router = Router();
const logger = createLogger('BPP');

/**
 * Helper: Get buyer ID from transaction state
 */
async function getBuyerIdFromTransaction(transactionId: string): Promise<string | null> {
  try {
    const txState = await getTransaction(transactionId);
    return txState?.buyerId || null;
  } catch {
    return null;
  }
}

/**
 * Helper: Get seller user ID from provider ID
 */
async function getSellerIdFromProvider(providerId: string): Promise<string | null> {
  if (!providerId) return null;
  try {
    const user = await prisma.user.findFirst({
      where: { providerId },
      select: { id: true },
    });
    return user?.id || null;
  } catch {
    return null;
  }
}

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
  let currency = 'INR';
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

    // Get source_type from item
    const catalogItem = await prisma.catalogItem.findUnique({
      where: { id: item.item_id },
      select: { sourceType: true },
    });

    orderItems.push({
      item_id: item.item_id,
      offer_id: item.offer_id,
      provider_id: offer.provider_id,
      quantity: item.quantity,
      price: { value: itemPrice, currency },
      timeWindow: offer.timeWindow,
      source_type: catalogItem?.sourceType || 'UNKNOWN',
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
      // Get buyer ID from transaction state
      const { getTransactionState } = await import('@p2p/shared');
      const txState = await getTransactionState(context.transaction_id);
      const buyerId = txState?.buyerId || null;

      // Check buyer trust score - block if below 20%
      if (buyerId) {
        const buyer = await prisma.user.findUnique({
          where: { id: buyerId },
          select: { trustScore: true },
        });
        
        if (buyer && buyer.trustScore < 0.2) {
          logger.error(`Buyer trust score too low: ${(buyer.trustScore * 100).toFixed(1)}%`, {
            transaction_id: context.transaction_id,
            buyerId,
          });

          const errorCallbackContext = createCallbackContext(context, 'on_init');
          const errorCallback = {
            context: errorCallbackContext,
            error: {
              code: 'TRUST_SCORE_TOO_LOW',
              message: `Your trust score (${(buyer.trustScore * 100).toFixed(0)}%) is below the minimum required (20%). Please maintain a good order history to increase your score.`,
            },
          };

          try {
            await axios.post(`${context.bap_uri}/callbacks/on_init`, errorCallback);
          } catch (e) {
            logger.error('Failed to send trust error callback');
          }

          return; // Exit the setTimeout callback
        }
      }

      // Build order items and quote
      const orderItems: OrderItem[] = [];
      let totalPrice = 0;
      let totalQuantity = 0;
      let currency = 'INR';
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

          // Get source_type from catalog item
          const catalogItem = await prisma.catalogItem.findUnique({
            where: { id: item.item_id },
            select: { sourceType: true },
          });

          orderItems.push({
            item_id: item.item_id,
            offer_id: item.offer_id,
            provider_id: offer.provider_id,
            quantity: item.quantity,
            price: { value: itemPrice, currency },
            timeWindow: offer.timeWindow,
            source_type: catalogItem?.sourceType || 'UNKNOWN',
          });
        }
      }

      const quote: Quote = {
        price: { value: totalPrice, currency },
        totalQuantity,
      };

      // Create order first in DRAFT state (so we have a valid order ID for FK constraint)
      const order = await createOrder(context.transaction_id, providerId, selectedOfferId, orderItems, quote, 'DRAFT', buyerId);

      // Now claim blocks using the real order ID
      for (const item of content.order.items) {
        const claimedBlocks = await claimBlocks(item.offer_id, item.quantity, order.id, context.transaction_id);

        if (claimedBlocks.length < item.quantity) {
          // Not enough blocks available - release any claimed blocks and send error callback
          await releaseBlocks(context.transaction_id);
          const errorMsg = claimedBlocks.length === 0
            ? 'This offer is sold out. Please try a different offer.'
            : `Only ${claimedBlocks.length} kWh available, but you requested ${item.quantity} kWh.`;

          logger.error(`Not enough blocks available: requested ${item.quantity}, got ${claimedBlocks.length}`, {
            transaction_id: context.transaction_id,
            offer_id: item.offer_id,
          });

          // Send error callback
          const errorCallbackContext = createCallbackContext(context, 'on_init');
          const errorCallback = {
            context: errorCallbackContext,
            error: {
              code: 'INSUFFICIENT_INVENTORY',
              message: errorMsg,
            },
          };

          try {
            await axios.post(`${context.bap_uri}/callbacks/on_init`, errorCallback);
          } catch (e) {
            logger.error('Failed to send error callback');
          }

          return; // Exit the setTimeout callback
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
 * CONCURRENCY SAFE: Uses distributed lock on order to prevent double-confirmation
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
      // Use distributed lock to prevent concurrent confirmations
      await withOrderLock(order!.id, async () => {
        // Re-fetch order inside lock to get current status
        const currentOrder = await getOrderById(order!.id);

        // Idempotent confirm: only update if not already ACTIVE
        if (currentOrder && currentOrder.status !== 'ACTIVE') {
          order = await updateOrderStatus(order!.id, 'ACTIVE');
          logger.info('Order status updated to ACTIVE', { transaction_id: context.transaction_id, order_id: order!.id });

          // Mark reserved blocks as SOLD (also uses lock internally)
          const soldCount = await markBlocksAsSold(order!.id);
          const soldBlocks = await getBlocksForOrder(order!.id);
          logger.info(`Marked ${soldCount} blocks as SOLD for order ${order!.id}`, { transaction_id: context.transaction_id });

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

            // NOTE: We no longer auto-delete offers when fully sold
            // This ensures "total offered" tracking remains accurate for trade limit calculations
            // Sold-out offers are hidden from discovery (CDS filters by available > 0)
            const offerStats = await getBlockStats(firstItem.offer_id);
            if (offerStats.available === 0) {
              logger.info(
                `Offer ${firstItem.offer_id} is now sold out (${offerStats.sold} blocks sold)`,
                { transaction_id: context.transaction_id }
              );
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
          // ESCROW: Deduct payment from buyer (funds held until delivery verification)
          try {
            const orderTotal = order!.quote?.price?.value || 0;
            const platformFeeRate = 0.025; // 2.5% platform fee
            const platformFee = Math.round(orderTotal * platformFeeRate * 100) / 100;
            const totalDeduction = orderTotal + platformFee; // Total to deduct from buyer
            const buyerId = await getBuyerIdFromTransaction(context.transaction_id);
            
            if (buyerId && orderTotal > 0) {
              await prisma.$transaction(async (tx) => {
                // 1. Deduct from buyer's balance (energy cost + platform fee)
                await tx.user.update({
                  where: { id: buyerId },
                  data: { balance: { decrement: totalDeduction } },
                });
                
                // 2. Update order payment status to ESCROWED
                await tx.order.update({
                  where: { id: order!.id },
                  data: {
                    paymentStatus: 'ESCROWED',
                    escrowedAt: new Date(),
                    totalPrice: orderTotal, // Store energy cost
                  },
                });
                
                // 3. Create payment record
                const sellerId = await getSellerIdFromProvider(order!.items?.[0]?.provider_id || '');
                await tx.paymentRecord.create({
                  data: {
                    type: 'ESCROW',
                    orderId: order!.id,
                    buyerId,
                    sellerId,
                    totalAmount: totalDeduction,
                    platformFee: platformFee,
                    status: 'COMPLETED',
                    completedAt: new Date(),
                  },
                });
              });
              
              logger.info(`Payment escrowed for order ${order!.id}`, {
                energyCost: orderTotal,
                platformFee: platformFee,
                totalDeducted: totalDeduction,
                buyerId,
                transaction_id: context.transaction_id,
              });
            }
          } catch (escrowError: any) {
            logger.error(`Failed to escrow payment: ${escrowError.message}`, { transaction_id: context.transaction_id });
            // Don't fail the order confirmation if escrow fails - can be handled manually
          }
        } else {
          logger.info('Order already ACTIVE, idempotent confirm', { transaction_id: context.transaction_id });
        }
      }); // End withOrderLock

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

/**
 * POST /cancel - Cancel an order (buyer initiated)
 * Cancellation is only allowed within the configured window after order confirmation
 */
router.post('/cancel', async (req: Request, res: Response) => {
  const { context, message: content } = req.body as {
    context: any;
    message: { order_id: string; reason?: string }
  };

  logger.info('Received cancel request', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    order_id: content.order_id,
  });

  if (await isDuplicateMessage(context.message_id)) {
    return res.json(createAck(context));
  }

  await logEvent(context.transaction_id, context.message_id, 'cancel', 'INBOUND', JSON.stringify(req.body));

  // Get order
  const order = await getOrderById(content.order_id) || await getOrderByTransactionId(context.transaction_id);

  if (!order) {
    return res.json(createNack(context, {
      code: ErrorCodes.ORDER_NOT_FOUND,
      message: 'Order not found',
    }));
  }

  // Check if order is in a cancellable state
  if (order.status !== 'ACTIVE' && order.status !== 'PENDING') {
    return res.json(createNack(context, {
      code: 'CANCEL_NOT_ALLOWED',
      message: `Order in status ${order.status} cannot be cancelled`,
    }));
  }

  // Check cancellation window
  const cancelWindowMinutes = parseInt(process.env.CANCEL_WINDOW_MINUTES || '30');
  const cancelWindowMs = cancelWindowMinutes * 60 * 1000;
  const orderAge = Date.now() - new Date(order.created_at).getTime();

  if (orderAge > cancelWindowMs) {
    return res.json(createNack(context, {
      code: 'CANCEL_WINDOW_EXPIRED',
      message: `Cancellation window (${cancelWindowMinutes} minutes) has expired. Order cannot be cancelled.`,
    }));
  }

  res.json(createAck(context));

  setTimeout(async () => {
    try {
      // Use distributed lock for cancellation
      await withOrderLock(order.id, async () => {
        // Re-check order status inside lock
        const currentOrder = await getOrderById(order.id);
        if (!currentOrder || currentOrder.status === 'CANCELLED') {
          return;
        }

        // 1. Update order status to CANCELLED
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelledBy: 'BUYER',
            cancelReason: content.reason,
          },
        });

        logger.info(`Order ${order.id} cancelled by buyer`, {
          transaction_id: context.transaction_id,
          reason: content.reason,
        });

        // 2. Release reserved blocks back to AVAILABLE
        const releasedCount = await releaseBlocksByOrderId(order.id);
        logger.info(`Released ${releasedCount} blocks for cancelled order ${order.id}`);

        // 3. Sync block status to CDS - mark blocks as AVAILABLE again
        if (order.items && order.items.length > 0) {
          const blocks = await getBlocksForOrder(order.id);
          for (const item of order.items) {
            try {
              await axios.post(`${config.urls.cds}/sync/blocks`, {
                offer_id: item.offer_id,
                block_ids: blocks.filter(b => b.offer_id === item.offer_id).map(b => b.id),
                status: 'AVAILABLE',
                order_id: null,
                transaction_id: null,
              });
              logger.info(`Synced released blocks to CDS for offer ${item.offer_id}`);
            } catch (syncError: any) {
              logger.error(`Failed to sync block release to CDS: ${syncError.message}`);
            }
          }
        }

        // 4. Update buyer trust (proportional to cancelled quantity)
        // Get buyerId from database (not in Order type)
        const dbOrder = await prisma.order.findUnique({ where: { id: order.id }, select: { buyerId: true } });
        const buyerId = dbOrder?.buyerId;
        if (buyerId) {
          const { updateTrustAfterCancel } = await import('@p2p/shared');
          const buyer = await prisma.user.findUnique({ where: { id: buyerId } });

          if (buyer) {
            const cancelledQty = order.quote?.totalQuantity || 0;
            const { newScore, newLimit, trustImpact } = updateTrustAfterCancel(
              buyer.trustScore,
              cancelledQty,
              cancelledQty, // Using same value as this is full order cancel
              true // within window
            );

            await prisma.user.update({
              where: { id: buyerId },
              data: {
                trustScore: newScore,
                allowedTradeLimit: newLimit,
              },
            });

            await prisma.trustScoreHistory.create({
              data: {
                userId: buyerId,
                previousScore: buyer.trustScore,
                newScore,
                previousLimit: buyer.allowedTradeLimit,
                newLimit,
                reason: 'BUYER_CANCEL',
                orderId: order.id,
                metadata: JSON.stringify({
                  cancelledQty,
                  trustImpact,
                  cancelReason: content.reason,
                }),
              },
            });

            logger.info(`Buyer trust updated after cancellation`, {
              buyerId,
              previousScore: buyer.trustScore.toFixed(3),
              newScore: newScore.toFixed(3),
              trustImpact: trustImpact.toFixed(3),
            });
          }
        }
      });

      // 5. Send on_cancel callback
      const callbackContext = createCallbackContext(context, 'on_cancel');
      const updatedOrder = await getOrderById(order.id);

      const onCancelMessage = {
        context: callbackContext,
        message: {
          order: updatedOrder || { ...order, status: 'CANCELLED' },
          cancellation: {
            cancelled_by: 'BUYER',
            reason: content.reason,
            refund_status: 'NONE', // No payment processing in current phase
          },
        },
      };

      await logEvent(context.transaction_id, callbackContext.message_id, 'on_cancel', 'OUTBOUND', JSON.stringify(onCancelMessage));

      const callbackUrl = `${context.bap_uri}/callbacks/on_cancel`;
      logger.info(`Sending on_cancel callback to ${callbackUrl}`, {
        transaction_id: context.transaction_id,
        action: 'on_cancel',
      });

      await axios.post(callbackUrl, onCancelMessage);
      logger.info('on_cancel callback sent successfully', { transaction_id: context.transaction_id });
    } catch (error: any) {
      logger.error(`Failed to process cancel: ${error.message}`, { transaction_id: context.transaction_id });
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

// ==================== SELLER APIs (Authenticated) ====================

/**
 * GET /seller/my-profile - Get or create the authenticated user's seller profile
 * Auto-creates provider if user doesn't have one
 */
router.get('/seller/my-profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    let providerId = req.user!.providerId;
    let provider;

    // If user doesn't have a provider, create one
    if (!providerId) {
      const providerName = req.user!.name || req.user!.email?.split('@')[0] || 'My Energy';
      provider = await registerProvider(providerName);
      providerId = provider.id;

      // Link provider to user
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { providerId: provider.id },
      });

      logger.info(`Auto-created provider ${provider.id} for user ${req.user!.id}`);

      // Sync to CDS
      await syncProviderToCDS(provider);
    } else {
      provider = await getProvider(providerId);
    }

    if (!provider) {
      return res.status(500).json({ success: false, error: 'Failed to get provider' });
    }

    const items = await getProviderItems(providerId);
    const offers = await getProviderOffers(providerId);

    // Create a map of item_id to source_type for quick lookup
    const itemSourceMap = new Map(items.map(item => [item.id, item.source_type]));

    // Add block stats and source_type to offers
    const offersWithStats = await Promise.all(offers.map(async (offer) => {
      const blockStats = await getBlockStats(offer.id);
      const source_type = itemSourceMap.get(offer.item_id) || 'SOLAR';
      return { ...offer, blockStats, source_type };
    }));

    res.json({
      success: true,
      provider,
      items,
      offers: offersWithStats
    });
  } catch (error: any) {
    logger.error('Failed to get seller profile:', error);
    res.status(500).json({ success: false, error: 'Failed to load seller profile' });
  }
});

/**
 * GET /seller/my-orders - Get orders for the authenticated user's provider
 */
router.get('/seller/my-orders', authMiddleware, async (req: Request, res: Response) => {
  try {
    const providerId = req.user!.providerId;

    if (!providerId) {
      return res.json({ orders: [] });
    }

    const orders = await getOrdersByProviderId(providerId);

    // Enrich orders with block and item information
    const enrichedOrders = await Promise.all(orders.map(async (order) => {
      try {
        // Get DISCOM feedback for this order
        const discomFeedback = await prisma.discomFeedback.findUnique({
          where: { orderId: order.id },
        });

        if (order.items && order.items.length > 0) {
          const firstItem = order.items[0];
          const orderBlocks = await getBlocksForOrder(order.id);
          const actualSoldQty = orderBlocks.length;
          const blockStats = await getBlockStats(firstItem.offer_id);

          // Fetch item and offer details
          const item = await prisma.catalogItem.findUnique({
            where: { id: firstItem.item_id },
          });
          const offer = await prisma.catalogOffer.findUnique({
            where: { id: firstItem.offer_id },
          });

          // Get price from blocks if offer is deleted, or from offer if it
          // exists Blocks store the price at time of purchase, so this works
          // even if offer is deleted
          const totalQty = order.quote?.totalQuantity || 0;
          const pricePerKwh = offer?.priceValue ||
            (orderBlocks.length > 0 ? orderBlocks[0].price_value : 0) ||
            (order.quote?.price?.value && totalQty ?
              order.quote.price.value / totalQty :
              0);

          // Get delivery time from offer
          const deliveryTime = offer?.timeWindowStart ? {
            start: offer.timeWindowStart.toISOString(),
            end: offer.timeWindowEnd?.toISOString(),
          } : undefined;

          // Get cancellation compensation for seller (5% of total)
          const cancellationCompensation = order.status === 'CANCELLED' && order.cancelPenalty
            ? order.cancelPenalty * 0.5 // 5% of 10% penalty goes to seller
            : null;

          return {
            ...order,
            paymentStatus: order.paymentStatus || 'PENDING',
            itemInfo: {
              item_id: firstItem.item_id,
              offer_id: firstItem.offer_id,
              sold_quantity: actualSoldQty,
              block_stats: blockStats,
              source_type: item?.sourceType || 'UNKNOWN',
              price_per_kwh: pricePerKwh,
            },
            deliveryTime,
            // Cancellation info for seller
            cancellation: order.status === 'CANCELLED' ? {
              cancelledAt: order.cancelledAt,
              compensation: cancellationCompensation,
            } : undefined,
            // DISCOM verification results
            fulfillment: discomFeedback ? {
              verified: true,
              deliveredQty: discomFeedback.deliveredQty,
              expectedQty: discomFeedback.expectedQty,
              deliveryRatio: discomFeedback.deliveryRatio,
              status: discomFeedback.status, // 'FULL' | 'PARTIAL' | 'FAILED'
              trustImpact: discomFeedback.trustImpact,
              verifiedAt: discomFeedback.verifiedAt.toISOString(),
            } : null,
          };
        }

        // Return order with just DISCOM feedback if no items
        return {
          ...order,
          paymentStatus: order.paymentStatus || 'PENDING',
          fulfillment: discomFeedback ? {
            verified: true,
            deliveredQty: discomFeedback.deliveredQty,
            expectedQty: discomFeedback.expectedQty,
            deliveryRatio: discomFeedback.deliveryRatio,
            status: discomFeedback.status,
            trustImpact: discomFeedback.trustImpact,
            verifiedAt: discomFeedback.verifiedAt.toISOString(),
          } : null,
        };
      } catch (error: any) {
        logger.error(`Error enriching order ${order.id}: ${error.message}`);
      }
      return order;
    }));

    res.json({ orders: enrichedOrders });
  } catch (error: any) {
    logger.error('Failed to get seller orders:', error);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

// ==================== Legacy SELLER APIs (for backward compatibility) ====================

/**
 * POST /seller/register - Register as a new provider (legacy)
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
 * GET /seller/providers - List all providers (legacy - now returns empty for privacy)
 */
router.get('/seller/providers', async (req: Request, res: Response) => {
  // Don't expose all providers for privacy
  res.json({ providers: [] });
});

/**
 * GET /seller/providers/:id - Get provider details (legacy)
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
 * Uses authenticated user's provider
 */
router.post('/seller/items', authMiddleware, async (req: Request, res: Response) => {
  const {
    source_type,
    delivery_mode,
    available_qty,
    production_windows,
    meter_id
  } = req.body;

  // Use authenticated user's provider
  const provider_id = req.user!.providerId;

  if (!provider_id) {
    return res.status(400).json({ error: 'No seller profile found. Please set up your seller profile first.' });
  }

  if (!source_type || !available_qty) {
    return res.status(400).json({ error: 'source_type and available_qty are required' });
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
 * Uses authenticated user's provider
 */
router.post('/seller/offers', authMiddleware, async (req: Request, res: Response) => {
  const {
    item_id,
    price_per_kwh,
    currency,
    max_qty,
    time_window
  } = req.body;

  // Use authenticated user's provider
  const provider_id = req.user!.providerId;

  if (!provider_id) {
    return res.status(400).json({ error: 'No seller profile found. Please set up your seller profile first.' });
  }

  if (!item_id || !price_per_kwh || !max_qty || !time_window) {
    return res.status(400).json({
      error: 'item_id, price_per_kwh, max_qty, and time_window are required'
    });
  }

  // Verify the item belongs to this provider
  const items = await getProviderItems(provider_id);
  const itemExists = items.some(i => i.id === item_id);
  if (!itemExists) {
    return res.status(403).json({ error: 'Item does not belong to your seller profile' });
  }

  const offer = await addOffer(
    item_id,
    provider_id,
    price_per_kwh,
    currency || 'INR',
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
 * POST /seller/offers/direct - Create an offer directly (auto-creates item)
 * Simplified flow for prosumers - no need to create a listing first
 */
router.post('/seller/offers/direct', authMiddleware, async (req: Request, res: Response) => {
  const {
    source_type,
    price_per_kwh,
    currency,
    max_qty,
    time_window
  } = req.body;

  // Use authenticated user's provider
  const provider_id = req.user!.providerId;

  if (!provider_id) {
    return res.status(400).json({ error: 'No seller profile found. Please set up your seller profile first.' });
  }

  // Check if user has set production capacity
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { productionCapacity: true, allowedTradeLimit: true },
  });

  if (!user?.productionCapacity || user.productionCapacity <= 0) {
    return res.status(400).json({ 
      error: 'Please set your production capacity in Profile before creating offers.' 
    });
  }

  // Calculate trade limit
  const tradeLimit = (user.productionCapacity * (user.allowedTradeLimit ?? 10)) / 100;

  // Get total offered quantity across all offers
  // Trade limit = how much you can OFFER in total (not what's available or delivered)
  // If you created offers for 100 + 30 = 130 kWh, you've offered 130 kWh
  const existingOffers = await prisma.catalogOffer.findMany({
    where: { providerId: provider_id },
    include: {
      _count: {
        select: { blocks: true }, // Count all blocks (total offer amount)
      },
    },
  });

  const totalOfferedQty = existingOffers.reduce((sum, offer) => {
    return sum + offer._count.blocks;
  }, 0);

  const remainingCapacity = tradeLimit - totalOfferedQty;

  // Check if new offer quantity exceeds remaining capacity
  if (max_qty > remainingCapacity) {
    return res.status(400).json({
      error: `Offer quantity (${max_qty} kWh) exceeds your remaining capacity (${remainingCapacity.toFixed(1)} kWh). You have ${totalOfferedQty.toFixed(1)} kWh already offered out of ${tradeLimit.toFixed(1)} kWh limit.`
    });
  }

  if (!source_type || !price_per_kwh || !max_qty || !time_window) {
    return res.status(400).json({
      error: 'source_type, price_per_kwh, max_qty, and time_window are required'
    });
  }

  // Auto-create an item for this offer
  const item = await addCatalogItem(
    provider_id,
    source_type.toUpperCase() as any,
    'SCHEDULED',
    max_qty,
    [], // No production windows needed
    '' // No meter ID needed
  );

  logger.info(`Auto-created item ${item.id} for direct offer`);

  // Create the offer
  const offer = await addOffer(
    item.id,
    provider_id,
    price_per_kwh,
    currency || 'INR',
    max_qty,
    time_window
  );

  logger.info(`New direct offer created: ${offer.id}`);

  // Sync item to CDS
  await syncItemToCDS(item);

  // Sync offer to CDS
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

  // Add source_type to the response
  res.json({
    status: 'ok',
    offer: {
      ...offer,
      source_type: source_type.toUpperCase(),
    }
  });
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
 * Only allows deleting own offers
 */
router.delete('/seller/offers/:id', authMiddleware, async (req: Request, res: Response) => {
  const provider_id = req.user!.providerId;

  if (!provider_id) {
    return res.status(403).json({ error: 'No seller profile found' });
  }

  // Verify offer belongs to user's provider
  const offer = await getOfferById(req.params.id);
  if (!offer) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  if (offer.provider_id !== provider_id) {
    return res.status(403).json({ error: 'You can only delete your own offers' });
  }

  await deleteOffer(req.params.id);
  logger.info(`Offer ${req.params.id} deleted by provider ${provider_id}`);

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
