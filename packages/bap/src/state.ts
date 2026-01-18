/**
 * In-memory state for tracking ongoing transactions
 * In production, this would be persisted to the database
 */

import { Catalog, CatalogOffer, Provider, Order, TimeWindow, SourceType, DeliveryMode } from '@p2p/shared';

interface DiscoveryCriteria {
  sourceType?: SourceType;
  deliveryMode?: DeliveryMode;
  minQuantity?: number;
  timeWindow?: TimeWindow;
}

interface MatchingResult {
  selectedOffer: {
    offer: CatalogOffer;
    score: number;
    breakdown: {
      priceScore: number;
      trustScore: number;
      timeScore: number;
    };
  } | null;
  allOffers: Array<{
    offer: CatalogOffer;
    score: number;
    breakdown: {
      priceScore: number;
      trustScore: number;
      timeScore: number;
    };
  }>;
  reason?: string;
}

interface TransactionState {
  transaction_id: string;
  catalog?: Catalog;
  selectedOffer?: CatalogOffer;
  selectedQuantity?: number; // The quantity the buyer wants to purchase
  providers?: Map<string, Provider>;
  order?: Order;
  discoveryCriteria?: DiscoveryCriteria;
  matchingResults?: MatchingResult | null;
  status: 'DISCOVERING' | 'SELECTING' | 'INITIALIZING' | 'CONFIRMING' | 'ACTIVE' | 'COMPLETED';
  created_at: string;
  updated_at: string;
}

const transactions = new Map<string, TransactionState>();

export function createTransaction(transaction_id: string): TransactionState {
  const now = new Date().toISOString();
  const state: TransactionState = {
    transaction_id,
    status: 'DISCOVERING',
    created_at: now,
    updated_at: now,
  };
  transactions.set(transaction_id, state);
  return state;
}

export function getTransaction(transaction_id: string): TransactionState | undefined {
  return transactions.get(transaction_id);
}

export function updateTransaction(
  transaction_id: string, 
  updates: Partial<Omit<TransactionState, 'transaction_id' | 'created_at'>>
): TransactionState | undefined {
  const state = transactions.get(transaction_id);
  if (!state) return undefined;
  
  Object.assign(state, updates, { updated_at: new Date().toISOString() });
  return state;
}

export function getAllTransactions(): TransactionState[] {
  return Array.from(transactions.values());
}

/**
 * Clear all in-memory transactions
 */
export function clearAllTransactions(): void {
  transactions.clear();
}
