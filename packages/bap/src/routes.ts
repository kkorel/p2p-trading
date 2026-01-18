/**
 * BAP Routes - Consumer-side APIs for initiating flows
 */

import {AcceptVerificationMessage, CatalogOffer, config, ConfirmMessage, createContext, createLogger, DeliveryMode, DiscoverMessage, InitMessage, MatchingCriteria, matchOffers, Provider, RejectVerificationMessage, SelectMessage, SettlementStartMessage, SourceType, StatusMessage, SubmitProofsMessage, TimeWindow, VerificationStartMessage,} from '@p2p/shared';
import axios from 'axios';
import {Request, Response, Router} from 'express';
import {v4 as uuidv4} from 'uuid';

import {prisma} from './db';
import {logEvent} from './events';
import {getOrderById, getOrderProviderId} from './seller-orders';
import {calculateSettlementAmount, createSettlement, getSettlementByOrderId,} from './settlement';
import {clearAllTransactions, createTransaction, getAllTransactions, getTransaction, updateTransaction} from './state';
import {calculateDeliveredQuantity, calculateDeviation, createVerificationCase, determineVerificationState, getProofsByVerificationCaseId, getVerificationCaseById, getVerificationCaseByOrderId, saveProof,} from './verification';

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

// ============ PHASE-3: VERIFICATION & SETTLEMENT ============

/**
 * POST /phase3/orders/:orderId/verification/start - Start verification for an
 * ACTIVE order
 */
router.post(
    '/phase3/orders/:orderId/verification/start',
    async (req: Request, res: Response) => {
      try {
        const {orderId} = req.params;
        const {
          verification_window,
          required_proofs,
          expected_quantity,
          tolerance_rules,
          transaction_id
        } = req.body as {
          verification_window: TimeWindow;
          required_proofs: any[];
          expected_quantity: {value: number; unit: string};
          tolerance_rules:
              {max_deviation_percent: number; min_quantity?: number};
          transaction_id?: string;
        };

        // Get order to verify it exists and is ACTIVE
        const order = await getOrderById(orderId);
        if (!order) {
          return res.status(404).json({error: 'Order not found'});
        }

        if (order.status !== 'ACTIVE') {
          return res.status(400).json({
            error:
                `Order must be ACTIVE to start verification. Current status: ${
                    order.status}`
          });
        }

        const txnId = transaction_id || order.transaction_id;

        // Check if verification case already exists (idempotency)
        const existingCase = await getVerificationCaseByOrderId(orderId);
        if (existingCase) {
          logger.info(
              'Verification case already exists',
              {orderId, caseId: existingCase.id});
          return res.json({
            status: 'ok',
            verification_case_id: existingCase.id,
            message: 'Verification case already exists',
          });
        }

        // Calculate expiration (default: 24 hours from now, or use deadline
        // from required_proofs)
        let expiresAt = new Date();
        if (required_proofs && required_proofs.length > 0) {
          const latestDeadline =
              required_proofs.map(p => new Date(p.deadline))
                  .reduce(
                      (latest, current) => current > latest ? current : latest,
                      expiresAt);
          expiresAt = latestDeadline;
        } else {
          expiresAt.setHours(expiresAt.getHours() + 24);
        }

        // Get provider_id from database
        const providerId = await getOrderProviderId(orderId) ||
            order.items[0]?.provider_id || config.bpp.id;

        // Create context
        const context = createContext({
          action: 'verification_start',
          transaction_id: txnId,
          bap_id: config.bap.id,
          bap_uri: config.bap.uri,
          bpp_id: providerId,
          bpp_uri: config.bpp.uri,
        });

        // Build verification_start message
        const verificationStartMessage: VerificationStartMessage = {
          context,
          message: {
            order_id: orderId,
            verification_window,
            required_proofs,
            expected_quantity,
            tolerance_rules,
          },
        };

        logger.info('Sending verification_start request', {
          transaction_id: txnId,
          message_id: context.message_id,
          order_id: orderId,
        });

        await logEvent(
            txnId, context.message_id, 'verification_start', 'OUTBOUND',
            JSON.stringify(verificationStartMessage));

        try {
          const response = await axios.post(
              `${config.urls.bpp}/verification_start`,
              verificationStartMessage);

          res.json({
            status: 'ok',
            transaction_id: txnId,
            message_id: context.message_id,
            order_id: orderId,
            ack: response.data,
          });
        } catch (error: any) {
          logger.error(
              `Verification start request failed: ${error.message}`,
              {transaction_id: txnId, orderId});
          res.status(500).json({error: error.message});
        }
      } catch (error: any) {
        logger.error('Error in verification start', {error: error.message});
        res.status(500).json({error: error.message});
      }
    });

