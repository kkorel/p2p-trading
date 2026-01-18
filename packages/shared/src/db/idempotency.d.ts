/**
 * Idempotency Key Support
 */

export declare const IDEMPOTENCY_CONFIG: {
    keyTTL: number;
    keyPrefix: string;
};

export declare const IDEMPOTENCY_KEYS: {
    key: (endpoint: string, idempotencyKey: string) => string;
    lock: (endpoint: string, idempotencyKey: string) => string;
};

export interface IdempotencyResponse {
    statusCode: number;
    body: any;
    headers?: Record<string, string>;
    createdAt: string;
}

export interface IdempotencyCheckResult {
    found: boolean;
    response?: IdempotencyResponse;
    isProcessing?: boolean;
}

export declare function checkIdempotencyKey(
    endpoint: string,
    idempotencyKey: string
): Promise<IdempotencyCheckResult>;

export declare function startIdempotentRequest(
    endpoint: string,
    idempotencyKey: string,
    lockTTL?: number
): Promise<boolean>;

export declare function storeIdempotencyResponse(
    endpoint: string,
    idempotencyKey: string,
    statusCode: number,
    body: any,
    headers?: Record<string, string>
): Promise<void>;

export declare function releaseIdempotencyLock(
    endpoint: string,
    idempotencyKey: string
): Promise<void>;

export declare function deleteIdempotencyKey(
    endpoint: string,
    idempotencyKey: string
): Promise<void>;

export declare function createIdempotencyMiddleware(endpoint: string): (req: any, res: any, next: any) => Promise<any>;

export declare function withIdempotency<T>(
    endpoint: string,
    idempotencyKey: string,
    fn: () => Promise<T>
): Promise<T>;
