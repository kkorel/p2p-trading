/**
 * DISCOM Mock Service
 * Simulates DISCOM verification of energy delivery after trade window ends
 * 
 * In production, this would be replaced by real DISCOM webhook/API integration
 */

import { prisma } from './db';
import {
    createLogger,
    updateTrustAfterDiscom,
    calculateAllowedLimit,
} from '@p2p/shared';

const logger = createLogger('DISCOM-MOCK');

// Configuration from environment
const DISCOM_CONFIG = {
    successRate: parseFloat(process.env.DISCOM_SUCCESS_RATE || '0.85'),
    checkIntervalMs: parseInt(process.env.DISCOM_CHECK_INTERVAL_MS || '60000'),
};

export interface DiscomVerifyResult {
    orderId: string;
    transactionId: string;
    sellerId: string;
    expectedQty: number;
    deliveredQty: number;
    status: 'FULL' | 'PARTIAL' | 'FAILED';
    deliveryRatio: number;
}

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

/**
 * Find orders that have completed their time window and haven't been verified
 */
async function findOrdersPastTimeWindow() {
    const now = new Date();

    // Get ACTIVE orders that haven't been DISCOM verified yet
    const orders = await prisma.order.findMany({
        where: {
            status: 'ACTIVE',
            discomVerified: false,
        },
        include: {
            selectedOffer: true,
        },
    });

    // Filter to orders whose time window has ended
    return orders.filter(order => {
        if (!order.selectedOffer) return false;
        const timeWindowEnd = order.selectedOffer.timeWindowEnd;
        return timeWindowEnd < now;
    });
}

/**
 * Simulate DISCOM verification - random outcome based on configured success rate
 */
function simulateDiscomVerification(
    orderId: string,
    transactionId: string,
    sellerId: string,
    expectedQty: number
): DiscomVerifyResult {
    const random = Math.random();

    let deliveredQty: number;
    let status: 'FULL' | 'PARTIAL' | 'FAILED';

    if (random < DISCOM_CONFIG.successRate) {
        // Full delivery
        deliveredQty = expectedQty;
        status = 'FULL';
    } else if (random < 0.95) {
        // Partial delivery - random between 20% and 80% of expected
        const partialRatio = 0.2 + Math.random() * 0.6;
        deliveredQty = Math.floor(expectedQty * partialRatio);
        status = 'PARTIAL';
    } else {
        // Complete failure
        deliveredQty = 0;
        status = 'FAILED';
    }

    const deliveryRatio = expectedQty > 0 ? deliveredQty / expectedQty : 0;

    return {
        orderId,
        transactionId,
        sellerId,
        expectedQty,
        deliveredQty,
        status,
        deliveryRatio,
    };
}

/**
 * Process DISCOM verification result - update trust scores
 */
async function processDiscomFeedback(result: DiscomVerifyResult): Promise<void> {
    const { orderId, transactionId, sellerId, expectedQty, deliveredQty, status, deliveryRatio } = result;

    logger.info(`Processing DISCOM feedback for order ${orderId}`, {
        status,
        expectedQty,
        deliveredQty,
        deliveryRatio: (deliveryRatio * 100).toFixed(1) + '%',
    });

    // Get the seller (user who owns the provider)
    const seller = await prisma.user.findFirst({
        where: { providerId: sellerId },
    });

    if (!seller) {
        // Try to find seller by provider lookup
        const provider = await prisma.provider.findUnique({
            where: { id: sellerId },
            include: { user: true },
        });

        if (!provider?.user) {
            logger.error(`Could not find seller user for provider ${sellerId}`);
            return;
        }
    }

    const sellerUser = seller || await prisma.user.findFirst({
        where: { providerId: sellerId },
    });

    if (!sellerUser) {
        logger.error(`Could not find seller user for order ${orderId}`);
        return;
    }

    // Calculate trust impact
    const { newScore, newLimit, trustImpact } = updateTrustAfterDiscom(
        sellerUser.trustScore,
        deliveredQty,
        expectedQty
    );

    // Use transaction to update all records atomically
    await prisma.$transaction(async (tx) => {
        // 1. Create DISCOM feedback record
        await tx.discomFeedback.create({
            data: {
                orderId,
                sellerId: sellerUser.id,
                transactionId,
                deliveredQty,
                expectedQty,
                deliveryRatio,
                status,
                trustImpact,
                verifiedAt: new Date(),
            },
        });

        // 2. Update seller's trust score and allowed limit
        await tx.user.update({
            where: { id: sellerUser.id },
            data: {
                trustScore: newScore,
                allowedTradeLimit: newLimit,
            },
        });

        // 3. Record trust history
        await tx.trustScoreHistory.create({
            data: {
                userId: sellerUser.id,
                previousScore: sellerUser.trustScore,
                newScore,
                previousLimit: sellerUser.allowedTradeLimit,
                newLimit,
                reason: status === 'FULL' ? 'DELIVERY_SUCCESS' : status === 'PARTIAL' ? 'DELIVERY_PARTIAL' : 'DELIVERY_FAILED',
                orderId,
                metadata: JSON.stringify({
                    expectedQty,
                    deliveredQty,
                    deliveryRatio,
                    trustImpact,
                }),
            },
        });

        // 4. Mark order as DISCOM verified
        await tx.order.update({
            where: { id: orderId },
            data: { discomVerified: true },
        });

        // 5. Update provider stats
        await tx.provider.update({
            where: { id: sellerId },
            data: {
                totalOrders: { increment: 1 },
                successfulOrders: status === 'FULL' ? { increment: 1 } : undefined,
                trustScore: newScore,
            },
        });
    });

    logger.info(`Trust score updated for seller ${sellerUser.id}`, {
        orderId,
        previousScore: sellerUser.trustScore.toFixed(3),
        newScore: newScore.toFixed(3),
        trustImpact: trustImpact.toFixed(3),
        newLimit: newLimit + '%',
    });
}

