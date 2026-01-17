/**
 * Beckn Context Utilities
 */
import { BecknContext, BecknAction } from '../types/beckn';
export interface CreateContextOptions {
    action: BecknAction;
    transaction_id?: string;
    message_id?: string;
    bap_id: string;
    bap_uri: string;
    bpp_id?: string;
    bpp_uri?: string;
    ttl?: string;
}
/**
 * Create a new Beckn context
 */
export declare function createContext(options: CreateContextOptions): BecknContext;
/**
 * Create a callback context from an incoming context
 */
export declare function createCallbackContext(incomingContext: BecknContext, callbackAction: BecknAction): BecknContext;
