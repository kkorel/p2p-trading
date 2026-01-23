"use strict";
/**
 * Idempotency Key Support
 * Stores idempotency keys in Redis with cached responses
 * Ensures duplicate requests return the same response
 */
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
// Idempotency key configuration
exports.IDEMPOTENCY_CONFIG = {
    // TTL for idempotency keys in seconds (24 hours)
    keyTTL: 24 * 60 * 60,
    // Key prefix
    keyPrefix: 'idem',
};
// Key patterns
exports.IDEMPOTENCY_KEYS = {
    // idem:{endpoint}:{idempotency_key}
    key: (endpoint, idempotencyKey) => `${exports.IDEMPOTENCY_CONFIG.keyPrefix}:${endpoint}:${idempotencyKey}`,
    // For locking during processing
    lock: (endpoint, idempotencyKey) => `${exports.IDEMPOTENCY_CONFIG.keyPrefix}:lock:${endpoint}:${idempotencyKey}`,
};
/**
 * Check if an idempotency key exists and get cached response
 */
async function checkIdempotencyKey(endpoint, idempotencyKey) {
    const key = exports.IDEMPOTENCY_KEYS.key(endpoint, idempotencyKey);
    const lockKey = exports.IDEMPOTENCY_KEYS.lock(endpoint, idempotencyKey);
    // Check if response exists
    const cached = await redis_1.redis.get(key);
    if (cached) {
        try {
            const response = JSON.parse(cached);
            return { found: true, response };
        }
        catch {
            // Invalid cached data, delete it
            await redis_1.redis.del(key);
        }
    }
    // Check if another request is processing this key
    const isProcessing = await redis_1.redis.exists(lockKey);
    if (isProcessing) {
        return { found: false, isProcessing: true };
    }
    return { found: false, isProcessing: false };
}
/**
 * Start processing an idempotent request
 * Returns true if we should process, false if another request is already processing
 */
async function startIdempotentRequest(endpoint, idempotencyKey, lockTTL = 30 // Lock TTL in seconds
) {
    const lockKey = exports.IDEMPOTENCY_KEYS.lock(endpoint, idempotencyKey);
    // Try to acquire the lock using SET NX (only set if not exists)
    const acquired = await redis_1.redis.set(lockKey, '1', 'EX', lockTTL, 'NX');
    return acquired === 'OK';
}
/**
 * Store the response for an idempotent request
 */
async function storeIdempotencyResponse(endpoint, idempotencyKey, statusCode, body, headers) {
    const key = exports.IDEMPOTENCY_KEYS.key(endpoint, idempotencyKey);
    const lockKey = exports.IDEMPOTENCY_KEYS.lock(endpoint, idempotencyKey);
    const response = {
        statusCode,
        body,
        headers,
        createdAt: new Date().toISOString(),
    };
    // Store the response and release the lock atomically
    await redis_1.redis.multi()
        .set(key, JSON.stringify(response), 'EX', exports.IDEMPOTENCY_CONFIG.keyTTL)
        .del(lockKey)
        .exec();
}
/**
 * Release the processing lock without storing a response
 * Use this when the request fails and shouldn't be cached
 */
async function releaseIdempotencyLock(endpoint, idempotencyKey) {
    const lockKey = exports.IDEMPOTENCY_KEYS.lock(endpoint, idempotencyKey);
    await redis_1.redis.del(lockKey);
}
/**
 * Delete an idempotency key (for testing or manual cleanup)
 */
async function deleteIdempotencyKey(endpoint, idempotencyKey) {
    const key = exports.IDEMPOTENCY_KEYS.key(endpoint, idempotencyKey);
    const lockKey = exports.IDEMPOTENCY_KEYS.lock(endpoint, idempotencyKey);
    await redis_1.redis.del(key, lockKey);
}
/**
 * Express middleware for idempotency key handling
 *
 * Usage:
 * router.post('/endpoint', idempotencyMiddleware('endpoint'), handler)
 *
 * Client sends: X-Idempotency-Key header
 */
