/**
 * BAP Callback Endpoints - Receives async responses from CDS/BPP
 */

import {CatalogOffer, config, createLogger, MatchingCriteria, matchOffers, OnConfirmMessage, OnDiscoverMessage, OnInitMessage, OnProofsSubmittedMessage, OnSelectMessage, OnSettlementFailedMessage, OnSettlementInitiatedMessage, OnSettlementPendingMessage, OnSettlementSettledMessage, OnStatusMessage, OnVerificationAcceptedMessage, OnVerificationRejectedMessage, OnVerificationStartMessage, Provider,} from '@p2p/shared';
import {Request, Response, Router} from 'express';

import {isDuplicateMessage, logEvent} from './events';
import {updateSettlementState,} from './settlement';
import {createTransaction, getTransaction, updateTransaction} from './state';
import {calculateDeliveredQuantity, calculateDeviation, determineVerificationState, getVerificationCaseById, saveProof, updateVerificationCaseState, updateVerificationCaseWithProofs,} from './verification';

const router = Router();
const logger = createLogger('BAP');

/**
 * POST /callbacks/on_discover - Receive catalog from CDS
 */
router.post('/on_discover', (req: Request, res: Response) => {
  const message = req.body as OnDiscoverMessage;
  const { context, message: content } = message;
  
  logger.info('Received on_discover callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });
  
  // Check for duplicate
  if (isDuplicateMessage(context.message_id)) {
    logger.warn('Duplicate on_discover callback ignored', { message_id: context.message_id });
    return res.json({ status: 'ok', message: 'duplicate ignored' });
  }
  
  // Log event
  logEvent(context.transaction_id, context.message_id, 'on_discover', 'INBOUND', JSON.stringify(message));
  
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
  let txState = getTransaction(context.transaction_id);
  if (!txState) {
    txState = createTransaction(context.transaction_id);
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
  
  updateTransaction(context.transaction_id, {
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
router.post('/on_select', (req: Request, res: Response) => {
  const message = req.body as OnSelectMessage;
  const { context, message: content } = message;
  
  logger.info('Received on_select callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });
  
  if (isDuplicateMessage(context.message_id)) {
    return res.json({ status: 'ok', message: 'duplicate ignored' });
  }
  
  logEvent(context.transaction_id, context.message_id, 'on_select', 'INBOUND', JSON.stringify(message));
  
  updateTransaction(context.transaction_id, {
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
router.post('/on_init', (req: Request, res: Response) => {
  const message = req.body as OnInitMessage;
  const { context, message: content } = message;
  
  logger.info('Received on_init callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });
  
  if (isDuplicateMessage(context.message_id)) {
    return res.json({ status: 'ok', message: 'duplicate ignored' });
  }
  
  logEvent(context.transaction_id, context.message_id, 'on_init', 'INBOUND', JSON.stringify(message));
  
  updateTransaction(context.transaction_id, {
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
router.post('/on_confirm', (req: Request, res: Response) => {
  const message = req.body as OnConfirmMessage;
  const { context, message: content } = message;
  
  logger.info('Received on_confirm callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });
  
  if (isDuplicateMessage(context.message_id)) {
    return res.json({ status: 'ok', message: 'duplicate ignored' });
  }
  
  logEvent(context.transaction_id, context.message_id, 'on_confirm', 'INBOUND', JSON.stringify(message));
  
  updateTransaction(context.transaction_id, {
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
router.post('/on_status', (req: Request, res: Response) => {
  const message = req.body as OnStatusMessage;
  const { context, message: content } = message;
  
  logger.info('Received on_status callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });
  
  if (isDuplicateMessage(context.message_id)) {
    return res.json({ status: 'ok', message: 'duplicate ignored' });
  }
  
  logEvent(context.transaction_id, context.message_id, 'on_status', 'INBOUND', JSON.stringify(message));
  
  updateTransaction(context.transaction_id, {
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

// ============ PHASE-3: VERIFICATION CALLBACKS ============

/**
 * POST /callbacks/on_verification_start - Receive verification case from BPP
 */
router.post('/on_verification_start', (req: Request, res: Response) => {
  const message = req.body as OnVerificationStartMessage;
  const {context, message: content} = message;

  logger.info('Received on_verification_start callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });

  if (isDuplicateMessage(context.message_id)) {
    return res.json({status: 'ok', message: 'duplicate ignored'});
  }

  logEvent(
      context.transaction_id, context.message_id, 'on_verification_start',
      'INBOUND', JSON.stringify(message));

  // Verification case is already created by BPP, we just acknowledge
  logger.info(
      `Verification case created: ${content.verification_case.id}, state: ${
          content.verification_case.state}`,
      {
        transaction_id: context.transaction_id,
      });

  res.json({
    status: 'ok',
    verification_case_id: content.verification_case.id,
    state: content.verification_case.state,
  });
});

/**
 * POST /callbacks/on_proofs_submitted - Receive proof submission result from
 * BPP
 */
router.post('/on_proofs_submitted', (req: Request, res: Response) => {
  const message = req.body as OnProofsSubmittedMessage;
  const {context, message: content} = message;

  logger.info('Received on_proofs_submitted callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });

  if (isDuplicateMessage(context.message_id)) {
    return res.json({status: 'ok', message: 'duplicate ignored'});
  }

  logEvent(
      context.transaction_id, context.message_id, 'on_proofs_submitted',
      'INBOUND', JSON.stringify(message));

  // Process proofs and calculate deviation
  const verificationCase = content.verification_case;
  const deliveredQty = verificationCase.delivered_quantity?.value || 0;
  const expectedQty = verificationCase.expected_quantity.value;

  // Get tolerance rules from database
  const dbCase = getVerificationCaseById(verificationCase.id);
  const toleranceRules = dbCase ? JSON.parse(dbCase.tolerance_rules_json) :
                                  {max_deviation_percent: 5.0};

  // Calculate deviation
  const deviation =
      calculateDeviation(expectedQty, deliveredQty, toleranceRules);

  // Determine state
  const state = determineVerificationState(deviation, true);

  // Update verification case
  updateVerificationCaseWithProofs(
      verificationCase.id, deliveredQty, deviation, state);

  logger.info(
      `Proofs processed: delivered=${deliveredQty}, expected=${
          expectedQty}, deviation=${
          deviation.deviation_percent.toFixed(2)}%, state=${state}`,
      {
        transaction_id: context.transaction_id,
      });

  res.json({
    status: 'ok',
    verification_case_id: verificationCase.id,
    state,
    delivered_quantity: deliveredQty,
    deviation: deviation.deviation_percent,
  });
});

/**
 * POST /callbacks/on_verification_accepted - Receive verification acceptance
 * from BPP
 */
router.post('/on_verification_accepted', (req: Request, res: Response) => {
  const message = req.body as OnVerificationAcceptedMessage;
  const {context, message: content} = message;

  logger.info('Received on_verification_accepted callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });

  if (isDuplicateMessage(context.message_id)) {
    return res.json({status: 'ok', message: 'duplicate ignored'});
  }

  logEvent(
      context.transaction_id, context.message_id, 'on_verification_accepted',
      'INBOUND', JSON.stringify(message));

  // Update verification case state
  updateVerificationCaseState(
      content.verification_case.id, 'VERIFIED', 'ACCEPTED');

  logger.info(`Verification accepted: ${content.verification_case.id}`, {
    transaction_id: context.transaction_id,
  });

  res.json({
    status: 'ok',
    verification_case_id: content.verification_case.id,
    state: 'VERIFIED',
  });
});

/**
 * POST /callbacks/on_verification_rejected - Receive verification rejection
 * from BPP
 */
router.post('/on_verification_rejected', (req: Request, res: Response) => {
  const message = req.body as OnVerificationRejectedMessage;
  const {context, message: content} = message;

  logger.info('Received on_verification_rejected callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });

  if (isDuplicateMessage(context.message_id)) {
    return res.json({status: 'ok', message: 'duplicate ignored'});
  }

  logEvent(
      context.transaction_id, context.message_id, 'on_verification_rejected',
      'INBOUND', JSON.stringify(message));

  // Update verification case state
  const state =
      content.verification_case.state === 'DISPUTED' ? 'DISPUTED' : 'REJECTED';
  updateVerificationCaseState(content.verification_case.id, state, 'REJECTED');

  logger.info(
      `Verification rejected: ${content.verification_case.id}, state: ${state}`,
      {
        transaction_id: context.transaction_id,
      });

  res.json({
    status: 'ok',
    verification_case_id: content.verification_case.id,
    state,
  });
});

// ============ PHASE-3: SETTLEMENT CALLBACKS ============

/**
 * POST /callbacks/on_settlement_initiated - Receive settlement initiation from
 * BPP
 */
router.post('/on_settlement_initiated', (req: Request, res: Response) => {
  const message = req.body as OnSettlementInitiatedMessage;
  const {context, message: content} = message;

  logger.info('Received on_settlement_initiated callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });

  if (isDuplicateMessage(context.message_id)) {
    return res.json({status: 'ok', message: 'duplicate ignored'});
  }

  logEvent(
      context.transaction_id, context.message_id, 'on_settlement_initiated',
      'INBOUND', JSON.stringify(message));

  logger.info(
      `Settlement initiated: ${content.settlement.id}, amount: ${
          content.settlement.amount.value} ${
          content.settlement.amount.currency}`,
      {
        transaction_id: context.transaction_id,
      });

  res.json({
    status: 'ok',
    settlement_id: content.settlement.id,
    state: content.settlement.state,
    amount: content.settlement.amount,
  });
});

/**
 * POST /callbacks/on_settlement_pending - Receive settlement pending status
 * from BPP
 */
router.post('/on_settlement_pending', (req: Request, res: Response) => {
  const message = req.body as OnSettlementPendingMessage;
  const {context, message: content} = message;

  logger.info('Received on_settlement_pending callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });

  if (isDuplicateMessage(context.message_id)) {
    return res.json({status: 'ok', message: 'duplicate ignored'});
  }

  logEvent(
      context.transaction_id, context.message_id, 'on_settlement_pending',
      'INBOUND', JSON.stringify(message));

  // Update settlement state
  updateSettlementState(content.settlement.id, 'PENDING');

  logger.info(`Settlement pending: ${content.settlement.id}`, {
    transaction_id: context.transaction_id,
  });

  res.json({
    status: 'ok',
    settlement_id: content.settlement.id,
    state: 'PENDING',
  });
});

/**
 * POST /callbacks/on_settlement_settled - Receive settlement completion from
 * BPP
 */
router.post('/on_settlement_settled', (req: Request, res: Response) => {
  const message = req.body as OnSettlementSettledMessage;
  const {context, message: content} = message;

  logger.info('Received on_settlement_settled callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });

  if (isDuplicateMessage(context.message_id)) {
    return res.json({status: 'ok', message: 'duplicate ignored'});
  }

  logEvent(
      context.transaction_id, context.message_id, 'on_settlement_settled',
      'INBOUND', JSON.stringify(message));

  // Update settlement state
  updateSettlementState(
      content.settlement.id, 'SETTLED', content.settlement.breakdown);

  logger.info(
      `Settlement completed: ${content.settlement.id}, amount: ${
          content.settlement.amount.value} ${
          content.settlement.amount.currency}`,
      {
        transaction_id: context.transaction_id,
      });

  res.json({
    status: 'ok',
    settlement_id: content.settlement.id,
    state: 'SETTLED',
    amount: content.settlement.amount,
    breakdown: content.settlement.breakdown,
  });
});

/**
 * POST /callbacks/on_settlement_failed - Receive settlement failure from BPP
 */
router.post('/on_settlement_failed', (req: Request, res: Response) => {
  const message = req.body as OnSettlementFailedMessage;
  const {context, message: content} = message;

  logger.info('Received on_settlement_failed callback', {
    transaction_id: context.transaction_id,
    message_id: context.message_id,
    action: context.action,
  });

  if (isDuplicateMessage(context.message_id)) {
    return res.json({status: 'ok', message: 'duplicate ignored'});
  }

  logEvent(
      context.transaction_id, context.message_id, 'on_settlement_failed',
      'INBOUND', JSON.stringify(message));

  // Update settlement state
  updateSettlementState(content.settlement.id, 'FAILED');

  logger.error(`Settlement failed: ${content.settlement.id}`, {
    transaction_id: context.transaction_id,
    error: content.error,
  });

  res.json({
    status: 'ok',
    settlement_id: content.settlement.id,
    state: 'FAILED',
    error: content.error,
  });
});

export default router;
