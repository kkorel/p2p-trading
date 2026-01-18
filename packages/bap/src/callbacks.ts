/**
 * BAP Callback Endpoints - Receives async responses from CDS/BPP
 */

import {CatalogOffer, config, createLogger, MatchingCriteria, matchOffers, OnConfirmMessage, OnDiscoverMessage, OnInitMessage, OnProofsSubmittedMessage, OnSelectMessage, OnSettlementFailedMessage, OnSettlementInitiatedMessage, OnSettlementPendingMessage, OnSettlementSettledMessage, OnStatusMessage, OnVerificationAcceptedMessage, OnVerificationRejectedMessage, OnVerificationStartMessage, Provider,} from '@p2p/shared';
import {Request, Response, Router} from 'express';

import {isDuplicateMessage, logEvent} from './events';
import {updateSettlementState} from './settlement';
import {createTransaction, getTransaction, updateTransaction} from './state';
import {calculateDeliveredQuantity, calculateDeviation, determineVerificationState, getVerificationCaseById, updateVerificationCaseState, updateVerificationCaseWithProofs,} from './verification';

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
  
  // Extract providers and offers for matching
  const providers = new Map<string, Provider>();
  const allOffers: CatalogOffer[] = [];
  
  for (const providerCatalog of content.catalog.providers) {
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
  
  // Update transaction state
  let txState = await getTransaction(context.transaction_id);
  if (!txState) {
    txState = await createTransaction(context.transaction_id);
  }
  
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
    catalog: content.catalog,
    providers,
    matchingResults,
    status: 'SELECTING',
  });
  
  const itemCount = content.catalog.providers.reduce((sum, p) => sum + p.items.length, 0);
  const offerCount = allOffers.length;
  
  logger.info(`Catalog received: ${content.catalog.providers.length} providers, ${itemCount} items, ${offerCount} offers`, {
    transaction_id: context.transaction_id,
  });
  
  res.json({ 
    status: 'ok', 
    providers: content.catalog.providers.length, 
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
  const message = req.body as OnInitMessage;
  const { context, message: content } = message;
  
  logger.info('Received on_init callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });
  
  if (await isDuplicateMessage(context.message_id)) {
    return res.json({ status: 'ok', message: 'duplicate ignored' });
  }
  
  await logEvent(context.transaction_id, context.message_id, 'on_init', 'INBOUND', JSON.stringify(message));
  
  await updateTransaction(context.transaction_id, {
    order: content.order,
    status: 'CONFIRMING',
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

// ============ PHASE-3: VERIFICATION & SETTLEMENT CALLBACKS ============

/**
 * POST /callbacks/on_verification_start - Receive verification case from BPP
 */
router.post('/on_verification_start', async (req: Request, res: Response) => {
  const message = req.body as OnVerificationStartMessage;
  const {context, message: content} = message;

  logger.info('Received on_verification_start callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
  });

  if (await isDuplicateMessage(context.message_id)) {
    logger.warn(
        'Duplicate on_verification_start callback ignored',
        {message_id: context.message_id});
    return res.json({status: 'ok', message: 'duplicate ignored'});
  }

  await logEvent(
      context.transaction_id, context.message_id, 'on_verification_start',
      'INBOUND', JSON.stringify(message));

  res.json({status: 'ok'});
});

/**
 * POST /callbacks/on_proofs_submitted - Receive proof submission result
 */
router.post('/on_proofs_submitted', async (req: Request, res: Response) => {
  const message = req.body as OnProofsSubmittedMessage;
  const {context, message: content} = message;

  logger.info('Received on_proofs_submitted callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    verification_case_id: content.verification_case.id,
    state: content.verification_case.state,
  });

  if (await isDuplicateMessage(context.message_id)) {
    logger.warn(
        'Duplicate on_proofs_submitted callback ignored',
        {message_id: context.message_id});
    return res.json({status: 'ok', message: 'duplicate ignored'});
  }

  await logEvent(
      context.transaction_id, context.message_id, 'on_proofs_submitted',
      'INBOUND', JSON.stringify(message));

  res.json({status: 'ok'});
});

/**
 * POST /callbacks/on_verification_accepted - Receive verification acceptance
 * confirmation
 */
router.post(
    '/on_verification_accepted', async (req: Request, res: Response) => {
      const message = req.body as OnVerificationAcceptedMessage;
      const {context, message: content} = message;

      logger.info('Received on_verification_accepted callback', {
        transaction_id: context.transaction_id,
        message_id: context.message_id,
        verification_case_id: content.verification_case.id,
        state: content.verification_case.state,
      });

      if (await isDuplicateMessage(context.message_id)) {
        logger.warn(
            'Duplicate on_verification_accepted callback ignored',
            {message_id: context.message_id});
        return res.json({status: 'ok', message: 'duplicate ignored'});
      }

      await logEvent(
          context.transaction_id, context.message_id,
          'on_verification_accepted', 'INBOUND', JSON.stringify(message));

      res.json({status: 'ok'});
    });

/**
 * POST /callbacks/on_verification_rejected - Receive verification rejection
 * confirmation
 */
router.post(
    '/on_verification_rejected', async (req: Request, res: Response) => {
      const message = req.body as OnVerificationRejectedMessage;
      const {context, message: content} = message;

      logger.info('Received on_verification_rejected callback', {
        transaction_id: context.transaction_id,
        message_id: context.message_id,
        verification_case_id: content.verification_case.id,
        state: content.verification_case.state,
      });

      if (await isDuplicateMessage(context.message_id)) {
        logger.warn(
            'Duplicate on_verification_rejected callback ignored',
            {message_id: context.message_id});
        return res.json({status: 'ok', message: 'duplicate ignored'});
      }

      await logEvent(
          context.transaction_id, context.message_id,
          'on_verification_rejected', 'INBOUND', JSON.stringify(message));

      res.json({status: 'ok'});
    });

/**
 * POST /callbacks/on_settlement_initiated - Receive settlement initiation
 * confirmation
 */
router.post('/on_settlement_initiated', async (req: Request, res: Response) => {
  const message = req.body as OnSettlementInitiatedMessage;
  const {context, message: content} = message;

  logger.info('Received on_settlement_initiated callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    settlement_id: content.settlement.id,
    state: content.settlement.state,
    amount: content.settlement.amount.value,
  });

  if (await isDuplicateMessage(context.message_id)) {
    logger.warn(
        'Duplicate on_settlement_initiated callback ignored',
        {message_id: context.message_id});
    return res.json({status: 'ok', message: 'duplicate ignored'});
  }

  await logEvent(
      context.transaction_id, context.message_id, 'on_settlement_initiated',
      'INBOUND', JSON.stringify(message));

  res.json({status: 'ok'});
});

/**
 * POST /callbacks/on_settlement_pending - Receive settlement pending update
 */
router.post('/on_settlement_pending', async (req: Request, res: Response) => {
  const message = req.body as OnSettlementPendingMessage;
  const {context, message: content} = message;

  logger.info('Received on_settlement_pending callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    settlement_id: content.settlement.id,
    state: content.settlement.state,
  });

  if (await isDuplicateMessage(context.message_id)) {
    logger.warn(
        'Duplicate on_settlement_pending callback ignored',
        {message_id: context.message_id});
    return res.json({status: 'ok', message: 'duplicate ignored'});
  }

  await logEvent(
      context.transaction_id, context.message_id, 'on_settlement_pending',
      'INBOUND', JSON.stringify(message));

  res.json({status: 'ok'});
});

/**
 * POST /callbacks/on_settlement_settled - Receive settlement completion
 */
router.post('/on_settlement_settled', async (req: Request, res: Response) => {
  const message = req.body as OnSettlementSettledMessage;
  const {context, message: content} = message;

  logger.info('Received on_settlement_settled callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    settlement_id: content.settlement.id,
    state: content.settlement.state,
    amount: content.settlement.amount.value,
  });

  if (await isDuplicateMessage(context.message_id)) {
    logger.warn(
        'Duplicate on_settlement_settled callback ignored',
        {message_id: context.message_id});
    return res.json({status: 'ok', message: 'duplicate ignored'});
  }

  await logEvent(
      context.transaction_id, context.message_id, 'on_settlement_settled',
      'INBOUND', JSON.stringify(message));

  res.json({status: 'ok'});
});

/**
 * POST /callbacks/on_settlement_failed - Receive settlement failure
 */
router.post('/on_settlement_failed', async (req: Request, res: Response) => {
  const message = req.body as OnSettlementFailedMessage;
  const {context, message: content} = message;

  logger.info('Received on_settlement_failed callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    settlement_id: content.settlement.id,
    state: content.settlement.state,
    error: content.error,
  });

  if (await isDuplicateMessage(context.message_id)) {
    logger.warn(
        'Duplicate on_settlement_failed callback ignored',
        {message_id: context.message_id});
    return res.json({status: 'ok', message: 'duplicate ignored'});
  }

  await logEvent(
      context.transaction_id, context.message_id, 'on_settlement_failed',
      'INBOUND', JSON.stringify(message));

  res.json({status: 'ok'});
});

export default router;
