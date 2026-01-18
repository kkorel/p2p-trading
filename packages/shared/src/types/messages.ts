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

// Verification proof types
export type ProofType = 'METER_READING' | 'TELEMETRY' | 'ATTESTATION' | 'OTP';

// Verification state
export type VerificationState = 'PENDING' | 'PROOFS_RECEIVED' | 'VERIFYING' | 'VERIFIED' | 'DEVIATED' | 'REJECTED' | 'DISPUTED' | 'FAILED' | 'TIMEOUT';

// Settlement state
export type SettlementState = 'INITIATED' | 'PENDING' | 'SETTLED' | 'FAILED';

// Settlement type
export type SettlementType = 'DAILY' | 'PERIODIC' | 'IMMEDIATE';

// Required proof definition
export interface RequiredProof {
  type: ProofType;
  source: string;
  deadline: string; // ISO 8601
}

// Tolerance rules
export interface ToleranceRules {
  max_deviation_percent: number;
  min_quantity?: number;
}

// Proof artifact
export interface Proof {
  type: ProofType;
  source: string;
  timestamp: string; // ISO 8601
  value: {
    quantity: number;
    unit: string;
  };
  metadata?: Record<string, any>;
}

// Verification case
export interface VerificationCase {
  id: string;
  order_id: string;
  state: VerificationState;
  verification_window: TimeWindow;
  required_proofs: RequiredProof[];
  expected_quantity: Quantity;
  delivered_quantity?: Quantity;
  deviation?: {
    quantity: number;
    percent: number;
  };
  expires_at: string; // ISO 8601
}

// ============ VERIFICATION_START ============

export interface VerificationStartMessageContent {
  order_id: string;
  verification_window: TimeWindow;
  required_proofs: RequiredProof[];
  expected_quantity: Quantity;
  tolerance_rules: ToleranceRules;
}

export type VerificationStartMessage = BecknMessage<VerificationStartMessageContent>;

// ============ ON_VERIFICATION_START ============

export interface OnVerificationStartMessageContent {
  verification_case: VerificationCase;
}

export type OnVerificationStartMessage = BecknMessage<OnVerificationStartMessageContent>;

// ============ SUBMIT_PROOFS ============

export interface SubmitProofsMessageContent {
  order_id: string;
  verification_case_id: string;
  proofs: Proof[];
}

export type SubmitProofsMessage = BecknMessage<SubmitProofsMessageContent>;

// ============ ON_PROOFS_SUBMITTED ============

export interface OnProofsSubmittedMessageContent {
  verification_case: VerificationCase;
  proofs_received: Proof[];
}

export type OnProofsSubmittedMessage = BecknMessage<OnProofsSubmittedMessageContent>;

// ============ ACCEPT_VERIFICATION ============

export interface AcceptVerificationMessageContent {
  order_id: string;
  verification_case_id: string;
  decision: 'ACCEPTED';
  timestamp: string;
}

export type AcceptVerificationMessage = BecknMessage<AcceptVerificationMessageContent>;

// ============ ON_VERIFICATION_ACCEPTED ============

export interface OnVerificationAcceptedMessageContent {
  verification_case: VerificationCase;
}

export type OnVerificationAcceptedMessage = BecknMessage<OnVerificationAcceptedMessageContent>;

// ============ REJECT_VERIFICATION ============

export interface RejectVerificationMessageContent {
  order_id: string;
  verification_case_id: string;
  decision: 'REJECTED';
  reason?: string;
  timestamp: string;
}

export type RejectVerificationMessage = BecknMessage<RejectVerificationMessageContent>;

// ============ ON_VERIFICATION_REJECTED ============

export interface OnVerificationRejectedMessageContent {
  verification_case: VerificationCase;
}

export type OnVerificationRejectedMessage = BecknMessage<OnVerificationRejectedMessageContent>;

// ============ PHASE-3: SETTLEMENT ============

// Settlement breakdown
export interface SettlementBreakdown {
  base_amount: number;
  delivered_quantity: number;
  price_per_unit: number;
  penalty?: number;
  deviation_adjustment?: number;
}

// Settlement
export interface Settlement {
  id: string;
  order_id: string;
  state: SettlementState;
  amount: Price;
  period?: TimeWindow;
  breakdown?: SettlementBreakdown;
  initiated_at: string; // ISO 8601
  completed_at?: string; // ISO 8601
}

// ============ SETTLEMENT_START ============

export interface SettlementStartMessageContent {
  order_id: string;
  verification_case_id: string;
  settlement_type: SettlementType;
  period?: TimeWindow;
}

export type SettlementStartMessage = BecknMessage<SettlementStartMessageContent>;

// ============ ON_SETTLEMENT_INITIATED ============

export interface OnSettlementInitiatedMessageContent {
  settlement: Settlement;
}

export type OnSettlementInitiatedMessage = BecknMessage<OnSettlementInitiatedMessageContent>;

// ============ ON_SETTLEMENT_PENDING ============

export interface OnSettlementPendingMessageContent {
  settlement: Settlement;
}

export type OnSettlementPendingMessage = BecknMessage<OnSettlementPendingMessageContent>;

// ============ ON_SETTLEMENT_SETTLED ============

export interface OnSettlementSettledMessageContent {
  settlement: Settlement;
}

export type OnSettlementSettledMessage = BecknMessage<OnSettlementSettledMessageContent>;

// ============ ON_SETTLEMENT_FAILED ============

export interface OnSettlementFailedMessageContent {
  settlement: Settlement;
  error?: {
    code: string;
    message: string;
  };
}

export type OnSettlementFailedMessage = BecknMessage<OnSettlementFailedMessageContent>;
