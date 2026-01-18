/**
 * ACK Response Utilities
 */
import { BecknContext, BecknResponse, BecknError } from '../types/beckn';
/**
 * Create a successful ACK response
 */
export declare function createAck(context: BecknContext): BecknResponse;
/**
 * Create a NACK response with error
 */
export declare function createNack(context: BecknContext, error: BecknError): BecknResponse;
/**
 * Common error codes
 */
export declare const ErrorCodes: {
    readonly INVALID_REQUEST: "40001";
    readonly OFFER_NOT_FOUND: "40401";
    readonly ITEM_NOT_FOUND: "40402";
    readonly ORDER_NOT_FOUND: "40403";
    readonly INSUFFICIENT_QUANTITY: "40901";
    readonly INTERNAL_ERROR: "50001";
};
