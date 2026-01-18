/**
 * Verification Domain Module - Phase-3
 * Handles verification state machine, deviation calculation, and tolerance validation
 */

import { TimeWindow, Quantity, ToleranceRules, VerificationState, Proof, VerificationCase } from '@p2p/shared';
import { getDb, saveDb } from './db';
import { rowToObject } from '@p2p/shared';

export interface DeviationResult {
  deviation_quantity: number;
  deviation_percent: number;
  within_tolerance: boolean;
}

/**
 * Calculate deviation between expected and delivered quantities
 */
export function calculateDeviation(
  expected: number,
  delivered: number,
  tolerance: ToleranceRules
): DeviationResult {
  const deviation_quantity = expected - delivered;
  const deviation_percent = (Math.abs(deviation_quantity) / expected) * 100;
  
  const within_tolerance = 
    deviation_percent <= tolerance.max_deviation_percent &&
    (tolerance.min_quantity === undefined || delivered >= tolerance.min_quantity);
  
  return {
    deviation_quantity,
    deviation_percent,
    within_tolerance,
  };
}

/**
 * Determine verification state based on deviation
 */
export function determineVerificationState(
  deviation: DeviationResult,
  proofsReceived: boolean
): VerificationState {
  if (!proofsReceived) {
    return 'PENDING';
  }
  
  if (deviation.within_tolerance) {
    return 'VERIFIED';
  } else {
    return 'DEVIATED';
  }
}

/**
 * Check if verification case has expired
 */
export function checkTimeout(expiresAt: string): boolean {
  const now = new Date();
  const expires = new Date(expiresAt);
  return now > expires;
}

/**
 * Calculate delivered quantity from proofs
 */
export function calculateDeliveredQuantity(proofs: Proof[]): number {
  // For meter readings, use start/end readings
  // For telemetry, sum all values
  // This is a simplified implementation
  
  let totalDelivered = 0;
  
  for (const proof of proofs) {
    if (proof.type === 'METER_READING') {
      // For meter readings, we might have start/end readings
      // This is simplified - in production, you'd parse metadata
      totalDelivered += proof.value.quantity;
    } else if (proof.type === 'TELEMETRY') {
      // Sum telemetry values
      totalDelivered += proof.value.quantity;
    } else {
      // For attestation/OTP, use the value as-is
      totalDelivered += proof.value.quantity;
    }
  }
  
  return totalDelivered;
}

/**
 * Get verification case by ID
 */
export function getVerificationCaseById(caseId: string): any | null {
  const db = getDb();
  const result = db.exec(
    'SELECT * FROM verification_cases WHERE id = ?',
    [caseId]
  );
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }
  
  const cols = result[0].columns;
  return rowToObject(cols, result[0].values[0]);
}

/**
 * Get verification case by order ID
 */
export function getVerificationCaseByOrderId(orderId: string): any | null {
  const db = getDb();
  const result = db.exec(
    'SELECT * FROM verification_cases WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
    [orderId]
  );
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }
  
  const cols = result[0].columns;
  return rowToObject(cols, result[0].values[0]);
}

/**
 * Get all proofs for a verification case
 */
export function getProofsByVerificationCaseId(caseId: string): any[] {
  const db = getDb();
  const result = db.exec(
    'SELECT * FROM proofs WHERE verification_case_id = ? ORDER BY timestamp',
    [caseId]
  );
  
  if (result.length === 0) {
    return [];
  }
  
  const cols = result[0].columns;
  return result[0].values.map(row => rowToObject(cols, row));
}

/**
 * Create verification case
 */
export function createVerificationCase(
  caseId: string,
  orderId: string,
  transactionId: string,
  window: TimeWindow,
  requiredProofs: any[],
  toleranceRules: ToleranceRules,
  expectedQty: number,
  expiresAt: string,
  rawJson: string
): void {
  const db = getDb();
  db.run(
    `INSERT INTO verification_cases (
      id, order_id, transaction_id, state, required_proofs_json, 
      tolerance_rules_json, window_json, expected_qty, expires_at, raw_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      caseId,
      orderId,
      transactionId,
      'PENDING',
      JSON.stringify(requiredProofs),
      JSON.stringify(toleranceRules),
      JSON.stringify(window),
      expectedQty,
      expiresAt,
      rawJson,
    ]
  );
  saveDb();
}

/**
 * Update verification case with delivered quantity and deviation
 */
export function updateVerificationCaseWithProofs(
  caseId: string,
  deliveredQty: number,
  deviation: DeviationResult,
  state: VerificationState
): void {
  const db = getDb();
  db.run(
    `UPDATE verification_cases 
     SET delivered_qty = ?, deviation_qty = ?, deviation_percent = ?, 
         state = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      deliveredQty,
      deviation.deviation_quantity,
      deviation.deviation_percent,
      state,
      caseId,
    ]
  );
  saveDb();
}

/**
 * Update verification case state
 */
export function updateVerificationCaseState(
  caseId: string,
  state: VerificationState,
  decision?: string,
  reason?: string
): void {
  const db = getDb();
  const updates: string[] = ['state = ?', 'updated_at = CURRENT_TIMESTAMP'];
  const values: any[] = [state];
  
  if (decision) {
    updates.push('decision = ?');
    updates.push('decided_at = CURRENT_TIMESTAMP');
    values.push(decision);
  }
  
  if (reason) {
    updates.push('rejection_reason = ?');
    values.push(reason);
  }
  
  values.push(caseId);
  
  db.run(
    `UPDATE verification_cases SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
  saveDb();
}

/**
 * Save proof to database
 */
export function saveProof(
  proofId: string,
  verificationCaseId: string,
  proof: Proof,
  rawJson: string
): void {
  const db = getDb();
  db.run(
    `INSERT INTO proofs (
      id, verification_case_id, type, payload_json, source, 
      quantity_value, timestamp, raw_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proofId,
      verificationCaseId,
      proof.type,
      JSON.stringify(proof),
      proof.source,
      proof.value.quantity,
      proof.timestamp,
      rawJson,
    ]
  );
  saveDb();
}