/**
 * POST /phase3/orders/:orderId/proofs - Submit proof artifacts
 */
router.post(
    '/phase3/orders/:orderId/proofs', async (req: Request, res: Response) => {
      try {
        const {orderId} = req.params;
        const {verification_case_id, proofs, transaction_id} = req.body as {
          verification_case_id?: string;
          proofs: any[];
          transaction_id?: string;
        };

        // Get order
        const order = await getOrderById(orderId);
        if (!order) {
          return res.status(404).json({error: 'Order not found'});
        }

        // Get verification case
        const verificationCase = verification_case_id ?
            await getVerificationCaseById(verification_case_id) :
            await getVerificationCaseByOrderId(orderId);

        if (!verificationCase) {
          return res.status(404).json({
            error: 'Verification case not found. Start verification first.'
          });
        }

        const txnId = transaction_id || order.transaction_id;
        const providerId = await getOrderProviderId(orderId) ||
            order.items[0]?.provider_id || config.bpp.id;

        // Create context
        const context = createContext({
          action: 'submit_proofs',
          transaction_id: txnId,
          bap_id: config.bap.id,
          bap_uri: config.bap.uri,
          bpp_id: providerId,
          bpp_uri: config.bpp.uri,
        });

        // Build submit_proofs message
        const submitProofsMessage: SubmitProofsMessage = {
          context,
          message: {
            order_id: orderId,
            verification_case_id: verificationCase.id,
            proofs,
          },
        };

        logger.info('Sending submit_proofs request', {
          transaction_id: txnId,
          message_id: context.message_id,
          verification_case_id: verificationCase.id,
          proof_count: proofs.length,
        });

        await logEvent(
            txnId, context.message_id, 'submit_proofs', 'OUTBOUND',
            JSON.stringify(submitProofsMessage));

        try {
          const response = await axios.post(
              `${config.urls.bpp}/submit_proofs`, submitProofsMessage);

          res.json({
            status: 'ok',
            transaction_id: txnId,
            message_id: context.message_id,
            verification_case_id: verificationCase.id,
            ack: response.data,
          });
        } catch (error: any) {
          logger.error(
              `Submit proofs request failed: ${error.message}`,
              {transaction_id: txnId, orderId});
          res.status(500).json({error: error.message});
        }
      } catch (error: any) {
        logger.error('Error in submit proofs', {error: error.message});
        res.status(500).json({error: error.message});
      }
    });

/**
 * POST /phase3/orders/:orderId/verification/accept - Buyer accepts verification
 * result
 */
router.post(
    '/phase3/orders/:orderId/verification/accept',
    async (req: Request, res: Response) => {
      try {
        const {orderId} = req.params;
        const {verification_case_id, transaction_id} = req.body as {
          verification_case_id?: string;
          transaction_id?: string;
        };

        // Get order
        const order = await getOrderById(orderId);
        if (!order) {
          return res.status(404).json({error: 'Order not found'});
        }

        // Get verification case
        const verificationCase = verification_case_id ?
            await getVerificationCaseByOrderId(orderId) :
            await getVerificationCaseByOrderId(orderId);

        if (!verificationCase) {
          return res.status(404).json({error: 'Verification case not found'});
        }

        const txnId = transaction_id || order.transaction_id;
        const providerId = await getOrderProviderId(orderId) ||
            order.items[0]?.provider_id || config.bpp.id;

        // Create context
        const context = createContext({
          action: 'accept_verification',
          transaction_id: txnId,
          bap_id: config.bap.id,
          bap_uri: config.bap.uri,
          bpp_id: providerId,
          bpp_uri: config.bpp.uri,
        });

        // Build accept_verification message
        const acceptVerificationMessage: AcceptVerificationMessage = {
          context,
          message: {
            order_id: orderId,
            verification_case_id: verificationCase.id,
          },
        };

        logger.info('Sending accept_verification request', {
          transaction_id: txnId,
          message_id: context.message_id,
          verification_case_id: verificationCase.id,
        });

        await logEvent(
            txnId, context.message_id, 'accept_verification', 'OUTBOUND',
            JSON.stringify(acceptVerificationMessage));

        try {
          const response = await axios.post(
              `${config.urls.bpp}/accept_verification`,
              acceptVerificationMessage);

          res.json({
            status: 'ok',
            transaction_id: txnId,
            message_id: context.message_id,
            verification_case_id: verificationCase.id,
            ack: response.data,
          });
        } catch (error: any) {
          logger.error(
              `Accept verification request failed: ${error.message}`,
              {transaction_id: txnId, orderId});
          res.status(500).json({error: error.message});
        }
      } catch (error: any) {
        logger.error('Error in accept verification', {error: error.message});
        res.status(500).json({error: error.message});
      }
    });

