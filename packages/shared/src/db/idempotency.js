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
exports.IDEMPOTENCY_KEYS = exports.IDEMPOTENCY_CONFIG = void 0;
exports.checkIdempotencyKey = checkIdempotencyKey;
exports.startIdempotentRequest = startIdempotentRequest;
exports.storeIdempotencyResponse = storeIdempotencyResponse;
exports.releaseIdempotencyLock = releaseIdempotencyLock;
exports.deleteIdempotencyKey = deleteIdempotencyKey;
exports.createIdempotencyMiddleware = createIdempotencyMiddleware;
exports.withIdempotency = withIdempotency;
const redis_1 = require("./redis");

exports.IDEMPOTENCY_CONFIG = {
    keyTTL: 24 * 60 * 60,
    keyPrefix: 'idem',
};

exports.IDEMPOTENCY_KEYS = {
    key: (endpoint, idempotencyKey) => `${exports.IDEMPOTENCY_CONFIG.keyPrefix}:${endpoint}:${idempotencyKey}`,
    lock: (endpoint, idempotencyKey) => `${exports.IDEMPOTENCY_CONFIG.keyPrefix}:lock:${endpoint}:${idempotencyKey}`,
};

function checkIdempotencyKey(endpoint, idempotencyKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const key = exports.IDEMPOTENCY_KEYS.key(endpoint, idempotencyKey);
        const lockKey = exports.IDEMPOTENCY_KEYS.lock(endpoint, idempotencyKey);
        const cached = yield redis_1.redis.get(key);
        if (cached) {
            try {
                const response = JSON.parse(cached);
                return { found: true, response };
            }
            catch (_a) {
                yield redis_1.redis.del(key);
            }
        }
        const isProcessing = yield redis_1.redis.exists(lockKey);
        if (isProcessing) {
            return { found: false, isProcessing: true };
        }
        return { found: false, isProcessing: false };
    });
}

function startIdempotentRequest(endpoint, idempotencyKey, lockTTL = 30) {
    return __awaiter(this, void 0, void 0, function* () {
        const lockKey = exports.IDEMPOTENCY_KEYS.lock(endpoint, idempotencyKey);
        const acquired = yield redis_1.redis.set(lockKey, '1', 'EX', lockTTL, 'NX');
        return acquired === 'OK';
    });
}

function storeIdempotencyResponse(endpoint, idempotencyKey, statusCode, body, headers) {
    return __awaiter(this, void 0, void 0, function* () {
        const key = exports.IDEMPOTENCY_KEYS.key(endpoint, idempotencyKey);
        const lockKey = exports.IDEMPOTENCY_KEYS.lock(endpoint, idempotencyKey);
        const response = {
            statusCode,
            body,
            headers,
            createdAt: new Date().toISOString(),
        };
        yield redis_1.redis.multi()
            .set(key, JSON.stringify(response), 'EX', exports.IDEMPOTENCY_CONFIG.keyTTL)
            .del(lockKey)
            .exec();
    });
}

function releaseIdempotencyLock(endpoint, idempotencyKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const lockKey = exports.IDEMPOTENCY_KEYS.lock(endpoint, idempotencyKey);
        yield redis_1.redis.del(lockKey);
    });
}

function deleteIdempotencyKey(endpoint, idempotencyKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const key = exports.IDEMPOTENCY_KEYS.key(endpoint, idempotencyKey);
        const lockKey = exports.IDEMPOTENCY_KEYS.lock(endpoint, idempotencyKey);
        yield redis_1.redis.del(key, lockKey);
    });
}

function createIdempotencyMiddleware(endpoint) {
    return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        const idempotencyKey = req.headers['x-idempotency-key'];
        if (!idempotencyKey) {
            return next();
        }
        const check = yield checkIdempotencyKey(endpoint, idempotencyKey);
        if (check.found && check.response) {
            if (check.response.headers) {
                for (const [key, value] of Object.entries(check.response.headers)) {
                    res.setHeader(key, value);
                }
            }
            res.setHeader('X-Idempotency-Replay', 'true');
            return res.status(check.response.statusCode).json(check.response.body);
        }
        if (check.isProcessing) {
            return res.status(409).json({
                error: 'Request is already being processed',
                code: 'IDEMPOTENCY_CONFLICT',
            });
        }
        const canProcess = yield startIdempotentRequest(endpoint, idempotencyKey);
        if (!canProcess) {
            return res.status(409).json({
                error: 'Request is already being processed',
                code: 'IDEMPOTENCY_CONFLICT',
            });
        }
        const originalJson = res.json.bind(res);
        res.json = (body) => __awaiter(this, void 0, void 0, function* () {
            yield storeIdempotencyResponse(endpoint, idempotencyKey, res.statusCode, body);
            return originalJson(body);
        });
        next();
    });
}

function withIdempotency(endpoint, idempotencyKey, fn) {
    return fn().catch((error) => __awaiter(this, void 0, void 0, function* () {
        yield releaseIdempotencyLock(endpoint, idempotencyKey);
        throw error;
    }));
}