/**
 * Run a single verification check
 */
async function runVerificationCheck(): Promise<void> {
    try {
        const completedOrders = await findOrdersPastTimeWindow();

        if (completedOrders.length === 0) {
            return;
        }

        logger.info(`Found ${completedOrders.length} orders ready for DISCOM verification`);

        for (const order of completedOrders) {
            try {
                // Parse quote to get expected quantity
                const quote = JSON.parse(order.quoteJson || '{}');
                const expectedQty = quote.totalQuantity || order.totalQty || 0;

                if (expectedQty <= 0) {
                    logger.warn(`Order ${order.id} has no quantity, skipping`);
                    continue;
                }

                const result = simulateDiscomVerification(
                    order.id,
                    order.transactionId,
                    order.providerId || '',
                    expectedQty
                );

                await processDiscomFeedback(result);
            } catch (error: any) {
                logger.error(`Failed to process DISCOM verification for order ${order.id}: ${error.message}`);
            }
        }
    } catch (error: any) {
        logger.error(`DISCOM verification check failed: ${error.message}`);
    }
}

/**
 * Start the background DISCOM mock service
 */
export function startDiscomMockService(): void {
    if (isRunning) {
        logger.warn('DISCOM mock service is already running');
        return;
    }

    isRunning = true;

    logger.info('Starting DISCOM mock service', {
        successRate: (DISCOM_CONFIG.successRate * 100).toFixed(0) + '%',
        checkIntervalMs: DISCOM_CONFIG.checkIntervalMs,
    });

    // Run immediately on start
    runVerificationCheck();

    // Then run on interval
    intervalId = setInterval(runVerificationCheck, DISCOM_CONFIG.checkIntervalMs);
}

/**
 * Stop the DISCOM mock service
 */
export function stopDiscomMockService(): void {
    if (!isRunning) {
        return;
    }

    isRunning = false;

    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }

    logger.info('DISCOM mock service stopped');
}

/**
 * Manually trigger verification for a specific order (for testing)
 */
export async function verifyOrderDelivery(orderId: string): Promise<DiscomVerifyResult | null> {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { selectedOffer: true },
    });

    if (!order) {
        logger.error(`Order ${orderId} not found`);
        return null;
    }

    if (order.discomVerified) {
        logger.info(`Order ${orderId} already verified`);
        return null;
    }

    const quote = JSON.parse(order.quoteJson || '{}');
    const expectedQty = quote.totalQuantity || order.totalQty || 0;

    const result = simulateDiscomVerification(
        order.id,
        order.transactionId,
        order.providerId || '',
        expectedQty
    );

    await processDiscomFeedback(result);

    return result;
}

/**
 * Check if DISCOM service is running
 */
export function isDiscomServiceRunning(): boolean {
    return isRunning;
}