function createIdempotencyMiddleware(endpoint) {
    return async (req, res, next) => {
        const idempotencyKey = req.headers['x-idempotency-key'];
        // If no idempotency key provided, proceed normally
        if (!idempotencyKey) {
            return next();
        }
        // Check if we have a cached response
        const check = await checkIdempotencyKey(endpoint, idempotencyKey);
        if (check.found && check.response) {
            // Return cached response
            if (check.response.headers) {
                for (const [key, value] of Object.entries(check.response.headers)) {
                    res.setHeader(key, value);
                }
            }
            res.setHeader('X-Idempotency-Replay', 'true');
            return res.status(check.response.statusCode).json(check.response.body);
        }
        if (check.isProcessing) {
            // Another request is processing this key
            return res.status(409).json({
                error: 'Request is already being processed',
                code: 'IDEMPOTENCY_CONFLICT',
            });
        }
        // Try to start processing
        const canProcess = await startIdempotentRequest(endpoint, idempotencyKey);
        if (!canProcess) {
            // Race condition - another request just started
            return res.status(409).json({
                error: 'Request is already being processed',
                code: 'IDEMPOTENCY_CONFLICT',
            });
        }
        // Store original json method
        const originalJson = res.json.bind(res);
        // Override json to capture and cache the response
        res.json = async (body) => {
            await storeIdempotencyResponse(endpoint, idempotencyKey, res.statusCode, body);
            return originalJson(body);
        };
        // Continue to the handler
        next();
    };
}
/**
 * Helper to wrap an async handler with idempotency support
 * Ensures lock is released on errors
 */
