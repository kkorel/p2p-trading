import Redis from 'ioredis';

export declare const REDIS_KEYS: {
    transaction: (id: string) => string;
    allTransactions: string;
    processedMessage: (messageId: string, direction: string) => string;
};

export declare const REDIS_TTL: {
    transaction: number;
    processedMessage: number;
};

export declare const redis: Redis;

export declare function checkRedisConnection(): Promise<boolean>;
export declare function connectRedis(): Promise<void>;
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
    status: 'DISCOVERING' | 'SELECTING' | 'INITIALIZING' | 'CONFIRMING' | 'ACTIVE' | 'COMPLETED';
    created_at: string;
    updated_at: string;
}

export declare function createTransactionState(transactionId: string): Promise<TransactionState>;
export declare function getTransactionState(transactionId: string): Promise<TransactionState | null>;
export declare function updateTransactionState(transactionId: string, updates: Partial<Omit<TransactionState, 'transaction_id' | 'created_at'>>): Promise<TransactionState | null>;
export declare function getAllTransactionStates(): Promise<TransactionState[]>;
export declare function clearAllTransactionStates(): Promise<void>;
export declare function isMessageProcessed(messageId: string, direction?: string): Promise<boolean>;
export declare function markMessageProcessed(messageId: string, direction?: string): Promise<void>;

export type { Redis };
