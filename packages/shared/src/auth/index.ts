/**
 * Authentication Module Exports
 */

// Google OAuth
export {
  GOOGLE_CONFIG,
  verifyGoogleToken,
  authenticateWithGoogle,
  type GoogleUserInfo,
  type GoogleAuthResult,
} from './google';

// Session management
export {
  SESSION_CONFIG,
  SESSION_REDIS_KEYS,
  generateSessionToken,
  createSession,
  getSession,
  refreshSession,
  deleteSession,
  deleteAllUserSessions,
  getUserSessions,
  cleanupExpiredSessions,
  type SessionInfo,
  type CreateSessionOptions,
} from './session';
