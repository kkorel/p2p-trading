/**
 * Verification Domain Module - Phase-3
 * Handles verification state machine, deviation calculation, and tolerance validation
 * Using Prisma ORM for PostgreSQL
 */

import { prisma } from './db';
import { TimeWindow, Quantity, ToleranceRules } from '@p2p/shared';

export type VerificationState = 'PENDING' | 'PROOFS_RECEIVED' | 'VERIFYING' | 'VERIFIED' | 'DEVIATED' | 'REJECTED' | 'DISPUTED' | 'FAILED' | 'TIMEOUT';

export interface DeviationResult {
  deviation_quantity: number;
  deviation_percent: number;
  within_tolerance: boolean;
}

export interface Proof {
  type: 'METER_READING' | 'TELEMETRY' | 'ATTESTATION' | 'OTP';
  source: string;
  timestamp: string;
  value: Quantity;
  metadata?: Record<string, any>;
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
 * Calculate delivered quantity from proofs
 */
export function calculateDeliveredQuantity(proofs: Proof[]): number {
  let totalDelivered = 0;
  
  for (const proof of proofs) {
    if (proof.type === 'METER_READING') {
      // For meter readings, sum quantities
      // In production, you'd parse metadata to find START/END readings
      totalDelivered += proof.value.value;
    } else if (proof.type === 'TELEMETRY') {
      // Sum telemetry values
      totalDelivered += proof.value.value;
    } else {
      // For attestation/OTP, use the value as-is
      totalDelivered += proof.value.value;
    }
  }
  
  return totalDelivered;
}

/**
 * Get verification case by ID
 */
export async function getVerificationCaseById(caseId: string) {
  return await prisma.verificationCase.findUnique({
    where: { id: caseId },
    include: { proofs: true },
  });
}

/**
 * Get verification case by order ID
 */
export async function getVerificationCaseByOrderId(orderId: string) {
  return await prisma.verificationCase.findFirst({
    where: { orderId },
    include: { proofs: true },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Create verification case
 */
export async function createVerificationCase(
  caseId: string,
  orderId: string,
  transactionId: string,
  window: TimeWindow,
  requiredProofs: any[],
  toleranceRules: ToleranceRules,
  expectedQty: number,
  expiresAt: Date,
  rawJson: string
) {
  return await prisma.verificationCase.create({
    data: {
      id: caseId,
      orderId,
      transactionId,
      state: 'PENDING',
      requiredProofsJson: JSON.stringify(requiredProofs),
      toleranceRulesJson: JSON.stringify(toleranceRules),
      windowJson: JSON.stringify(window),
      expectedQty,
      expiresAt,
      rawJson,
    },
  });
}

/**
 * Update verification case with delivered quantity and deviation
 */
export async function updateVerificationCaseWithProofs(
  caseId: string,
  deliveredQty: number,
  deviation: DeviationResult,
  state: VerificationState
) {
  return await prisma.verificationCase.update({
    where: { id: caseId },
    data: {
      deliveredQty,
      deviationQty: deviation.deviation_quantity,
      deviationPercent: deviation.deviation_percent,
      state,
    },
  });
}

/**
 * Update verification case state
 */
export async function updateVerificationCaseState(
  caseId: string,
  state: VerificationState,
  decision?: string,
  reason?: string
) {
  return await prisma.verificationCase.update({
    where: { id: caseId },
    data: {
      state,
      decision: decision || null,
      decidedAt: decision ? new Date() : null,
      rejectionReason: reason || null,
    },
  });
}

/**
 * Save proof to database
 */
export async function saveProof(
  proofId: string,
  verificationCaseId: string,
  proof: Proof,
  rawJson: string
) {
  return await prisma.proof.create({
    data: {
      id: proofId,
      verificationCaseId,
      type: proof.type,
      payloadJson: JSON.stringify(proof),
      source: proof.source,
      quantityValue: proof.value.value,
      timestamp: new Date(proof.timestamp),
      rawJson,
    },
  });
}

/**
 * Get all proofs for a verification case
 */
export async function getProofsByVerificationCaseId(caseId: string) {
  return await prisma.proof.findMany({
    where: { verificationCaseId: caseId },
    orderBy: { timestamp: 'asc' },
  });
}

/**
 * Check if verification case has expired
 */
export function checkTimeout(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}
