/**
 * Distributed Locking Module using Redlock
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

export declare function getRedlock(): Redlock;

export declare class LockAcquisitionError extends Error {
    constructor(resource: string, cause?: Error);
}

export declare class InsufficientBlocksError extends Error {
    requested: number;
    available: number;
    constructor(requested: number, available: number);
}

export declare function acquireLock(resource: string, ttl?: number): Promise<Lock>;

export declare function withLock<T>(resource: string, fn: () => Promise<T>, ttl?: number): Promise<T>;

export declare function withOfferLock<T>(offerId: string, fn: () => Promise<T>, ttl?: number): Promise<T>;

export declare function withOrderLock<T>(orderId: string, fn: () => Promise<T>, ttl?: number): Promise<T>;

export declare function withTransactionLock<T>(transactionId: string, fn: () => Promise<T>, ttl?: number): Promise<T>;

export declare function tryAcquireLock(resource: string, ttl?: number): Promise<Lock | null>;

export declare function isLocked(resource: string): Promise<boolean>;

export declare function releaseAllLocks(): Promise<void>;

export type { Lock, ResourceLockedError };
