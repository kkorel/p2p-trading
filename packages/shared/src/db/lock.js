"use strict";
/**
 * Distributed Locking Module using Redlock
 * Provides safe concurrent access to shared resources
 *
 * Note: For single Redis instance, Redlock provides basic distributed locking.
 * For production with multiple Redis instances, configure additional clients.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsufficientBlocksError = exports.LockAcquisitionError = exports.LOCK_KEYS = exports.LOCK_CONFIG = void 0;
exports.getRedlock = getRedlock;
exports.acquireLock = acquireLock;
exports.withLock = withLock;
exports.withOfferLock = withOfferLock;
exports.withOrderLock = withOrderLock;
exports.withTransactionLock = withTransactionLock;
exports.tryAcquireLock = tryAcquireLock;
exports.isLocked = isLocked;
exports.releaseAllLocks = releaseAllLocks;
const redlock_1 = __importStar(require("redlock"));
const redis_1 = require("./redis");
// Lock configuration
exports.LOCK_CONFIG = {
    // Default lock TTL in milliseconds
    defaultTTL: 30000, // 30 seconds
    // Retry configuration - more lenient for single-instance Redis
    retryCount: 5,
    retryDelay: 100, // ms between retries
    retryJitter: 50, // random jitter added to retry delay
    // Auto-extend configuration
    autoExtendThreshold: 500, // Extend lock if less than this many ms remaining
};
// Lock key patterns
exports.LOCK_KEYS = {
    offer: (id) => `lock:offer:${id}`,
    order: (id) => `lock:order:${id}`,
    transaction: (id) => `lock:txn:${id}`,
    block: (id) => `lock:block:${id}`,
};
// Create Redlock instance
let redlock = null;
/**
 * Get or create the Redlock instance
 */
function getRedlock() {
    if (!redlock) {
        redlock = new redlock_1.default(
        // Use the existing Redis client
        [redis_1.redis], {
            // Retry configuration - reduced for single-instance
            retryCount: exports.LOCK_CONFIG.retryCount,
            retryDelay: exports.LOCK_CONFIG.retryDelay,
            retryJitter: exports.LOCK_CONFIG.retryJitter,
            // Automatically extend locks
            automaticExtensionThreshold: exports.LOCK_CONFIG.autoExtendThreshold,
            // For single-instance, we don't need strict quorum
            // driftFactor is used for clock drift compensation
        });
        // Handle errors - don't log expected errors during normal operation
        redlock.on('error', (error) => {
            // Ignore resource locked errors - they're expected during contention
            if (error instanceof redlock_1.ResourceLockedError) {
                return;
            }
            // Log other errors but don't crash
            if (!(error instanceof redlock_1.ExecutionError)) {
                console.error('Redlock error:', error);
            }
        });
    }
    return redlock;
}
/**
 * Custom error for lock acquisition failures
 */
class LockAcquisitionError extends Error {
    constructor(resource, cause) {
        super(`Failed to acquire lock for resource: ${resource}`);
        this.name = 'LockAcquisitionError';
        this.cause = cause;
    }
}
exports.LockAcquisitionError = LockAcquisitionError;
/**
 * Custom error for insufficient blocks
 */
class InsufficientBlocksError extends Error {
    requested;
    available;
    constructor(requested, available) {
        super(`Insufficient blocks: requested ${requested}, available ${available}`);
        this.name = 'InsufficientBlocksError';
        this.requested = requested;
        this.available = available;
    }
}
exports.InsufficientBlocksError = InsufficientBlocksError;
/**
 * Acquire a lock for a resource
 */
async function acquireLock(resource, ttl = exports.LOCK_CONFIG.defaultTTL) {
    const lock = getRedlock();
    return lock.acquire([resource], ttl);
}
/**
 * Execute a function while holding a lock on a resource
 * Automatically handles lock acquisition and release
 */
async function withLock(resource, fn, ttl = exports.LOCK_CONFIG.defaultTTL) {
    const lock = getRedlock();
    return lock.using([resource], ttl, async (signal) => {
        // Check if lock was aborted before executing
        if (signal.aborted) {
            throw new LockAcquisitionError(resource);
        }
        return fn();
    });
}
/**
 * Execute a function while holding a lock on an offer
 * Use this when claiming or modifying offer blocks
 */
async function withOfferLock(offerId, fn, ttl = exports.LOCK_CONFIG.defaultTTL) {
    return withLock(exports.LOCK_KEYS.offer(offerId), fn, ttl);
}
/**
 * Execute a function while holding a lock on an order
 * Use this when modifying order status
 */
