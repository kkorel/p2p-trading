/**
 * Session Management Service
 * Handles session creation, validation, and cleanup
 */
export declare const SESSION_CONFIG: {
    tokenLength: number;
    expiryDays: number;
    refreshThresholdDays: number;
};
export declare const SESSION_REDIS_KEYS: {
    session: (token: string) => string;
    userSessions: (userId: string) => string;
};
export interface SessionInfo {
    id: string;
    userId: string;
    token: string;
    deviceInfo?: string;
    ipAddress?: string;
    expiresAt: Date;
    createdAt: Date;
}
export interface CreateSessionOptions {
    userId: string;
    deviceInfo?: string;
    ipAddress?: string;
}
/**
 * Generate a secure session token
 */
export declare function generateSessionToken(): string;
/**
 * Create a new session
 */
export declare function createSession(options: CreateSessionOptions): Promise<SessionInfo>;
/**
 * Validate and get session by token
 */
export declare function getSession(token: string): Promise<SessionInfo | null>;
/**
 * Refresh session if needed (extend expiry)
 */
export declare function refreshSession(token: string): Promise<SessionInfo | null>;
/**
 * Delete a session (logout)
 */
export declare function deleteSession(token: string): Promise<boolean>;
/**
 * Delete all sessions for a user (logout everywhere)
 */
export declare function deleteAllUserSessions(userId: string): Promise<number>;
/**
 * Get all active sessions for a user
 */
export declare function getUserSessions(userId: string): Promise<SessionInfo[]>;
/**
 * Clean up expired sessions (call periodically)
 */
export declare function cleanupExpiredSessions(): Promise<number>;