/**
 * POST /phase3/orders/:orderId/verification/reject - Buyer rejects verification
 */
router.post(
    '/phase3/orders/:orderId/verification/reject',
    async (req: Request, res: Response) => {
      try {
        const {orderId} = req.params;
        const {verification_case_id, reason, transaction_id} = req.body as {
          verification_case_id?: string;
          reason?: string;
          transaction_id?: string;
        };

        // Get order
        const order = await getOrderById(orderId);
        if (!order) {
          return res.status(404).json({error: 'Order not found'});
        }

        // Get verification case
        const verificationCase = verification_case_id ?
            await getVerificationCaseByOrderId(orderId) :
            await getVerificationCaseByOrderId(orderId);

        if (!verificationCase) {
          return res.status(404).json({error: 'Verification case not found'});
        }

        const txnId = transaction_id || order.transaction_id;
        const providerId = await getOrderProviderId(orderId) ||
            order.items[0]?.provider_id || config.bpp.id;

        // Create context
        const context = createContext({
          action: 'reject_verification',
          transaction_id: txnId,
          bap_id: config.bap.id,
          bap_uri: config.bap.uri,
          bpp_id: providerId,
          bpp_uri: config.bpp.uri,
        });

        // Build reject_verification message
        const rejectVerificationMessage: RejectVerificationMessage = {
          context,
          message: {
            order_id: orderId,
            verification_case_id: verificationCase.id,
            reason,
          },
        };

        logger.info('Sending reject_verification request', {
          transaction_id: txnId,
          message_id: context.message_id,
          verification_case_id: verificationCase.id,
          reason,
        });

        await logEvent(
            txnId, context.message_id, 'reject_verification', 'OUTBOUND',
            JSON.stringify(rejectVerificationMessage));

        try {
          const response = await axios.post(
              `${config.urls.bpp}/reject_verification`,
              rejectVerificationMessage);

          res.json({
            status: 'ok',
            transaction_id: txnId,
            message_id: context.message_id,
            verification_case_id: verificationCase.id,
            ack: response.data,
          });
        } catch (error: any) {
          logger.error(
              `Reject verification request failed: ${error.message}`,
              {transaction_id: txnId, orderId});
          res.status(500).json({error: error.message});
        }
      } catch (error: any) {
        logger.error('Error in reject verification', {error: error.message});
        res.status(500).json({error: error.message});
      }
    });

/**
 * POST /phase3/orders/:orderId/settlement/start - Initiate settlement after
 * verification success
 */
router.post(
    '/phase3/orders/:orderId/settlement/start',
    async (req: Request, res: Response) => {
      try {
        const {orderId} = req.params;
        const {verification_case_id, settlement_type, period, transaction_id} =
            req.body as {
          verification_case_id?: string;
          settlement_type?: 'DAILY'|'PERIODIC'|'IMMEDIATE';
          period?: TimeWindow;
          transaction_id?: string;
        };

        // Get order
        const order = await getOrderById(orderId);
        if (!order) {
          return res.status(404).json({error: 'Order not found'});
        }

        // Get verification case
        const verificationCase = verification_case_id ?
            await getVerificationCaseByOrderId(orderId) :
            await getVerificationCaseByOrderId(orderId);

        if (!verificationCase) {
          return res.status(404).json({
            error: 'Verification case not found. Complete verification first.'
          });
        }

        if (verificationCase.state !== 'VERIFIED' &&
            verificationCase.state !== 'DEVIATED') {
          return res.status(400).json({
            error:
                `Verification must be VERIFIED or DEVIATED to start settlement. Current state: ${
                    verificationCase.state}`
          });
        }

        // Check if settlement already exists (idempotency)
        const existingSettlement = await getSettlementByOrderId(orderId);
        if (existingSettlement) {
          logger.info(
              'Settlement already exists',
              {orderId, settlementId: existingSettlement.id});
          return res.json({
            status: 'ok',
            settlement_id: existingSettlement.id,
            message: 'Settlement already exists',
          });
        }

        const txnId = transaction_id || order.transaction_id;
        const stlType = settlement_type || 'DAILY';
        const providerId = await getOrderProviderId(orderId) ||
            order.items[0]?.provider_id || config.bpp.id;

        // Create context
        const context = createContext({
          action: 'settlement_start',
          transaction_id: txnId,
          bap_id: config.bap.id,
          bap_uri: config.bap.uri,
          bpp_id: providerId,
          bpp_uri: config.bpp.uri,
        });

        // Build settlement_start message
        const settlementStartMessage: SettlementStartMessage = {
          context,
          message: {
            order_id: orderId,
            verification_case_id: verificationCase.id,
            settlement_type: stlType,
            period: period || undefined,
          },
        };

        logger.info('Sending settlement_start request', {
          transaction_id: txnId,
          message_id: context.message_id,
          order_id: orderId,
          settlement_type: stlType,
        });

        await logEvent(
            txnId, context.message_id, 'settlement_start', 'OUTBOUND',
            JSON.stringify(settlementStartMessage));

        try {
          const response = await axios.post(
              `${config.urls.bpp}/settlement_start`, settlementStartMessage);

          res.json({
            status: 'ok',
            transaction_id: txnId,
            message_id: context.message_id,
            order_id: orderId,
            settlement_type: stlType,
            ack: response.data,
          });
        } catch (error: any) {
          logger.error(
              `Settlement start request failed: ${error.message}`,
              {transaction_id: txnId, orderId});
          res.status(500).json({error: error.message});
        }
      } catch (error: any) {
        logger.error('Error in settlement start', {error: error.message});
        res.status(500).json({error: error.message});
      }
    });

