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
import { config, createLogger, Order } from '@p2p/shared';

const logger = createLogger('Ledger');

// Ledger API types
interface TradeDetail {
  tradeType: 'ENERGY' | 'CAPACITY' | 'CARBON';
  tradeQty: number;
  tradeUnit: 'KWH' | 'KW';
}

interface LedgerPutRequest {
  role: 'BUYER' | 'SELLER';
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
  platformIdBuyer?: string;
  platformIdSeller?: string;
  buyerId?: string;
  sellerId?: string;
  tradeTime?: string;
  deliveryStartTime?: string;
  deliveryEndTime?: string;
  tradeDetails?: TradeDetail[];
  creationTime: string;
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
          tradeQty: item.quantity?.measure?.value || 0,
          tradeUnit: 'KWH',
        });

        // Extract time window from fulfillment
        if (order.fulfillments && order.fulfillments.length > 0) {
          const timeRange = order.fulfillments[0].time;
          if (timeRange) {
            deliveryStartTime = timeRange.range?.start;
            deliveryEndTime = timeRange.range?.end;
          }
        }
      }
    }

    const request: LedgerPutRequest = {
      role: 'BUYER',
      transactionId,
      orderItemId: order.id,
      platformIdBuyer: config.bap.id,
      platformIdSeller: config.bpp.id,
      buyerId,
      sellerId,
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
    });

    const response = await axios.post<LedgerWriteResponse>(
      `${ledgerUrl}/ledger/put`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add Beckn HTTP signature headers for production
          // 'Authorization': 'Bearer ...',
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
    logger.error('Ledger API error', {
      transactionId,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    return {
      success: false,
      error: error.message,
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
