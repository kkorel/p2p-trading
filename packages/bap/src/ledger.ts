/**
 * DEG Ledger Integration
 * 
 * Handles writing trade records to the immutable DEG Ledger.
 * 
 * API Reference: https://github.com/beckn/DEG/blob/main/specification/api/deg_contract_ledger.yaml
 * 
 * Endpoints:
 * - POST /ledger/put  - Create/update trade record (platform use)
 * - POST /ledger/get  - Query trade records
 * - POST /ledger/record - Record fulfillment (DISCOM use only)
 */

import axios from 'axios';
import { config, createLogger, Order, prisma } from '@p2p/shared';

const logger = createLogger('Ledger');

// Ledger API types (matching DEG Ledger spec v0.3.0)
type TradeType = 'ENERGY' | 'RAISE_CAPACITY' | 'LOWER_CAPACITY' | 'PFR' | 'SFR' | 'TC' | 'BDR';
type TradeUnit = 'KWH' | 'KW';
type Role = 'BUYER' | 'SELLER' | 'BUYER_DISCOM' | 'SELLER_DISCOM';

interface TradeDetail {
  tradeType: TradeType;
  tradeQty: number;
  tradeUnit: TradeUnit;
}

interface LedgerPutRequest {
  role: Role;
  transactionId: string;
  orderItemId: string;
  platformIdBuyer?: string;
  platformIdSeller?: string;
  discomIdBuyer?: string;
  discomIdSeller?: string;
  buyerId?: string;
  sellerId?: string;
  tradeTime?: string;
  deliveryStartTime?: string;
  deliveryEndTime?: string;
  tradeDetails?: TradeDetail[];
  clientReference?: string;
}

interface LedgerWriteResponse {
  success: boolean;
  recordId?: string;
  creationTime?: string;
  rowDigest?: string;
  message?: string;
}

interface LedgerGetRequest {
  transactionId?: string;
  orderItemId?: string;
  recordId?: string;
  buyerId?: string;
  sellerId?: string;
  limit?: number;
  offset?: number;
}

interface LedgerRecord {
  recordId: string;
  transactionId: string;
  orderItemId: string;
  platformIdBuyer: string;
  platformIdSeller: string;
  discomIdBuyer: string;
  discomIdSeller: string;
  buyerId: string;
  sellerId: string;
  tradeTime?: string;
  deliveryStartTime?: string;
  deliveryEndTime?: string;
  tradeDetails?: TradeDetail[];
  creationTime: string;
  rowDigest?: string;
}

interface LedgerGetResponse {
  success: boolean;
  records: LedgerRecord[];
  total?: number;
}

/**
 * Write a trade record to the DEG Ledger
 * Called on order confirmation (on_confirm)
 */