function withIdempotency(endpoint, idempotencyKey, fn) {
    return fn().catch(async (error) => {
        // Release the lock on error
        await releaseIdempotencyLock(endpoint, idempotencyKey);
        throw error;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWRlbXBvdGVuY3kuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpZGVtcG90ZW5jeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7O0FBOENILGtEQTBCQztBQU1ELHdEQVVDO0FBS0QsNERBc0JDO0FBTUQsd0RBTUM7QUFLRCxvREFPQztBQVVELGtFQTBEQztBQU1ELDBDQVVDO0FBN05ELG1DQUFnQztBQUVoQyxnQ0FBZ0M7QUFDbkIsUUFBQSxrQkFBa0IsR0FBRztJQUNoQyxpREFBaUQ7SUFDakQsTUFBTSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRTtJQUVwQixhQUFhO0lBQ2IsU0FBUyxFQUFFLE1BQU07Q0FDbEIsQ0FBQztBQUVGLGVBQWU7QUFDRixRQUFBLGdCQUFnQixHQUFHO0lBQzlCLG9DQUFvQztJQUNwQyxHQUFHLEVBQUUsQ0FBQyxRQUFnQixFQUFFLGNBQXNCLEVBQUUsRUFBRSxDQUNoRCxHQUFHLDBCQUFrQixDQUFDLFNBQVMsSUFBSSxRQUFRLElBQUksY0FBYyxFQUFFO0lBRWpFLGdDQUFnQztJQUNoQyxJQUFJLEVBQUUsQ0FBQyxRQUFnQixFQUFFLGNBQXNCLEVBQUUsRUFBRSxDQUNqRCxHQUFHLDBCQUFrQixDQUFDLFNBQVMsU0FBUyxRQUFRLElBQUksY0FBYyxFQUFFO0NBQ3ZFLENBQUM7QUFxQkY7O0dBRUc7QUFDSSxLQUFLLFVBQVUsbUJBQW1CLENBQ3ZDLFFBQWdCLEVBQ2hCLGNBQXNCO0lBRXRCLE1BQU0sR0FBRyxHQUFHLHdCQUFnQixDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDM0QsTUFBTSxPQUFPLEdBQUcsd0JBQWdCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQztJQUVoRSwyQkFBMkI7SUFDM0IsTUFBTSxNQUFNLEdBQUcsTUFBTSxhQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BDLElBQUksTUFB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dG9yZXMgaWRlbXBvdGVuY3kga2V5cyBpbiBSZWRpcyB3aXRoIGNhY2hlZCByZXNwb25zZXNcbiAqIEVuc3VyZXMgZHVwbGljYXRlIHJlcXVlc3RzIHJldHVybiB0aGUgc2FtZSByZXNwb25zZVxuICovXG5cbmltcG9ydCB7IHJlZGlzIH0gZnJvbSAnLi9yZWRpcyc7XG5cbi8vIElkZW1wb3RlbmN5IGtleSBjb25maWd1cmF0aW9uXG5leHBvcnQgY29uc3QgSURFTVBPVEVOQ1lfQ09ORklHID0ge1xuICAvLyBUVEwgZm9yIGlkZW1wb3RlbmN5IGtleXMgaW4gc2Vjb25kcyAoMjQgaG91cnMpXG4gIGtleVRUTDogMjQgKiA2MCAqIDYwLFxuICBcbiAgLy8gS2V5IHByZWZpeFxuICBrZXlQcmVmaXg6ICdpZGVtJyxcbn07XG5cbi8vIEtleSBwYXR0ZXJuc1xuZXhwb3J0IGNvbnN0IElERU1QT1RFTkNZX0tFWVMgPSB7XG4gIC8vIGlkZW06e2VuZHBvaW50fTp7aWRlbXBvdGVuY3lfa2V5fVxuICBrZXk6IChlbmRwb2ludDogc3RyaW5nLCBpZGVtcG90ZW5jeUtleTogc3RyaW5nKSA9PiBcbiAgICBgJHtJREVNUE9URU5DWV9DT05GSUcua2V5UHJlZml4fToke2VuZHBvaW50fToke2lkZW1wb3RlbmN5S2V5fWAsXG4gIFxuICAvLyBGb3IgbG9ja2luZyBkdXJpbmcgcHJvY2Vzc2luZ1xuICBsb2NrOiAoZW5kcG9pbnQ6IHN0cmluZywgaWRlbXBvdGVuY3lLZXk6IHN0cmluZykgPT5cbiAgICBgJHtJREVNUE9URU5DWV9DT05GSUcua2V5UHJlZml4fTpsb2NrOiR7ZW5kcG9pbnR9OiR7aWRlbXBvdGVuY3lLZXl9YCxcbn07XG5cbi8qKlxuICogU3RvcmVkIGlkZW1wb3RlbmN5IHJlc3BvbnNlXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSWRlbXBvdGVuY3lSZXNwb25zZSB7XG4gIHN0YXR1c0NvZGU6IG51bWJlcjtcbiAgYm9keTogYW55O1xuICBoZWFkZXJzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgY3JlYXRlZEF0OiBzdHJpbmc7XG59XG5cbi8qKlxuICogUmVzdWx0IG9mIGNoZWNraW5nIGlkZW1wb3RlbmN5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSWRlbXBvdGVuY3lDaGVja1Jlc3VsdCB7XG4gIGZvdW5kOiBib29sZWFuO1xuICByZXNwb25zZT86IElkZW1wb3RlbmN5UmVzcG9uc2U7XG4gIGlzUHJvY2Vzc2luZz86IGJvb2xlYW47XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYW4gaWRlbXBvdGVuY3kga2V5IGV4aXN0cyBhbmQgZ2V0IGNhY2hlZCByZXNwb25zZVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tJZGVtcG90ZW5jeUtleShcbiAgZW5kcG9pbnQ6IHN0cmluZyxcbiAgaWRlbXBvdGVuY3lLZXk6IHN0cmluZ1xuKTogUHJvbWlzZTxJZGVtcG90ZW5jeUNoZWNrUmVzdWx0PiB7XG4gIGNvbnN0IGtleSA9IElERU1QT1RFTkNZX0tFWVMua2V5KGVuZHBvaW50LCBpZGVtcG90ZW5jeUtleSk7XG4gIGNvbnN0IGxvY2tLZXkgPSBJREVNUE9URU5DWV9LRVlTLmxvY2soZW5kcG9pbnQsIGlkZW1wb3RlbmN5S2V5KTtcbiAgXG4gIC8vIENoZWNrIGlmIHJlc3BvbnNlIGV4aXN0c1xuICBjb25zdCBjYWNoZWQgPSBhd2FpdCByZWRpcy5nZXQoa2V5KTtcbiAgaWYgKGNhY2hlZCkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IEpTT04ucGFyc2UoY2FjaGVkKSBhcyBJZGVtcG90ZW5jeVJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHsgZm91bmQ6IHRydWUsIHJlc3BvbnNlIH07XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBJbnZhbGlkIGNhY2hlZCBkYXRhLCBkZWxldGUgaXRcbiAgICAgIGF3YWl0IHJlZGlzLmRlbChrZXkpO1xuICAgIH1cbiAgfVxuICBcbiAgLy8gQ2hlY2sgaWYgYW5vdGhlciByZXF1ZXN0IGlzIHByb2Nlc3NpbmcgdGhpcyBrZXlcbiAgY29uc3QgaXNQcm9jZXNzaW5nID0gYXdhaXQgcmVkaXMuZXhpc3RzKGxvY2tLZXkpO1xuICBpZiAoaXNQcm9jZXNzaW5nKSB7XG4gICAgcmV0dXJuIHsgZm91bmQ6IGZhbHNlLCBpc1Byb2Nlc3Npbmc6IHRydWUgfTtcbiAgfVxuICBcbiAgcmV0dXJuIHsgZm91bmQ6IGZhbHNlLCBpc1Byb2Nlc3Npbmc6IGZhbHNlIH07XG59XG5cbi8qKlxuICogU3RhcnQgcHJvY2Vzc2luZyBhbiBpZGVtcG90ZW50IHJlcXVlc3RcbiAqIFJldHVybnMgdHJ1ZSBpZiB3ZSBzaG91bGQgcHJvY2VzcywgZmFsc2UgaWYgYW5vdGhlciByZXF1ZXN0IGlzIGFscmVhZHkgcHJvY2Vzc2luZ1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RhcnRJZGVtcG90ZW50UmVxdWVzdChcbiAgZW5kcG9pbnQ6IHN0cmluZyxcbiAgaWRlbXBvdGVuY3lLZXk6IHN0cmluZyxcbiAgbG9ja1RUTDogbnVtYmVyID0gMzAgLy8gTG9jayBUVEwgaW4gc2Vjb25kc1xuKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IGxvY2tLZXkgPSBJREVNUE9URU5DWV9LRVlTLmxvY2soZW5kcG9pbnQsIGlkZW1wb3RlbmN5S2V5KTtcbiAgXG4gIC8vIFRyeSB0byBhY3F1aXJlIHRoZSBsb2NrIHVzaW5nIFNFVCBOWCAob25seSBzZXQgaWYgbm90IGV4aXN0cylcbiAgY29uc3QgYWNxdWlyZWQgPSBhd2FpdCByZWRpcy5zZXQobG9ja0tleSwgJzEnLCAnRVgnLCBsb2NrVFRMLCAnTlgnKTtcbiAgcmV0dXJuIGFjcXVpcmVkID09PSAnT0snO1xufVxuXG4vKipcbiAqIFN0b3JlIHRoZSByZXNwb25zZSBmb3IgYW4gaWRlbXBvdGVudCByZXF1ZXN0XG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdG9yZUlkZW1wb3RlbmN5UmVzcG9uc2UoXG4gIGVuZHBvaW50OiBzdHJpbmcsXG4gIGlkZW1wb3RlbmN5S2V5OiBzdHJpbmcsXG4gIHN0YXR1c0NvZGU6IG51bWJlcixcbiAgYm9keTogYW55LFxuICBoZWFkZXJzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGtleSA9IElERU1QT1RFTkNZX0tFWVMua2V5KGVuZHBvaW50LCBpZGVtcG90ZW5jeUtleSk7XG4gIGNvbnN0IGxvY2tLZXkgPSBJREVNUE9URU5DWV9LRVlTLmxvY2soZW5kcG9pbnQsIGlkZW1wb3RlbmN5S2V5KTtcbiAgXG4gIGNvbnN0IHJlc3BvbnNlOiBJZGVtcG90ZW5jeVJlc3BvbnNlID0ge1xuICAgIHN0YXR1c0NvZGUsXG4gICAgYm9keSxcbiAgICBoZWFkZXJzLFxuICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICB9O1xuICBcbiAgLy8gU3RvcmUgdGhlIHJlc3BvbnNlIGFuZCByZWxlYXNlIHRoZSBsb2NrIGF0b21pY2FsbHlcbiAgYXdhaXQgcmVkaXMubXVsdGkoKVxuICAgIC5zZXQoa2V5LCBKU09OLnN0cmluZ2lmeShyZXNwb25zZSksICdFWCcsIElERU1QT1RFTkNZX0NPTkZJRy5rZXlUVEwpXG4gICAgLmRlbChsb2NrS2V5KVxuICAgIC5leGVjKCk7XG59XG5cbi8qKlxuICogUmVsZWFzZSB0aGUgcHJvY2Vzc2luZyBsb2NrIHdpdGhvdXQgc3RvcmluZyBhIHJlc3BvbnNlXG4gKiBVc2UgdGhpcyB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIGFuZCBzaG91bGRuJ3QgYmUgY2FjaGVkXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWxlYXNlSWRlbXBvdGVuY3lMb2NrKFxuICBlbmRwb2ludDogc3RyaW5nLFxuICBpZGVtcG90ZW5jeUtleTogc3RyaW5nXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgbG9ja0tleSA9IElERU1QT1RFTkNZX0tFWVMubG9jayhlbmRwb2ludCwgaWRlbXBvdGVuY3lLZXkpO1xuICBhd2FpdCByZWRpcy5kZWwobG9ja0tleSk7XG59XG5cbi8qKlxuICogRGVsZXRlIGFuIGlkZW1wb3RlbmN5IGtleSAoZm9yIHRlc3Rpbmcgb3IgbWFudWFsIGNsZWFudXApXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZWxldGVJZGVtcG90ZW5jeUtleShcbiAgZW5kcG9pbnQ6IHN0cmluZyxcbiAgaWRlbXBvdGVuY3lLZXk6IHN0cmluZ1xuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGtleSA9IElERU1QT1RFTkNZX0tFWVMua2V5KGVuZHBvaW50LCBpZGVtcG90ZW5jeUtleSk7XG4gIGNvbnN0IGxvY2tLZXkgPSBJREVNUE9URU5DWV9LRVlTLmxvY2soZW5kcG9pbnQsIGlkZW1wb3RlbmN5S2V5KTtcbiAgYXdhaXQgcmVkaXMuZGVsKGtleSwgbG9ja0tleSk7XG59XG5cbi8qKlxuICogRXhwcmVzcyBtaWRkbGV3YXJlIGZvciBpZGVtcG90ZW5jeSBrZXkgaGFuZGxpbmdcbiAqIFxuICogVXNhZ2U6XG4gKiByb3V0ZXIucG9zdCgnL2VuZHBvaW50JywgaWRlbXBvdGVuY3lNaWRkbGV3YXJlKCdlbmRwb2ludCcpLCBoYW5kbGVyKVxuICogXG4gKiBDbGllbnQgc2VuZHM6IFgtSWRlbXBvdGVuY3ktS2V5IGhlYWRlclxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlSWRlbXBvdGVuY3lNaWRkbGV3YXJlKGVuZHBvaW50OiBzdHJpbmcpIHtcbiAgcmV0dXJuIGFzeW5jIChyZXE6IGFueSwgcmVzOiBhbnksIG5leHQ6IGFueSkgPT4ge1xuICAgIGNvbnN0IGlkZW1wb3RlbmN5S2V5ID0gcmVxLmhlYWRlcnNbJ3gtaWRlbXBvdGVuY3kta2V5J107XG4gICAgXG4gICAgLy8gSWYgbm8gaWRlbXBvdGVuY3kga2V5IHByb3ZpZGVkLCBwcm9jZWVkIG5vcm1hbGx5XG4gICAgaWYgKCFpZGVtcG90ZW5jeUtleSkge1xuICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2hlY2sgaWYgd2UgaGF2ZSBhIGNhY2hlZCByZXNwb25zZVxuICAgIGNvbnN0IGNoZWNrID0gYXdhaXQgY2hlY2tJZGVtcG90ZW5jeUtleShlbmRwb2ludCwgaWRlbXBvdGVuY3lLZXkpO1xuICAgIFxuICAgIGlmIChjaGVjay5mb3VuZCAmJiBjaGVjay5yZXNwb25zZSkge1xuICAgICAgLy8gUmV0dXJuIGNhY2hlZCByZXNwb25zZVxuICAgICAgaWYgKGNoZWNrLnJlc3BvbnNlLmhlYWRlcnMpIHtcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoY2hlY2sucmVzcG9uc2UuaGVhZGVycykpIHtcbiAgICAgICAgICByZXMuc2V0SGVhZGVyKGtleSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXMuc2V0SGVhZGVyKCdYLUlkZW1wb3RlbmN5LVJlcGxheScsICd0cnVlJyk7XG4gICAgICByZXR1cm4gcmVzLnN0YXR1cyhjaGVjay5yZXNwb25zZS5zdGF0dXNDb2RlKS5qc29uKGNoZWNrLnJlc3BvbnNlLmJvZHkpO1xuICAgIH1cbiAgICBcbiAgICBpZiAoY2hlY2suaXNQcm9jZXNzaW5nKSB7XG4gICAgICAvLyBBbm90aGVyIHJlcXVlc3QgaXMgcHJvY2Vzc2luZyB0aGlzIGtleVxuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDA5KS5qc29uKHtcbiAgICAgICAgZXJyb3I6ICdSZXF1ZXN0IGlzIGFscmVhZHkgYmVpbmcgcHJvY2Vzc2VkJyxcbiAgICAgICAgY29kZTogJ0lERU1QT1RFTkNZX0NPTkZMSUNUJyxcbiAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvLyBUcnkgdG8gc3RhcnQgcHJvY2Vzc2luZ1xuICAgIGNvbnN0IGNhblByb2Nlc3MgPSBhd2FpdCBzdGFydElkZW1wb3RlbnRSZXF1ZXN0KGVuZHBvaW50LCBpZGVtcG90ZW5jeUtleSk7XG4gICAgaWYgKCFjYW5Qcm9jZXNzKSB7XG4gICAgICAvLyBSYWNlIGNvbmRpdGlvbiAtIGFub3RoZXIgcmVxdWVzdCBqdXN0IHN0YXJ0ZWRcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwOSkuanNvbih7XG4gICAgICAgIGVycm9yOiAnUmVxdWVzdCBpcyBhbHJlYWR5IGJlaW5nIHByb2Nlc3NlZCcsXG4gICAgICAgIGNvZGU6ICdJREVNUE9URU5DWV9DT05GTElDVCcsXG4gICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLy8gU3RvcmUgb3JpZ2luYWwganNvbiBtZXRob2RcbiAgICBjb25zdCBvcmlnaW5hbEpzb24gPSByZXMuanNvbi5iaW5kKHJlcyk7XG4gICAgXG4gICAgLy8gT3ZlcnJpZGUganNvbiB0byBjYXB0dXJlIGFuZCBjYWNoZSB0aGUgcmVzcG9uc2VcbiAgICByZXMuanNvbiA9IGFzeW5jIChib2R5OiBhbnkpID0+IHtcbiAgICAgIGF3YWl0IHN0b3JlSWRlbXBvdGVuY3lSZXNwb25zZShcbiAgICAgICAgZW5kcG9pbnQsXG4gICAgICAgIGlkZW1wb3RlbmN5S2V5LFxuICAgICAgICByZXMuc3RhdHVzQ29kZSxcbiAgICAgICAgYm9keVxuICAgICAgKTtcbiAgICAgIHJldHVybiBvcmlnaW5hbEpzb24oYm9keSk7XG4gICAgfTtcbiAgICBcbiAgICAvLyBDb250aW51ZSB0byB0aGUgaGFuZGxlclxuICAgIG5leHQoKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBIZWxwZXIgdG8gd3JhcCBhbiBhc3luYyBoYW5kbGVyIHdpdGggaWRlbXBvdGVuY3kgc3VwcG9ydFxuICogRW5zdXJlcyBsb2NrIGlzIHJlbGVhc2VkIG9uIGVycm9yc1xuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aElkZW1wb3RlbmN5PFQ+KFxuICBlbmRwb2ludDogc3RyaW5nLFxuICBpZGVtcG90ZW5jeUtleTogc3RyaW5nLFxuICBmbjogKCkgPT4gUHJvbWlzZTxUPlxuKTogUHJvbWlzZTxUPiB7XG4gIHJldHVybiBmbigpLmNhdGNoKGFzeW5jIChlcnJvcikgPT4ge1xuICAgIC8vIFJlbGVhc2UgdGhlIGxvY2sgb24gZXJyb3JcbiAgICBhd2FpdCByZWxlYXNlSWRlbXBvdGVuY3lMb2NrKGVuZHBvaW50LCBpZGVtcG90ZW5jeUtleSk7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH0pO1xufVxuIl19