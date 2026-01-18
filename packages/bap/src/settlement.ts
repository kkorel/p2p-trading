/**
 * Settlement Domain Module - Phase-3
 * Handles settlement amount calculation, penalty computation, and settlement state management
 * Using Prisma ORM for PostgreSQL
 */

import { prisma } from './db';
import { Price, TimeWindow } from '@p2p/shared';

export type SettlementState = 'INITIATED' | 'PENDING' | 'SETTLED' | 'FAILED';
export type SettlementType = 'DAILY' | 'PERIODIC' | 'IMMEDIATE';

export interface SettlementBreakdown {
  base_amount: number;
  delivered_quantity: number;
  price_per_unit: number;
  penalty?: number;
  deviation_adjustment?: number;
}

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
export async function getSettlementById(settlementId: string) {
  return await prisma.settlement.findUnique({
    where: { id: settlementId },
  });
}

/**
 * Get settlement by order ID
 */
export async function getSettlementByOrderId(orderId: string) {
  return await prisma.settlement.findFirst({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Create settlement
 */
export async function createSettlement(
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
) {
  return await prisma.settlement.create({
    data: {
      id: settlementId,
      orderId,
      verificationCaseId: verificationCaseId || null,
      transactionId,
      settlementType,
      state: 'INITIATED',
      amountValue: amount,
      currency,
      periodJson: period ? JSON.stringify(period) : null,
      breakdownJson: breakdown ? JSON.stringify(breakdown) : null,
      rawJson,
    },
  });
}

/**
 * Update settlement state
 */
export async function updateSettlementState(
  settlementId: string,
  state: SettlementState,
  breakdown?: SettlementBreakdown
) {
  const data: any = {
    state,
  };
  
  if (state === 'SETTLED' || state === 'FAILED') {
    data.completedAt = new Date();
    if (breakdown) {
      data.breakdownJson = JSON.stringify(breakdown);
    }
  }
  
  return await prisma.settlement.update({
    where: { id: settlementId },
    data,
  });
}
