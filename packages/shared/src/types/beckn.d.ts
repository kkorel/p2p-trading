/**
 * Beckn v2 Protocol Types for P2P Energy Trading
 */
export declare const BECKN_DOMAIN = "energy:trading:p2p";
export declare const BECKN_VERSION = "2.0.0";
export interface BecknContext {
    domain: string;
    version: string;
    action: BecknAction;
    timestamp: string;
    message_id: string;
    transaction_id: string;
    bap_id: string;
    bap_uri: string;
    bpp_id?: string;
    bpp_uri?: string;
    ttl: string;
}
export type BecknAction = 'discover' | 'on_discover' | 'select' | 'on_select' | 'init' | 'on_init' | 'confirm' | 'on_confirm' | 'status' | 'on_status';
export interface BecknAck {
    ack_status: 'ACK' | 'NACK';
    timestamp: string;
    error?: BecknError;
}
export interface BecknError {
    code: string;
    message: string;
}
export interface BecknMessage<T = unknown> {
    context: BecknContext;
    message: T;
}
export interface BecknResponse {
    context: BecknContext;
    ack: BecknAck;
}
export interface TimeWindow {
    startTime: string;
    endTime: string;
}
export interface Price {
    value: number;
    currency: string;
}
export interface Quantity {
    value: number;
    unit: string;
}