async function withOrderLock(orderId, fn, ttl = exports.LOCK_CONFIG.defaultTTL) {
    return withLock(exports.LOCK_KEYS.order(orderId), fn, ttl);
}
/**
 * Execute a function while holding a lock on a transaction
 * Use this for operations that span the entire transaction lifecycle
 */
async function withTransactionLock(transactionId, fn, ttl = exports.LOCK_CONFIG.defaultTTL) {
    return withLock(exports.LOCK_KEYS.transaction(transactionId), fn, ttl);
}
/**
 * Try to acquire a lock, returning null if the resource is already locked
 * Useful for non-blocking lock attempts
 */
async function tryAcquireLock(resource, ttl = exports.LOCK_CONFIG.defaultTTL) {
    try {
        const lock = getRedlock();
        // Use a single retry attempt for non-blocking
        const singleTryRedlock = new redlock_1.default([redis_1.redis], {
            retryCount: 0,
            retryDelay: 0,
        });
        return await singleTryRedlock.acquire([resource], ttl);
    }
    catch (error) {
        if (error instanceof redlock_1.ResourceLockedError) {
            return null;
        }
        throw error;
    }
}
/**
 * Check if a resource is currently locked (non-authoritative)
 * Note: This is a best-effort check and may have race conditions
 */
async function isLocked(resource) {
    const lock = await tryAcquireLock(resource, 100);
    if (lock) {
        // We got the lock, release it and return false
        await lock.release();
        return false;
    }
    return true;
}
/**
 * Release all locks (for cleanup during shutdown)
 */
