/**
 * CDS Mock Routes
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  DiscoverMessage,
  OnDiscoverMessage,
  createAck,
  createCallbackContext,
  createLogger,
  config,
  TimeWindow,
} from '@p2p/shared';
import { getCatalog, syncProvider, syncItem, syncOffer, deleteOffer, updateBlockStatus } from './catalog';
import { filterCatalog, parseFilterExpression } from './filter';
import { logEvent, isDuplicateMessage } from './events';

const router = Router();
const logger = createLogger('CDS');

/**
 * POST /discover - Handle catalog discovery requests
 */
router.post('/discover', async (req: Request, res: Response) => {
  const message = req.body as DiscoverMessage;
  const { context, message: content } = message;
  
  logger.info('Received discover request', {
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
  await logEvent(
    context.transaction_id,
    context.message_id,
    'discover',
    'INBOUND',
    JSON.stringify(message)
  );
  
  // Send ACK immediately
  res.json(createAck(context));
  
  // Process asynchronously and send callback
  setTimeout(async () => {
    try {
      // Get full catalog
      let catalog = await getCatalog();
      
      // Apply filters if provided
      if (content.filters?.expression) {
        const criteria = parseFilterExpression(content.filters.expression);
        const requestedTimeWindow = content.intent?.fulfillment?.time;
        catalog = filterCatalog(catalog, criteria, requestedTimeWindow);
      } else if (content.intent) {
        // Filter by intent if no JSONPath expression
        // Note: deliveryMode is always 'SCHEDULED' for P2P energy trading
        const criteria = {
          sourceType: content.intent.item?.itemAttributes?.sourceType,
          minQuantity: content.intent.item?.itemAttributes?.availableQuantity || 
                       content.intent.quantity?.value,
        };
        const requestedTimeWindow = content.intent.fulfillment?.time;
        catalog = filterCatalog(catalog, criteria, requestedTimeWindow);
      }
      
      // Create callback context
      const callbackContext = createCallbackContext(context, 'on_discover');
      
      // Build on_discover message
      const onDiscoverMessage: OnDiscoverMessage = {
        context: callbackContext,
        message: { catalog },
      };
      
      // Log outbound event
      await logEvent(
        context.transaction_id,
        callbackContext.message_id,
        'on_discover',
        'OUTBOUND',
        JSON.stringify(onDiscoverMessage)
      );
      
      // Send callback to BAP
      const callbackUrl = `${context.bap_uri}/callbacks/on_discover`;
      logger.info(`Sending on_discover callback to ${callbackUrl}`, {
        transaction_id: context.transaction_id,
        message_id: callbackContext.message_id,
        action: 'on_discover',
      });
      
      await axios.post(callbackUrl, onDiscoverMessage);
      
      logger.info('on_discover callback sent successfully', {
        transaction_id: context.transaction_id,
        action: 'on_discover',
      });
    } catch (error: any) {
      logger.error(`Failed to send on_discover callback: ${error.message}`, {
        transaction_id: context.transaction_id,
        action: 'on_discover',
      });
    }
  }, config.callbackDelay);
});

// ==================== SYNC APIs (for BPP integration) ====================

/**
 * POST /sync/provider - Sync a provider from BPP
 */
router.post('/sync/provider', async (req: Request, res: Response) => {
  const { id, name, trust_score } = req.body;
  
  if (!id || !name) {
    return res.status(400).json({ error: 'id and name are required' });
  }
  
  await syncProvider({ id, name, trust_score });
  logger.info(`Synced provider: ${id} (${name})`);
  
  res.json({ status: 'ok', synced: 'provider', id });
});

/**
 * POST /sync/item - Sync a catalog item from BPP
 */
router.post('/sync/item', async (req: Request, res: Response) => {
  const item = req.body;
  
  if (!item.id || !item.provider_id) {
    return res.status(400).json({ error: 'id and provider_id are required' });
  }
  
  await syncItem(item);
  logger.info(`Synced item: ${item.id}`);
  
  res.json({ status: 'ok', synced: 'item', id: item.id });
});

/**
 * POST /sync/offer - Sync an offer from BPP
 */
router.post('/sync/offer', async (req: Request, res: Response) => {
  const offer = req.body;
  
  if (!offer.id || !offer.item_id || !offer.provider_id) {
    return res.status(400).json({ error: 'id, item_id, and provider_id are required' });
  }
  
  await syncOffer(offer);
  logger.info(`Synced offer: ${offer.id}`);
  
  res.json({ status: 'ok', synced: 'offer', id: offer.id });
});

/**
 * DELETE /sync/offer/:id - Delete an offer
 */
router.delete('/sync/offer/:id', async (req: Request, res: Response) => {
  await deleteOffer(req.params.id);
  logger.info(`Deleted offer: ${req.params.id}`);
  
  res.json({ status: 'ok', deleted: 'offer', id: req.params.id });
});

/**
 * POST /sync/blocks - Update block status (when blocks are sold/reserved)
 */
router.post('/sync/blocks', async (req: Request, res: Response) => {
  const { offer_id, block_ids, status, order_id, transaction_id } = req.body;
  
  if (!offer_id || !block_ids || !status) {
    return res.status(400).json({ error: 'offer_id, block_ids, and status are required' });
  }
  
  await updateBlockStatus(offer_id, block_ids, status, order_id, transaction_id);
  logger.info(`Updated ${block_ids.length} blocks for offer ${offer_id} to status ${status}`);
  
  res.json({ status: 'ok', synced: 'blocks', count: block_ids.length });
});

/**
 * GET /catalog - Get current catalog (for debugging)
 */
router.get('/catalog', async (req: Request, res: Response) => {
  const catalog = await getCatalog();
  res.json({ catalog });
});

export default router;
