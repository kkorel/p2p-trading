/**
 * Beckn v2 Protocol Types for P2P Energy Trading
 */

// Domain constant - Must match external CDS/Registry domain
// Format: beckn.one:deg:p2p-trading-interdiscom:2.0.0
export const BECKN_DOMAIN =
    process.env.BECKN_DOMAIN || 'beckn.one:deg:p2p-trading-interdiscom:2.0.0';
export const BECKN_VERSION = '2.0.0';

// Schema context required for Beckn v2.0
export const BECKN_SCHEMA_CONTEXT = {
  schema: {
    domain: {
      name: BECKN_DOMAIN.split(':').slice(0, -1).join(
          ':'),  // e.g., beckn.one:deg:p2p-trading-interdiscom
      version: BECKN_VERSION,
    },
  },
};

// Schema context type for Beckn v2.0
export interface SchemaContext {
  schema: {domain: {name: string; version: string;};};
}

// Context - included in every Beckn message
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
  // Beckn v2.0 requires schema_context
  schema_context?: SchemaContext;
}

// All Beckn actions
export type BecknAction = 
  | 'discover' 
  | 'on_discover' 
  | 'select' 
  | 'on_select' 
  | 'init' 
  | 'on_init' 
  | 'confirm' 
  | 'on_confirm' 
  | 'status' 
  | 'on_status';

// ACK response
export interface BecknAck {
  ack_status: 'ACK' | 'NACK';
  timestamp: string;
  error?: BecknError;
}

export interface BecknError {
  code: string;
  message: string;
}

// Generic Beckn message wrapper
export interface BecknMessage<T = unknown> {
  context: BecknContext;
  message: T;
}

// Generic Beckn response with ACK
export interface BecknResponse {
  context: BecknContext;
  ack: BecknAck;
}

// Time window for offers and production
export interface TimeWindow {
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
}

// Price structure
export interface Price {
  value: number;
  currency: string;
}

// Quantity structure
export interface Quantity {
  value: number;
  unit: string; // e.g., "kWh"
}