/**
 * GET /phase3/orders/:orderId - Get current verification + settlement state
 */
router.get('/phase3/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const {orderId} = req.params;

    // Get order
    const order = await getOrderById(orderId);
    if (!order) {
      return res.status(404).json({error: 'Order not found'});
    }

    // Get verification case (may not exist yet)
    let verificationCase = null;
    let proofs: any[] = [];
    try {
      verificationCase = await getVerificationCaseByOrderId(orderId);
      if (verificationCase) {
        proofs = await getProofsByVerificationCaseId(verificationCase.id);
      }
    } catch (error: any) {
      logger.warn(
          'Error getting verification case:', {orderId, error: error?.message});
    }

    // Get settlement (may not exist yet)
    let settlement = null;
    try {
      settlement = await getSettlementByOrderId(orderId);
    } catch (error: any) {
      logger.warn(
          'Error getting settlement:', {orderId, error: error?.message});
    }

    // Determine verification decision from state
    let verificationDecision = null;
    if (verificationCase) {
      if (verificationCase.state === 'VERIFIED') {
        verificationDecision = 'VERIFIED';
      } else if (verificationCase.state === 'DEVIATED') {
        verificationDecision = 'DEVIATED';
      } else if (verificationCase.decision === 'ACCEPTED') {
        verificationDecision = 'VERIFIED';
      } else if (verificationCase.decision === 'REJECTED') {
        verificationDecision = 'DISPUTED';
      }
    }

    res.json({
      order_id: orderId,
      order_status: order.status,
      verification_case: verificationCase ? {
        id: verificationCase.id,
        state: verificationCase.state,
        decision: verificationDecision,
        expected_qty: verificationCase.expectedQty,
        delivered_qty_value: verificationCase.deliveredQty,
        delivered_qty_unit: 'kWh',
        deviation_qty: verificationCase.deviationQty,
        deviation_percent: verificationCase.deviationPercent,
        proofs: proofs.map(p => ({
                             id: p.id,
                             type: p.type,
                             source: p.source,
                             quantity_value: p.quantityValue,
                             timestamp: p.timestamp,
                           })),
      } :
                                            null,
      settlement: settlement ? {
        id: settlement.id,
        state: settlement.state,
        amount_value: settlement.amountValue,
        currency: settlement.currency,
        period: settlement.periodJson ? JSON.parse(settlement.periodJson) :
                                        null,
        breakdown: settlement.breakdownJson ?
            JSON.parse(settlement.breakdownJson) :
            null,
      } :
                               null,
    });
  } catch (error: any) {
    logger.error(
        'Error in GET /phase3/orders/:orderId',
        {error: error?.message, stack: error?.stack});
    res.status(500).json(
        {error: 'Internal server error', message: error?.message});
  }
});

/**
 * GET /phase3/orders/:orderId/events - Inspect all protocol events for an order
 */
router.get(
    '/phase3/orders/:orderId/events', async (req: Request, res: Response) => {
      try {
        const {orderId} = req.params;

        // Get order
        const order = await getOrderById(orderId);
        if (!order) {
          return res.status(404).json({error: 'Order not found'});
        }

        // Get events by transaction_id
        const events = await prisma.event.findMany({
          where: {transactionId: order.transaction_id},
          orderBy: {createdAt: 'desc'},
        });

        res.json({
          order_id: orderId,
          transaction_id: order.transaction_id,
          events: events.map(e => ({
                               id: e.id,
                               message_id: e.messageId,
                               action: e.action,
                               direction: e.direction,
                               created_at: e.createdAt,
                             })),
        });
      } catch (error: any) {
        logger.error(
            'Error in GET /phase3/orders/:orderId/events',
            {error: error?.message});
        res.status(500).json({error: error.message});
      }
    });

export default router;
