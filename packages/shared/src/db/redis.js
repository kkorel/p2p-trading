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
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = exports.REDIS_TTL = exports.REDIS_KEYS = void 0;
exports.checkRedisConnection = checkRedisConnection;
exports.connectRedis = connectRedis;
exports.disconnectRedis = disconnectRedis;
exports.createTransactionState = createTransactionState;
exports.getTransactionState = getTransactionState;
exports.updateTransactionState = updateTransactionState;
exports.getAllTransactionStates = getAllTransactionStates;
exports.clearAllTransactionStates = clearAllTransactionStates;
exports.isMessageProcessed = isMessageProcessed;
exports.markMessageProcessed = markMessageProcessed;

const ioredis_1 = require("ioredis");

exports.REDIS_KEYS = {
    transaction: (id) => `txn:${id}`,
    allTransactions: 'txn:all',
    processedMessage: (messageId, direction) => `msg:${direction}:${messageId}`,
};

exports.REDIS_TTL = {
    transaction: 24 * 60 * 60,
    processedMessage: 7 * 24 * 60 * 60,
};

const createRedisClient = () => {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const client = new ioredis_1.default(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
            if (times > 10) {
                return null;
            }
            return Math.min(times * 100, 3000);
        },
        lazyConnect: true,
    });
    client.on('error', (err) => {
        console.error('Redis connection error:', err);
    });
    client.on('connect', () => {
        console.log('Redis connected');
    });
    return client;
};

exports.redis = globalThis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
    globalThis.redis = exports.redis;
}

function checkRedisConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const pong = yield exports.redis.ping();
            return pong === 'PONG';
        }
        catch (error) {
            console.error('Redis connection check failed:', error);
            return false;
        }
    });
}

function connectRedis() {
    return __awaiter(this, void 0, void 0, function* () {
        if (exports.redis.status !== 'ready') {
            yield exports.redis.connect();
        }
    });
}

function disconnectRedis() {
    return __awaiter(this, void 0, void 0, function* () {
        yield exports.redis.quit();
    });
}

function createTransactionState(transactionId) {
    return __awaiter(this, void 0, void 0, function* () {
        const now = new Date().toISOString();
        const state = {
            transaction_id: transactionId,
            status: 'DISCOVERING',
            created_at: now,
            updated_at: now,
        };
        const key = exports.REDIS_KEYS.transaction(transactionId);
        yield exports.redis.set(key, JSON.stringify(state), 'EX', exports.REDIS_TTL.transaction);
        yield exports.redis.sadd(exports.REDIS_KEYS.allTransactions, transactionId);
        return state;
    });
}

function getTransactionState(transactionId) {
    return __awaiter(this, void 0, void 0, function* () {
        const key = exports.REDIS_KEYS.transaction(transactionId);
        const data = yield exports.redis.get(key);
        if (!data) {
            return null;
        }
        return JSON.parse(data);
    });
}

function updateTransactionState(transactionId, updates) {
    return __awaiter(this, void 0, void 0, function* () {
        const key = exports.REDIS_KEYS.transaction(transactionId);
        const data = yield exports.redis.get(key);
        if (!data) {
            return null;
        }
        const state = JSON.parse(data);
        const updatedState = Object.assign(Object.assign(Object.assign({}, state), updates), { updated_at: new Date().toISOString() });
        yield exports.redis.set(key, JSON.stringify(updatedState), 'EX', exports.REDIS_TTL.transaction);
        return updatedState;
    });
}

function getAllTransactionStates() {
    return __awaiter(this, void 0, void 0, function* () {
        const transactionIds = yield exports.redis.smembers(exports.REDIS_KEYS.allTransactions);
        if (transactionIds.length === 0) {
            return [];
        }
        const keys = transactionIds.map(id => exports.REDIS_KEYS.transaction(id));
        const values = yield exports.redis.mget(keys);
        const states = [];
        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            if (value) {
                states.push(JSON.parse(value));
            }
            else {
                yield exports.redis.srem(exports.REDIS_KEYS.allTransactions, transactionIds[i]);
            }
        }
        return states;
    });
}

function clearAllTransactionStates() {
    return __awaiter(this, void 0, void 0, function* () {
        const transactionIds = yield exports.redis.smembers(exports.REDIS_KEYS.allTransactions);
        if (transactionIds.length > 0) {
            const keys = transactionIds.map(id => exports.REDIS_KEYS.transaction(id));
            yield exports.redis.del(...keys);
        }
        yield exports.redis.del(exports.REDIS_KEYS.allTransactions);
    });
}

function isMessageProcessed(messageId, direction = 'INBOUND') {
    return __awaiter(this, void 0, void 0, function* () {
        const key = exports.REDIS_KEYS.processedMessage(messageId, direction);
        const exists = yield exports.redis.exists(key);
        return exists === 1;
    });
}

function markMessageProcessed(messageId, direction = 'INBOUND') {
    return __awaiter(this, void 0, void 0, function* () {
        const key = exports.REDIS_KEYS.processedMessage(messageId, direction);
        yield exports.redis.set(key, '1', 'EX', exports.REDIS_TTL.processedMessage);
    });
}
