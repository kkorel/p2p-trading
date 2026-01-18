/**
 * Beckn Message Types for P2P Energy Trading
 * Defines the structure of discover/select/init/confirm/status messages
 */

import { BecknMessage, TimeWindow, Quantity } from './beckn';
import { Catalog, CatalogItem, SourceType, DeliveryMode } from './catalog';
import { Order, SelectOrderItem, Quote, Fulfillment } from './orders';

// ============ DISCOVER ============

export interface DiscoverFilters {
  type: 'jsonpath';
  expression: string;
}

export interface DiscoverIntent {
  item?: {
    itemAttributes?: {
      sourceType?: SourceType;
      deliveryMode?: DeliveryMode;
      availableQuantity?: number;
    };
  };
  fulfillment?: {
    time?: TimeWindow;
  };
  quantity?: Quantity;
}

export interface DiscoverMessageContent {
  intent?: DiscoverIntent;
  filters?: DiscoverFilters;
}

export type DiscoverMessage = BecknMessage<DiscoverMessageContent>;

// ============ ON_DISCOVER ============

export interface OnDiscoverMessageContent {
  catalog: Catalog;
}

export type OnDiscoverMessage = BecknMessage<OnDiscoverMessageContent>;

// ============ SELECT ============

export interface SelectMessageContent {
  orderItems: SelectOrderItem[];
}

export type SelectMessage = BecknMessage<SelectMessageContent>;

// ============ ON_SELECT ============

export interface OnSelectMessageContent {
  order: {
    id: string;
    items: SelectOrderItem[];
    quote: Quote;
    provider: {
      id: string;
      descriptor?: { name: string };
    };
  };
}

export type OnSelectMessage = BecknMessage<OnSelectMessageContent>;

// ============ INIT ============

export interface InitMessageContent {
  order: {
    id?: string;
    items: SelectOrderItem[];
    provider: { id: string };
    quote?: Quote;
  };
}

export type InitMessage = BecknMessage<InitMessageContent>;

// ============ ON_INIT ============

export interface OnInitMessageContent {
  order: Order;
}

export type OnInitMessage = BecknMessage<OnInitMessageContent>;

// ============ CONFIRM ============

export interface ConfirmMessageContent {
  order: {
    id: string;
  };
}

export type ConfirmMessage = BecknMessage<ConfirmMessageContent>;

// ============ ON_CONFIRM ============

export interface OnConfirmMessageContent {
  order: Order;
}

export type OnConfirmMessage = BecknMessage<OnConfirmMessageContent>;

// ============ STATUS ============

export interface StatusMessageContent {
  order_id: string;
}

export type StatusMessage = BecknMessage<StatusMessageContent>;

// ============ ON_STATUS ============

export interface OnStatusMessageContent {
  order: Order;
  fulfillment?: Fulfillment;
}

export type OnStatusMessage = BecknMessage<OnStatusMessageContent>;

// ============ PHASE-3: VERIFICATION ============

export interface VerificationWindow extends TimeWindow {}

export interface RequiredProof {
  type: 'METER_READING' | 'TELEMETRY' | 'ATTESTATION' | 'OTP';
  source: string;
  deadline: string; // ISO 8601
}

export interface ToleranceRules {
  max_deviation_percent: number;
  min_quantity?: number;
}

// Export for use in verification module
export type { ToleranceRules };

export interface VerificationStartMessageContent {
  order_id: string;
  verification_window: VerificationWindow;
  required_proofs: RequiredProof[];
  expected_quantity: Quantity;
  tolerance_rules: ToleranceRules;
}

export type VerificationStartMessage = BecknMessage<VerificationStartMessageContent>;

export interface VerificationCase {
  id: string;
  order_id: string;
  state: 'PENDING' | 'PROOFS_RECEIVED' | 'VERIFYING' | 'VERIFIED' | 'DEVIATED' | 'REJECTED' | 'DISPUTED' | 'FAILED' | 'TIMEOUT';
  verification_window: VerificationWindow;
  required_proofs: RequiredProof[];
  expected_quantity: Quantity;
  delivered_quantity?: Quantity;
  deviation?: {
    quantity: number;
    percent: number;
  };
  expires_at: string;
}

export interface OnVerificationStartMessageContent {
  verification_case: VerificationCase;
}

export type OnVerificationStartMessage = BecknMessage<OnVerificationStartMessageContent>;

export interface Proof {
  type: 'METER_READING' | 'TELEMETRY' | 'ATTESTATION' | 'OTP';
  source: string;
  timestamp: string; // ISO 8601
  value: Quantity;
  metadata?: Record<string, any>;
}

export interface SubmitProofsMessageContent {
  order_id: string;
  verification_case_id: string;
  proofs: Proof[];
}

export type SubmitProofsMessage = BecknMessage<SubmitProofsMessageContent>;

export interface OnProofsSubmittedMessageContent {
  verification_case: VerificationCase;
  proofs_received: Proof[];
}

export type OnProofsSubmittedMessage = BecknMessage<OnProofsSubmittedMessageContent>;

export interface AcceptVerificationMessageContent {
  order_id: string;
  verification_case_id: string;
}

export type AcceptVerificationMessage = BecknMessage<AcceptVerificationMessageContent>;

export interface OnVerificationAcceptedMessageContent {
  verification_case: VerificationCase;
}

export type OnVerificationAcceptedMessage = BecknMessage<OnVerificationAcceptedMessageContent>;

export interface RejectVerificationMessageContent {
  order_id: string;
  verification_case_id: string;
  reason?: string;
}

export type RejectVerificationMessage = BecknMessage<RejectVerificationMessageContent>;

export interface OnVerificationRejectedMessageContent {
  verification_case: VerificationCase;
}

export type OnVerificationRejectedMessage = BecknMessage<OnVerificationRejectedMessageContent>;

// ============ PHASE-3: SETTLEMENT ============

export type SettlementType = 'DAILY' | 'PERIODIC' | 'IMMEDIATE';

export interface SettlementBreakdown {
  base_amount: number;
  delivered_quantity: number;
  price_per_unit: number;
  penalty?: number;
  deviation_adjustment?: number;
}

export interface SettlementStartMessageContent {
  order_id: string;
  verification_case_id: string;
  settlement_type: SettlementType;
  period?: TimeWindow;
}

export type SettlementStartMessage = BecknMessage<SettlementStartMessageContent>;

export interface Settlement {
  id: string;
  order_id: string;
  state: 'INITIATED' | 'PENDING' | 'SETTLED' | 'FAILED';
  amount: Price;
  period?: TimeWindow;
  breakdown?: SettlementBreakdown;
  initiated_at: string;
  completed_at?: string;
}

export interface OnSettlementInitiatedMessageContent {
  settlement: Settlement;
}

export type OnSettlementInitiatedMessage = BecknMessage<OnSettlementInitiatedMessageContent>;

export interface OnSettlementPendingMessageContent {
  settlement: Settlement;
}

export type OnSettlementPendingMessage = BecknMessage<OnSettlementPendingMessageContent>;

export interface OnSettlementSettledMessageContent {
  settlement: Settlement;
}

export type OnSettlementSettledMessage = BecknMessage<OnSettlementSettledMessageContent>;

export interface OnSettlementFailedMessageContent {
  settlement: Settlement;
  error?: {
    code: string;
    message: string;
  };
}

export type OnSettlementFailedMessage = BecknMessage<OnSettlementFailedMessageContent>;