export async function writeTradeToLedger(
  transactionId: string,
  order: Order,
  buyerId: string,
  sellerId: string
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  // Check if ledger writes are enabled
  if (!config.external.enableLedgerWrites) {
    logger.info('Ledger writes disabled, skipping', { transactionId });
    return { success: true, recordId: 'mock-disabled' };
  }

  const ledgerUrl = config.external.ledger;
  
  try {
    // Extract trade details from order
    const tradeDetails: TradeDetail[] = [];
    let deliveryStartTime: string | undefined;
    let deliveryEndTime: string | undefined;

    // Parse order items to extract quantity and time window
    if (order.items) {
      for (const item of order.items) {
        tradeDetails.push({
          tradeType: 'ENERGY',
          tradeQty: item.quantity || 0,
          tradeUnit: 'KWH',
        });

        // Extract time window from order item
        if (item.timeWindow) {
          deliveryStartTime = item.timeWindow.startTime;
          deliveryEndTime = item.timeWindow.endTime;
        }
      }
    }

    // Get DISCOM IDs - use environment variables or defaults
    const discomIdBuyer = process.env.DISCOM_ID_BUYER || 'DISCOM_BUYER_DEFAULT';
    const discomIdSeller = process.env.DISCOM_ID_SELLER || 'DISCOM_SELLER_DEFAULT';

    // Per trade rules: ledger must use canumber|meternumber composite format
    // Look up consumerNumber and meterNumber for both buyer and seller
    let ledgerBuyerId = buyerId;
    let ledgerSellerId = sellerId;

    try {
      const [buyerUser, sellerUser] = await Promise.all([
        prisma.user.findUnique({
          where: { id: buyerId },
          select: { consumerNumber: true, meterNumber: true },
        }),
        // sellerId may be a providerId, so look up via provider
        prisma.user.findFirst({
          where: { providerId: sellerId },
          select: { consumerNumber: true, meterNumber: true },
        }),
      ]);

      if (buyerUser?.consumerNumber && buyerUser?.meterNumber) {
        ledgerBuyerId = `${buyerUser.consumerNumber}|${buyerUser.meterNumber}`;
      }
      if (sellerUser?.consumerNumber && sellerUser?.meterNumber) {
        ledgerSellerId = `${sellerUser.consumerNumber}|${sellerUser.meterNumber}`;
      }

      logger.info('Ledger IDs resolved', {
        transactionId,
        ledgerBuyerId,
        ledgerSellerId,
        buyerHasComposite: !!(buyerUser?.consumerNumber && buyerUser?.meterNumber),
        sellerHasComposite: !!(sellerUser?.consumerNumber && sellerUser?.meterNumber),
      });
    } catch (lookupErr: any) {
      logger.warn('Could not resolve canumber|meternumber for ledger, using raw IDs', {
        transactionId, error: lookupErr.message,
      });
    }

    const request: LedgerPutRequest = {
      role: 'BUYER',
      transactionId,
      orderItemId: order.id,
      platformIdBuyer: config.bap.id,
      platformIdSeller: config.bpp.id,
      discomIdBuyer,
      discomIdSeller,
      buyerId: ledgerBuyerId,
      sellerId: ledgerSellerId,
      tradeTime: new Date().toISOString(),
      deliveryStartTime,
      deliveryEndTime,
      tradeDetails,
      clientReference: `${transactionId}-${order.id}-${Date.now()}`,
    };

    logger.info('Writing trade to ledger', {
      transactionId,
      orderId: order.id,
      ledgerUrl,
      request: JSON.stringify(request),
    });

    const response = await axios.post<LedgerWriteResponse>(
      `${ledgerUrl}/ledger/put`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add Beckn HTTP signature headers for production
          // 'Authorization': 'Signature keyId="...",algorithm="ed25519",headers="(created) (expires) digest",signature="..."',
          // 'Digest': 'BLAKE-512=...',
        },
        timeout: 10000,
      }
    );

    if (response.data.success) {
      logger.info('Trade written to ledger successfully', {
        transactionId,
        recordId: response.data.recordId,
        rowDigest: response.data.rowDigest,
      });

      return {
        success: true,
        recordId: response.data.recordId,
      };
    } else {
      logger.error('Ledger write failed', {
        transactionId,
        message: response.data.message,
      });

      return {
        success: false,
        error: response.data.message || 'Unknown error',
      };
    }
  } catch (error: any) {
    // Detailed error logging for debugging
    const errorDetails = {
      transactionId,
      errorMessage: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      code: error.code,  // e.g., ECONNREFUSED, ETIMEDOUT
      url: `${ledgerUrl}/ledger/put`,
    };
    
    logger.error('Ledger API error', errorDetails);
    
    // Provide specific error messages based on error type
    let errorMessage = error.message;
    if (error.code === 'ECONNREFUSED') {
      errorMessage = `Ledger service unreachable at ${ledgerUrl}`;
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      errorMessage = 'Ledger service timeout';
    } else if (error.response?.status === 401) {
      errorMessage = 'Ledger authentication failed (missing/invalid signature)';
    } else if (error.response?.status === 400) {
      errorMessage = `Ledger validation error: ${JSON.stringify(error.response?.data)}`;
    } else if (error.response?.status === 403) {
      errorMessage = 'Ledger authorization failed (insufficient permissions)';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Query trade records from the ledger
 * NOTE: Reads are mocked for now per team decision
 */
export async function getTradeFromLedger(
  transactionId: string,
  orderId?: string
): Promise<{ success: boolean; records?: LedgerRecord[]; error?: string }> {
  // MOCKED: Per team decision, ledger reads are mocked for now
  logger.info('Ledger read (mocked)', { transactionId, orderId });

  // Return mock data
  const mockRecord: LedgerRecord = {
    recordId: `mock-${transactionId}`,
    transactionId,
    orderItemId: orderId || 'unknown',
    platformIdBuyer: config.bap.id,
    platformIdSeller: config.bpp.id,
    discomIdBuyer: process.env.DISCOM_ID_BUYER || 'DISCOM_BUYER_DEFAULT',
    discomIdSeller: process.env.DISCOM_ID_SELLER || 'DISCOM_SELLER_DEFAULT',
    buyerId: 'mock-buyer',
    sellerId: 'mock-seller',
    creationTime: new Date().toISOString(),
    tradeDetails: [
      {
        tradeType: 'ENERGY',
        tradeQty: 10,
        tradeUnit: 'KWH',
      },
    ],
  };

  return {
    success: true,
    records: [mockRecord],
  };

  // TODO: When enabling real reads, use this:
  /*
  const ledgerUrl = config.external.ledger;
  
  try {
    const request: LedgerGetRequest = {
      transactionId,
      orderItemId: orderId,
      limit: 10,
    };

    const response = await axios.post<LedgerGetResponse>(
      `${ledgerUrl}/ledger/get`,
      request,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    );

    return {
      success: response.data.success,
      records: response.data.records,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
  */
}

/**
 * Check if ledger is reachable (health check)
 */
export async function checkLedgerHealth(): Promise<boolean> {
  if (!config.external.enableLedgerWrites) {
    return true; // Skip check if disabled
  }

  try {
    const response = await axios.get(`${config.external.ledger}/health`, {
      timeout: 5000,
    });
    return response.status === 200;
  } catch {
    return false;
  }
}
