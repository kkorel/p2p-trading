"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCK_KEYS = exports.LOCK_CONFIG = void 0;
exports.getRedlock = getRedlock;
exports.acquireLock = acquireLock;
exports.withLock = withLock;
exports.withOfferLock = withOfferLock;
exports.withOrderLock = withOrderLock;
exports.withTransactionLock = withTransactionLock;
exports.tryAcquireLock = tryAcquireLock;
exports.isLocked = isLocked;
exports.releaseAllLocks = releaseAllLocks;
exports.LockAcquisitionError = void 0;
exports.InsufficientBlocksError = void 0;
const redlock_1 = __importDefault(require("redlock"));
const redis_1 = require("./redis");
// Lock configuration
exports.LOCK_CONFIG = {
    defaultTTL: 30000,
    retryCount: 10,
    retryDelay: 200,
    retryJitter: 100,
    autoExtendThreshold: 500,
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
function getRedlock() {
    if (!redlock) {
        redlock = new redlock_1.default([redis_1.redis], {
            retryCount: exports.LOCK_CONFIG.retryCount,
            retryDelay: exports.LOCK_CONFIG.retryDelay,
            retryJitter: exports.LOCK_CONFIG.retryJitter,
            automaticExtensionThreshold: exports.LOCK_CONFIG.autoExtendThreshold,
        });
        redlock.on('error', (error) => {
            if (error instanceof redlock_1.ResourceLockedError) {
                return;
            }
            console.error('Redlock error:', error);
        });
    }
    return redlock;
}
class LockAcquisitionError extends Error {
    constructor(resource, cause) {
        super(`Failed to acquire lock for resource: ${resource}`);
        this.name = 'LockAcquisitionError';
        this.cause = cause;
    }
}
exports.LockAcquisitionError = LockAcquisitionError;
class InsufficientBlocksError extends Error {
    constructor(requested, available) {
        super(`Insufficient blocks: requested ${requested}, available ${available}`);
        this.name = 'InsufficientBlocksError';
        this.requested = requested;
        this.available = available;
    }
}
exports.InsufficientBlocksError = InsufficientBlocksError;
function acquireLock(resource, ttl = exports.LOCK_CONFIG.defaultTTL) {
    return __awaiter(this, void 0, void 0, function* () {
        const lock = getRedlock();
        return lock.acquire([resource], ttl);
    });
}
function withLock(resource, fn, ttl = exports.LOCK_CONFIG.defaultTTL) {
    return __awaiter(this, void 0, void 0, function* () {
        const lock = getRedlock();
        return lock.using([resource], ttl, (signal) => __awaiter(this, void 0, void 0, function* () {
            if (signal.aborted) {
                throw new LockAcquisitionError(resource);
            }
            return fn();
        }));
    });
}
function withOfferLock(offerId, fn, ttl = exports.LOCK_CONFIG.defaultTTL) {
    return __awaiter(this, void 0, void 0, function* () {
        return withLock(exports.LOCK_KEYS.offer(offerId), fn, ttl);
    });
}
function withOrderLock(orderId, fn, ttl = exports.LOCK_CONFIG.defaultTTL) {
    return __awaiter(this, void 0, void 0, function* () {
        return withLock(exports.LOCK_KEYS.order(orderId), fn, ttl);
    });
}
function withTransactionLock(transactionId, fn, ttl = exports.LOCK_CONFIG.defaultTTL) {
    return __awaiter(this, void 0, void 0, function* () {
        return withLock(exports.LOCK_KEYS.transaction(transactionId), fn, ttl);
    });
}
function tryAcquireLock(resource, ttl = exports.LOCK_CONFIG.defaultTTL) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const singleTryRedlock = new redlock_1.default([redis_1.redis], {
                retryCount: 0,
                retryDelay: 0,
            });
            return yield singleTryRedlock.acquire([resource], ttl);
        }
        catch (error) {
            if (error instanceof redlock_1.ResourceLockedError) {
                return null;
            }
            throw error;
        }
    });
}
function isLocked(resource) {
    return __awaiter(this, void 0, void 0, function* () {
        const lock = yield tryAcquireLock(resource, 100);
        if (lock) {
            yield lock.release();
            return false;
        }
        return true;
    });
}
function releaseAllLocks() {
    return __awaiter(this, void 0, void 0, function* () {
        if (redlock) {
            redlock = null;
        }
    });
}