async function releaseAllLocks() {
    if (redlock) {
        // Redlock doesn't have a built-in release all, but we can
        // let existing locks expire naturally on shutdown
        redlock = null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImxvY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBaUNILGdDQWlDQztBQStCRCxrQ0FNQztBQU1ELDRCQWVDO0FBTUQsc0NBTUM7QUFNRCxzQ0FNQztBQU1ELGtEQU1DO0FBTUQsd0NBa0JDO0FBTUQsNEJBUUM7QUFLRCwwQ0FNQztBQS9NRCxtREFBNkU7QUFDN0UsbUNBQWdDO0FBRWhDLHFCQUFxQjtBQUNSLFFBQUEsV0FBVyxHQUFHO0lBQ3pCLG1DQUFtQztJQUNuQyxVQUFVLEVBQUUsS0FBSyxFQUFFLGFBQWE7SUFFaEMsK0RBQStEO0lBQy9ELFVBQVUsRUFBRSxDQUFDO0lBQ2IsVUFBVSxFQUFFLEdBQUcsRUFBRSxxQkFBcUI7SUFDdEMsV0FBVyxFQUFFLEVBQUUsRUFBRSxxQ0FBcUM7SUFFdEQsNEJBQTRCO0lBQzVCLG1CQUFtQixFQUFFLEdBQUcsRUFBRSxrREFBa0Q7Q0FDN0UsQ0FBQztBQUVGLG9CQUFvQjtBQUNQLFFBQUEsU0FBUyxHQUFHO0lBQ3ZCLEtBQUssRUFBRSxDQUFDLEVBQVUsRUFBRSxFQUFFLENBQUMsY0FBYyxFQUFFLEVBQUU7SUFDekMsS0FBSyxFQUFFLENBQUMsRUFBVSxFQUFFLEVBQUUsQ0FBQyxjQUFjLEVBQUUsRUFBRTtJQUN6QyxXQUFXLEVBQUUsQ0FBQyxFQUFVLEVBQUUsRUFBRSxDQUFDLFlBQVksRUFBRSxFQUFFO0lBQzdDLEtBQUssRUFBRSxDQUFDLEVBQVUsRUFBRSxFQUFFLENBQUMsY0FBYyxFQUFFLEVBQUU7Q0FDMUMsQ0FBQztBQUVGLDBCQUEwQjtBQUMxQixJQUFJLE9BQU8sR0FBbUIsSUFBSSxDQUFDO0FBRW5DOztHQUVHO0FBQ0gsU0FBZ0IsVUFBVTtJQUN4QixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDYixPQUFPLEdBQUcsSUFBSSxpQkFB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Q0FBQyxDQUFDO0lBQ2pELElBQUksSUFBSSxFQUFFLENBQUM7UUFDVCwrQ0FBK0M7UUFDL0MsTUFBTSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDckIsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQ7O0dBRUc7QUFDSSxLQUFLLFVBQVUsZUFBZTtJQUNuQyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ1osMERBQTBEO1FBQzFELGtEQUFrRDtRQUNsRCxPQUFPLEdBQUcsSUFBSSxDQUFDO0lBQ2pCLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBEaXN0cmlidXRlZCBMb2NraW5nIE1vZHVsZSB1c2luZyBSZWRsb2NrXG4gKiBQcm92aWRlcyBzYWZlIGNvbmN1cnJlbnQgYWNjZXNzIHRvIHNoYXJlZCByZXNvdXJjZXNcbiAqIFxuICogTm90ZTogRm9yIHNpbmdsZSBSZWRpcyBpbnN0YW5jZSwgUmVkbG9jayBwcm92aWRlcyBiYXNpYyBkaXN0cmlidXRlZCBsb2NraW5nLlxuICogRm9yIHByb2R1Y3Rpb24gd2l0aCBtdWx0aXBsZSBSZWRpcyBpbnN0YW5jZXMsIGNvbmZpZ3VyZSBhZGRpdGlvbmFsIGNsaWVudHMuXG4gKi9cblxuaW1wb3J0IFJlZGxvY2ssIHsgTG9jaywgUmVzb3VyY2VMb2NrZWRFcnJvciwgRXhlY3V0aW9uRXJyb3IgfSBmcm9tICdyZWRsb2NrJztcbmltcG9ydCB7IHJlZGlzIH0gZnJvbSAnLi9yZWRpcyc7XG5cbi8vIExvY2sgY29uZmlndXJhdGlvblxuZXhwb3J0IGNvbnN0IExPQ0tfQ09ORklHID0ge1xuICAvLyBEZWZhdWx0IGxvY2sgVFRMIGluIG1pbGxpc2Vjb25kc1xuICBkZWZhdWx0VFRMOiAzMDAwMCwgLy8gMzAgc2Vjb25kc1xuICBcbiAgLy8gUmV0cnkgY29uZmlndXJhdGlvbiAtIG1vcmUgbGVuaWVudCBmb3Igc2luZ2xlLWluc3RhbmNlIFJlZGlzXG4gIHJldHJ5Q291bnQ6IDUsXG4gIHJldHJ5RGVsYXk6IDEwMCwgLy8gbXMgYmV0d2VlbiByZXRyaWVzXG4gIHJldHJ5Sml0dGVyOiA1MCwgLy8gcmFuZG9tIGppdHRlciBhZGRlZCB0byByZXRyeSBkZWxheVxuICBcbiAgLy8gQXV0by1leHRlbmQgY29uZmlndXJhdGlvblxuICBhdXRvRXh0ZW5kVGhyZXNob2xkOiA1MDAsIC8vIEV4dGVuZCBsb2NrIGlmIGxlc3MgdGhhbiB0aGlzIG1hbnkgbXMgcmVtYWluaW5nXG59O1xuXG4vLyBMb2NrIGtleSBwYXR0ZXJuc1xuZXhwb3J0IGNvbnN0IExPQ0tfS0VZUyA9IHtcbiAgb2ZmZXI6IChpZDogc3RyaW5nKSA9PiBgbG9jazpvZmZlcjoke2lkfWAsXG4gIG9yZGVyOiAoaWQ6IHN0cmluZykgPT4gYGxvY2s6b3JkZXI6JHtpZH1gLFxuICB0cmFuc2FjdGlvbjogKGlkOiBzdHJpbmcpID0+IGBsb2NrOnR4bjoke2lkfWAsXG4gIGJsb2NrOiAoaWQ6IHN0cmluZykgPT4gYGxvY2s6YmxvY2s6JHtpZH1gLFxufTtcblxuLy8gQ3JlYXRlIFJlZGxvY2sgaW5zdGFuY2VcbmxldCByZWRsb2NrOiBSZWRsb2NrIHwgbnVsbCA9IG51bGw7XG5cbi8qKlxuICogR2V0IG9yIGNyZWF0ZSB0aGUgUmVkbG9jayBpbnN0YW5jZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVkbG9jaygpOiBSZWRsb2NrIHtcbiAgaWYgKCFyZWRsb2NrKSB7XG4gICAgcmVkbG9jayA9IG5ldyBSZWRsb2NrKFxuICAgICAgLy8gVXNlIHRoZSBleGlzdGluZyBSZWRpcyBjbGllbnRcbiAgICAgIFtyZWRpc10sXG4gICAgICB7XG4gICAgICAgIC8vIFJldHJ5IGNvbmZpZ3VyYXRpb24gLSByZWR1Y2VkIGZvciBzaW5nbGUtaW5zdGFuY2VcbiAgICAgICAgcmV0cnlDb3VudDogTE9DS19DT05GSUcucmV0cnlDb3VudCxcbiAgICAgICAgcmV0cnlEZWxheTogTE9DS19DT05GSUcucmV0cnlEZWxheSxcbiAgICAgICAgcmV0cnlKaXR0ZXI6IExPQ0tfQ09ORklHLnJldHJ5Sml0dGVyLFxuICAgICAgICBcbiAgICAgICAgLy8gQXV0b21hdGljYWxseSBleHRlbmQgbG9ja3NcbiAgICAgICAgYXV0b21hdGljRXh0ZW5zaW9uVGhyZXNob2xkOiBMT0NLX0NPTkZJRy5hdXRvRXh0ZW5kVGhyZXNob2xkLFxuICAgICAgICBcbiAgICAgICAgLy8gRm9yIHNpbmdsZS1pbnN0YW5jZSwgd2UgZG9uJ3QgbmVlZCBzdHJpY3QgcXVvcnVtXG4gICAgICAgIC8vIGRyaWZ0RmFjdG9yIGlzIHVzZWQgZm9yIGNsb2NrIGRyaWZ0IGNvbXBlbnNhdGlvblxuICAgICAgfVxuICAgICk7XG4gICAgXG4gICAgLy8gSGFuZGxlIGVycm9ycyAtIGRvbid0IGxvZyBleHBlY3RlZCBlcnJvcnMgZHVyaW5nIG5vcm1hbCBvcGVyYXRpb25cbiAgICByZWRsb2NrLm9uKCdlcnJvcicsIChlcnJvcikgPT4ge1xuICAgICAgLy8gSWdub3JlIHJlc291cmNlIGxvY2tlZCBlcnJvcnMgLSB0aGV5J3JlIGV4cGVjdGVkIGR1cmluZyBjb250ZW50aW9uXG4gICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBSZXNvdXJjZUxvY2tlZEVycm9yKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIC8vIExvZyBvdGhlciBlcnJvcnMgYnV0IGRvbid0IGNyYXNoXG4gICAgICBpZiAoIShlcnJvciBpbnN0YW5jZW9mIEV4ZWN1dGlvbkVycm9yKSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdSZWRsb2NrIGVycm9yOicsIGVycm9yKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICBcbiAgcmV0dXJuIHJlZGxvY2s7XG59XG5cbi8qKlxuICogQ3VzdG9tIGVycm9yIGZvciBsb2NrIGFjcXVpc2l0aW9uIGZhaWx1cmVzXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2NrQWNxdWlzaXRpb25FcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IocmVzb3VyY2U6IHN0cmluZywgY2F1c2U/OiBFcnJvcikge1xuICAgIHN1cGVyKGBGYWlsZWQgdG8gYWNxdWlyZSBsb2NrIGZvciByZXNvdXJjZTogJHtyZXNvdXJjZX1gKTtcbiAgICB0aGlzLm5hbWUgPSAnTG9ja0FjcXVpc2l0aW9uRXJyb3InO1xuICAgIHRoaXMuY2F1c2UgPSBjYXVzZTtcbiAgfVxufVxuXG4vKipcbiAqIEN1c3RvbSBlcnJvciBmb3IgaW5zdWZmaWNpZW50IGJsb2Nrc1xuICovXG5leHBvcnQgY2xhc3MgSW5zdWZmaWNpZW50QmxvY2tzRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIHB1YmxpYyByZXF1ZXN0ZWQ6IG51bWJlcjtcbiAgcHVibGljIGF2YWlsYWJsZTogbnVtYmVyO1xuICBcbiAgY29uc3RydWN0b3IocmVxdWVzdGVkOiBudW1iZXIsIGF2YWlsYWJsZTogbnVtYmVyKSB7XG4gICAgc3VwZXIoYEluc3VmZmljaWVudCBibG9ja3M6IHJlcXVlc3RlZCAke3JlcXVlc3RlZH0sIGF2YWlsYWJsZSAke2F2YWlsYWJsZX1gKTtcbiAgICB0aGlzLm5hbWUgPSAnSW5zdWZmaWNpZW50QmxvY2tzRXJyb3InO1xuICAgIHRoaXMucmVxdWVzdGVkID0gcmVxdWVzdGVkO1xuICAgIHRoaXMuYXZhaWxhYmxlID0gYXZhaWxhYmxlO1xuICB9XG59XG5cbi8qKlxuICogQWNxdWlyZSBhIGxvY2sgZm9yIGEgcmVzb3VyY2VcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFjcXVpcmVMb2NrKFxuICByZXNvdXJjZTogc3RyaW5nLFxuICB0dGw6IG51bWJlciA9IExPQ0tfQ09ORklHLmRlZmF1bHRUVExcbik6IFByb21pc2U8TG9jaz4ge1xuICBjb25zdCBsb2NrID0gZ2V0UmVkbG9jaygpO1xuICByZXR1cm4gbG9jay5hY3F1aXJlKFtyZXNvdXJjZV0sIHR0bCk7XG59XG5cbi8qKlxuICogRXhlY3V0ZSBhIGZ1bmN0aW9uIHdoaWxlIGhvbGRpbmcgYSBsb2NrIG9uIGEgcmVzb3VyY2VcbiAqIEF1dG9tYXRpY2FsbHkgaGFuZGxlcyBsb2NrIGFjcXVpc2l0aW9uIGFuZCByZWxlYXNlXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3aXRoTG9jazxUPihcbiAgcmVzb3VyY2U6IHN0cmluZyxcbiAgZm46ICgpID0+IFByb21pc2U8VD4sXG4gIHR0bDogbnVtYmVyID0gTE9DS19DT05GSUcuZGVmYXVsdFRUTFxuKTogUHJvbWlzZTxUPiB7XG4gIGNvbnN0IGxvY2sgPSBnZXRSZWRsb2NrKCk7XG4gIFxuICByZXR1cm4gbG9jay51c2luZyhbcmVzb3VyY2VdLCB0dGwsIGFzeW5jIChzaWduYWwpID0+IHtcbiAgICAvLyBDaGVjayBpZiBsb2NrIHdhcyBhYm9ydGVkIGJlZm9yZSBleGVjdXRpbmdcbiAgICBpZiAoc2lnbmFsLmFib3J0ZWQpIHtcbiAgICAgIHRocm93IG5ldyBMb2NrQWNxdWlzaXRpb25FcnJvcihyZXNvdXJjZSk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBmbigpO1xuICB9KTtcbn1cblxuLyoqXG4gKiBFeGVjdXRlIGEgZnVuY3Rpb24gd2hpbGUgaG9sZGluZyBhIGxvY2sgb24gYW4gb2ZmZXJcbiAqIFVzZSB0aGlzIHdoZW4gY2xhaW1pbmcgb3IgbW9kaWZ5aW5nIG9mZmVyIGJsb2Nrc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd2l0aE9mZmVyTG9jazxUPihcbiAgb2ZmZXJJZDogc3RyaW5nLFxuICBmbjogKCkgPT4gUHJvbWlzZTxUPixcbiAgdHRsOiBudW1iZXIgPSBMT0NLX0NPTkZJRy5kZWZhdWx0VFRMXG4pOiBQcm9taXNlPFQ+IHtcbiAgcmV0dXJuIHdpdGhMb2NrKExPQ0tfS0VZUy5vZmZlcihvZmZlcklkKSwgZm4sIHR0bCk7XG59XG5cbi8qKlxuICogRXhlY3V0ZSBhIGZ1bmN0aW9uIHdoaWxlIGhvbGRpbmcgYSBsb2NrIG9uIGFuIG9yZGVyXG4gKiBVc2UgdGhpcyB3aGVuIG1vZGlmeWluZyBvcmRlciBzdGF0dXNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdpdGhPcmRlckxvY2s8VD4oXG4gIG9yZGVySWQ6IHN0cmluZyxcbiAgZm46ICgpID0+IFByb21pc2U8VD4sXG4gIHR0bDogbnVtYmVyID0gTE9DS19DT05GSUcuZGVmYXVsdFRUTFxuKTogUHJvbWlzZTxUPiB7XG4gIHJldHVybiB3aXRoTG9jayhMT0NLX0tFWVMub3JkZXIob3JkZXJJZCksIGZuLCB0dGwpO1xufVxuXG4vKipcbiAqIEV4ZWN1dGUgYSBmdW5jdGlvbiB3aGlsZSBob2xkaW5nIGEgbG9jayBvbiBhIHRyYW5zYWN0aW9uXG4gKiBVc2UgdGhpcyBmb3Igb3BlcmF0aW9ucyB0aGF0IHNwYW4gdGhlIGVudGlyZSB0cmFuc2FjdGlvbiBsaWZlY3ljbGVcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdpdGhUcmFuc2FjdGlvbkxvY2s8VD4oXG4gIHRyYW5zYWN0aW9uSWQ6IHN0cmluZyxcbiAgZm46ICgpID0+IFByb21pc2U8VD4sXG4gIHR0bDogbnVtYmVyID0gTE9DS19DT05GSUcuZGVmYXVsdFRUTFxuKTogUHJvbWlzZTxUPiB7XG4gIHJldHVybiB3aXRoTG9jayhMT0NLX0tFWVMudHJhbnNhY3Rpb24odHJhbnNhY3Rpb25JZCksIGZuLCB0dGwpO1xufVxuXG4vKipcbiAqIFRyeSB0byBhY3F1aXJlIGEgbG9jaywgcmV0dXJuaW5nIG51bGwgaWYgdGhlIHJlc291cmNlIGlzIGFscmVhZHkgbG9ja2VkXG4gKiBVc2VmdWwgZm9yIG5vbi1ibG9ja2luZyBsb2NrIGF0dGVtcHRzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB0cnlBY3F1aXJlTG9jayhcbiAgcmVzb3VyY2U6IHN0cmluZyxcbiAgdHRsOiBudW1iZXIgPSBMT0NLX0NPTkZJRy5kZWZhdWx0VFRMXG4pOiBQcm9taXNlPExvY2sgfCBudWxsPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgbG9jayA9IGdldFJlZGxvY2soKTtcbiAgICAvLyBVc2UgYSBzaW5nbGUgcmV0cnkgYXR0ZW1wdCBmb3Igbm9uLWJsb2NraW5nXG4gICAgY29uc3Qgc2luZ2xlVHJ5UmVkbG9jayA9IG5ldyBSZWRsb2NrKFtyZWRpc10sIHtcbiAgICAgIHJldHJ5Q291bnQ6IDAsXG4gICAgICByZXRyeURlbGF5OiAwLFxuICAgIH0pO1xuICAgIHJldHVybiBhd2FpdCBzaW5nbGVUcnlSZWRsb2NrLmFjcXVpcmUoW3Jlc291cmNlXSwgdHRsKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBSZXNvdXJjZUxvY2tlZEVycm9yKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuLyoqXG4gKiBDaGVjayBpZiBhIHJlc291cmNlIGlzIGN1cnJlbnRseSBsb2NrZWQgKG5vbi1hdXRob3JpdGF0aXZlKVxuICogTm90ZTogVGhpcyBpcyBhIGJlc3QtZWZmb3J0IGNoZWNrIGFuZCBtYXkgaGF2ZSByYWNlIGNvbmRpdGlvbnNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGlzTG9ja2VkKHJlc291cmNlOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgbG9jayA9IGF3YWl0IHRyeUFjcXVpcmVMb2NrKHJlc291cmNlLCAxMDApO1xuICBpZiAobG9jaykge1xuICAgIC8vIFdlIGdvdCB0aGUgbG9jaywgcmVsZWFzZSBpdCBhbmQgcmV0dXJuIGZhbHNlXG4gICAgYXdhaXQgbG9jay5yZWxlYXNlKCk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIFJlbGVhc2UgYWxsIGxvY2tzIChmb3IgY2xlYW51cCBkdXJpbmcgc2h1dGRvd24pXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWxlYXNlQWxsTG9ja3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChyZWRsb2NrKSB7XG4gICAgLy8gUmVkbG9jayBkb2Vzbid0IGhhdmUgYSBidWlsdC1pbiByZWxlYXNlIGFsbCwgYnV0IHdlIGNhblxuICAgIC8vIGxldCBleGlzdGluZyBsb2NrcyBleHBpcmUgbmF0dXJhbGx5IG9uIHNodXRkb3duXG4gICAgcmVkbG9jayA9IG51bGw7XG4gIH1cbn1cblxuLy8gRXhwb3J0IHR5cGVzXG5leHBvcnQgdHlwZSB7IExvY2ssIFJlc291cmNlTG9ja2VkRXJyb3IgfTtcbiJdfQ==