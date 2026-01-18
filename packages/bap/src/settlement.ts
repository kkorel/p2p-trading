/**
 * Settlement Domain Module - Phase-3
 * Handles settlement amount calculation, penalty computation, and settlement state management
 */

import { Price, SettlementState, SettlementType, TimeWindow, SettlementBreakdown } from '@p2p/shared';
import { getDb, saveDb } from './db';
import { rowToObject } from '@p2p/shared';

export interface SettlementCalculationInput {
  deliveredQuantity: number;
  pricePerUnit: number;
  currency: string;
  deviation?: {
    quantity: number;
    percent: number;
  };
  penaltyRules?: {
    deviation_threshold_percent?: number;
    penalty_percent?: number;
    fixed_penalty?: number;
  };
}

export interface SettlementCalculationResult {
  baseAmount: number;
  penalty: number;
  deviationAdjustment: number;
  finalAmount: number;
  breakdown: SettlementBreakdown;
}

/**
 * Calculate settlement amount with deviation and penalty
 */
export function calculateSettlementAmount(
  input: SettlementCalculationInput
): SettlementCalculationResult {
  const { deliveredQuantity, pricePerUnit, currency, deviation, penaltyRules } = input;
  
  // Base amount = delivered quantity × price per unit
  const baseAmount = deliveredQuantity * pricePerUnit;
  
  // Calculate penalty if deviation exceeds threshold
  let penalty = 0;
  let deviationAdjustment = 0;
  
  if (deviation && penaltyRules) {
    const absDeviationPercent = Math.abs(deviation.percent);
    
    if (penaltyRules.deviation_threshold_percent && 
        absDeviationPercent > penaltyRules.deviation_threshold_percent) {
      // Apply penalty
      if (penaltyRules.penalty_percent) {
        // Percentage-based penalty
        penalty = baseAmount * (penaltyRules.penalty_percent / 100);
      } else if (penaltyRules.fixed_penalty) {
        // Fixed penalty
        penalty = penaltyRules.fixed_penalty;
      }
      
      // Deviation adjustment (reduce amount if under-delivered)
      if (deviation.quantity > 0) {
        // Under-delivered: reduce by missing quantity × price
        deviationAdjustment = -deviation.quantity * pricePerUnit;
      }
    }
  }
  
  const finalAmount = baseAmount + deviationAdjustment - penalty;
  
  const breakdown: SettlementBreakdown = {
    base_amount: baseAmount,
    delivered_quantity: deliveredQuantity,
    price_per_unit: pricePerUnit,
    penalty: penalty > 0 ? penalty : undefined,
    deviation_adjustment: deviationAdjustment !== 0 ? deviationAdjustment : undefined,
  };
  
  return {
    baseAmount,
    penalty,
    deviationAdjustment,
    finalAmount,
    breakdown,
  };
}

/**
 * Get settlement by ID
 */
export function getSettlementById(settlementId: string): any | null {
  const db = getDb();
  const result = db.exec(
    'SELECT * FROM settlements WHERE id = ?',
    [settlementId]
  );
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }
  
  const cols = result[0].columns;
  return rowToObject(cols, result[0].values[0]);
}

/**
 * Get settlement by order ID
 */
export function getSettlementByOrderId(orderId: string): any | null {
  const db = getDb();
  const result = db.exec(
    'SELECT * FROM settlements WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
    [orderId]
  );
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }
  
  const cols = result[0].columns;
  return rowToObject(cols, result[0].values[0]);
}

/**
 * Create settlement
 */
export function createSettlement(
  settlementId: string,
  orderId: string,
  verificationCaseId: string | null,
  transactionId: string,
  settlementType: SettlementType,
  amount: number,
  currency: string,
  period: TimeWindow | null,
  breakdown: SettlementBreakdown | null,
  rawJson: string
): void {
  const db = getDb();
  db.run(
    `INSERT INTO settlements (
      id, order_id, verification_case_id, transaction_id, settlement_type,
      state, amount_value, currency, period_json, breakdown_json, raw_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      settlementId,
      orderId,
      verificationCaseId,
      transactionId,
      settlementType,
      'INITIATED',
      amount,
      currency,
      period ? JSON.stringify(period) : null,
      breakdown ? JSON.stringify(breakdown) : null,
      rawJson,
    ]
  );
  saveDb();
}

/**
 * Update settlement state
 */
export function updateSettlementState(
  settlementId: string,
  state: SettlementState,
  breakdown?: SettlementBreakdown
): void {
  const db = getDb();
  
  if (state === 'SETTLED' || state === 'FAILED') {
    db.run(
      `UPDATE settlements 
       SET state = ?, breakdown_json = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        state,
        breakdown ? JSON.stringify(breakdown) : null,
        settlementId,
      ]
    );
  } else {
    db.run(
      `UPDATE settlements 
       SET state = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [state, settlementId]
    );
  }
  
  saveDb();
}
