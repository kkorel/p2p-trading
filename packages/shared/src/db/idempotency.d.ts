/**
 * Idempotency Key Support
 * Stores idempotency keys in Redis with cached responses
 * Ensures duplicate requests return the same response
 */
export declare const IDEMPOTENCY_CONFIG: {
    keyTTL: number;
    keyPrefix: string;
};
export declare const IDEMPOTENCY_KEYS: {
    key: (endpoint: string, idempotencyKey: string) => string;
    lock: (endpoint: string, idempotencyKey: string) => string;
};
/**
 * Stored idempotency response
 */
export interface IdempotencyResponse {
    statusCode: number;
    body: any;
    headers?: Record<string, string>;
    createdAt: string;
}
/**
 * Result of checking idempotency
 */
export interface IdempotencyCheckResult {
    found: boolean;
    response?: IdempotencyResponse;
    isProcessing?: boolean;
}
/**
 * Check if an idempotency key exists and get cached response
 */
export declare function checkIdempotencyKey(endpoint: string, idempotencyKey: string): Promise<IdempotencyCheckResult>;
/**
 * Start processing an idempotent request
 * Returns true if we should process, false if another request is already processing
 */
export declare function startIdempotentRequest(endpoint: string, idempotencyKey: string, lockTTL?: number): Promise<boolean>;
/**
 * Store the response for an idempotent request
 */
export declare function storeIdempotencyResponse(endpoint: string, idempotencyKey: string, statusCode: number, body: any, headers?: Record<string, string>): Promise<void>;
/**
 * Release the processing lock without storing a response
 * Use this when the request fails and shouldn't be cached
 */
export declare function releaseIdempotencyLock(endpoint: string, idempotencyKey: string): Promise<void>;
/**
 * Delete an idempotency key (for testing or manual cleanup)
 */
export declare function deleteIdempotencyKey(endpoint: string, idempotencyKey: string): Promise<void>;
/**
 * Express middleware for idempotency key handling
 *
 * Usage:
 * router.post('/endpoint', idempotencyMiddleware('endpoint'), handler)
 *
 * Client sends: X-Idempotency-Key header
 */
export declare function createIdempotencyMiddleware(endpoint: string): (req: any, res: any, next: any) => Promise<any>;
/**
 * Helper to wrap an async handler with idempotency support
 * Ensures lock is released on errors
 */
export declare function withIdempotency<T>(endpoint: string, idempotencyKey: string, fn: () => Promise<T>): Promise<T>;
