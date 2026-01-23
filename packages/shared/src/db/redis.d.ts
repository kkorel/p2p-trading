/**
 * Redis Client Module
 * Provides connection management, transaction state caching, and message deduplication
 */
import Redis from 'ioredis';
declare global {
    var redis: Redis | undefined;
}
export declare const REDIS_KEYS: {
    transaction: (id: string) => string;
    allTransactions: string;
    processedMessage: (messageId: string, direction: string) => string;
};
export declare const REDIS_TTL: {
    transaction: number;
    processedMessage: number;
};
export declare const redis: any;
/**
 * Check if Redis is connected
 */
export declare function checkRedisConnection(): Promise<boolean>;
/**
 * Connect Redis client explicitly
 */
export declare function connectRedis(): Promise<void>;
/**
 * Disconnect Redis client (for graceful shutdown)
 */
export declare function disconnectRedis(): Promise<void>;
export interface TransactionState {
    transaction_id: string;
    catalog?: any;
    selectedOffer?: any;
    selectedQuantity?: number;
    providers?: Record<string, any>;
    order?: any;
    discoveryCriteria?: any;
    matchingResults?: any;
    excludeProviderId?: string | null;
    buyerId?: string | null;
    error?: string;
    status: 'DISCOVERING' | 'SELECTING' | 'INITIALIZING' | 'CONFIRMING' | 'ACTIVE' | 'COMPLETED';
    created_at: string;
    updated_at: string;
}
/**
 * Create a new transaction state in Redis
 */
export declare function createTransactionState(transactionId: string): Promise<TransactionState>;
/**
 * Get transaction state from Redis
 */
export declare function getTransactionState(transactionId: string): Promise<TransactionState | null>;
/**
 * Update transaction state in Redis
 */
export declare function updateTransactionState(transactionId: string, updates: Partial<Omit<TransactionState, 'transaction_id' | 'created_at'>>): Promise<TransactionState | null>;
/**
 * Get all transaction states from Redis
 */
export declare function getAllTransactionStates(): Promise<TransactionState[]>;
/**
 * Clear all transaction states from Redis
 */
export declare function clearAllTransactionStates(): Promise<void>;
/**
 * Check if a message has already been processed (for deduplication)
 */
export declare function isMessageProcessed(messageId: string, direction?: string): Promise<boolean>;
/**
 * Mark a message as processed
 */
export declare function markMessageProcessed(messageId: string, direction?: string): Promise<void>;
export type { Redis };
