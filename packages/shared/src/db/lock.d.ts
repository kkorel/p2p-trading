/**
 * Distributed Locking Module using Redlock
 * Provides safe concurrent access to shared resources
 *
 * Note: For single Redis instance, Redlock provides basic distributed locking.
 * For production with multiple Redis instances, configure additional clients.
 */
import Redlock, { Lock, ResourceLockedError } from 'redlock';
export declare const LOCK_CONFIG: {
    defaultTTL: number;
    retryCount: number;
    retryDelay: number;
    retryJitter: number;
    autoExtendThreshold: number;
};
export declare const LOCK_KEYS: {
    offer: (id: string) => string;
    order: (id: string) => string;
    transaction: (id: string) => string;
    block: (id: string) => string;
};
/**
 * Get or create the Redlock instance
 */
export declare function getRedlock(): Redlock;
/**
 * Custom error for lock acquisition failures
 */
export declare class LockAcquisitionError extends Error {
    constructor(resource: string, cause?: Error);
}
/**
 * Custom error for insufficient blocks
 */
export declare class InsufficientBlocksError extends Error {
    requested: number;
    available: number;
    constructor(requested: number, available: number);
}
/**
 * Acquire a lock for a resource
 */
export declare function acquireLock(resource: string, ttl?: number): Promise<Lock>;
/**
 * Execute a function while holding a lock on a resource
 * Automatically handles lock acquisition and release
 */
export declare function withLock<T>(resource: string, fn: () => Promise<T>, ttl?: number): Promise<T>;
/**
 * Execute a function while holding a lock on an offer
 * Use this when claiming or modifying offer blocks
 */
export declare function withOfferLock<T>(offerId: string, fn: () => Promise<T>, ttl?: number): Promise<T>;
/**
 * Execute a function while holding a lock on an order
 * Use this when modifying order status
 */
export declare function withOrderLock<T>(orderId: string, fn: () => Promise<T>, ttl?: number): Promise<T>;
/**
 * Execute a function while holding a lock on a transaction
 * Use this for operations that span the entire transaction lifecycle
 */
export declare function withTransactionLock<T>(transactionId: string, fn: () => Promise<T>, ttl?: number): Promise<T>;
/**
 * Try to acquire a lock, returning null if the resource is already locked
 * Useful for non-blocking lock attempts
 */
export declare function tryAcquireLock(resource: string, ttl?: number): Promise<Lock | null>;
/**
 * Check if a resource is currently locked (non-authoritative)
 * Note: This is a best-effort check and may have race conditions
 */
export declare function isLocked(resource: string): Promise<boolean>;
/**
 * Release all locks (for cleanup during shutdown)
 */
export declare function releaseAllLocks(): Promise<void>;
export type { Lock, ResourceLockedError };
