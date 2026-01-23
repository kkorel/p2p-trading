"use strict";
/**
 * Authentication Module Exports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredSessions = exports.getUserSessions = exports.deleteAllUserSessions = exports.deleteSession = exports.refreshSession = exports.getSession = exports.createSession = exports.generateSessionToken = exports.SESSION_REDIS_KEYS = exports.SESSION_CONFIG = exports.authenticateWithGoogle = exports.verifyGoogleToken = exports.GOOGLE_CONFIG = void 0;
// Google OAuth
var google_1 = require("./google");
Object.defineProperty(exports, "GOOGLE_CONFIG", { enumerable: true, get: function () { return google_1.GOOGLE_CONFIG; } });
Object.defineProperty(exports, "verifyGoogleToken", { enumerable: true, get: function () { return google_1.verifyGoogleToken; } });
Object.defineProperty(exports, "authenticateWithGoogle", { enumerable: true, get: function () { return google_1.authenticateWithGoogle; } });
// Session management
var session_1 = require("./session");
Object.defineProperty(exports, "SESSION_CONFIG", { enumerable: true, get: function () { return session_1.SESSION_CONFIG; } });
Object.defineProperty(exports, "SESSION_REDIS_KEYS", { enumerable: true, get: function () { return session_1.SESSION_REDIS_KEYS; } });
Object.defineProperty(exports, "generateSessionToken", { enumerable: true, get: function () { return session_1.generateSessionToken; } });
Object.defineProperty(exports, "createSession", { enumerable: true, get: function () { return session_1.createSession; } });
Object.defineProperty(exports, "getSession", { enumerable: true, get: function () { return session_1.getSession; } });
Object.defineProperty(exports, "refreshSession", { enumerable: true, get: function () { return session_1.refreshSession; } });
Object.defineProperty(exports, "deleteSession", { enumerable: true, get: function () { return session_1.deleteSession; } });
Object.defineProperty(exports, "deleteAllUserSessions", { enumerable: true, get: function () { return session_1.deleteAllUserSessions; } });
Object.defineProperty(exports, "getUserSessions", { enumerable: true, get: function () { return session_1.getUserSessions; } });
Object.defineProperty(exports, "cleanupExpiredSessions", { enumerable: true, get: function () { return session_1.cleanupExpiredSessions; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7OztBQUVILGVBQWU7QUFDZixtQ0FNa0I7QUFMaEIsdUdBQUEsYUFBYSxPQUFBO0FBQ2IsMkdBQUEsaUJBQWlCLE9BQUE7QUFDakIsZ0hBQUEsc0JBQXNCLE9BQUE7QUFLeEIscUJBQXFCO0FBQ3JCLHFDQWFtQjtBQVpqQix5R0FBQSxjQUFjLE9BQUE7QUFDZCw2R0FBQSxrQkFBa0IsT0FBQTtBQUNsQiwrR0FBQSxvQkFBb0IsT0FBQTtBQUNwQix3R0FBQSxhQUFhLE9BQUE7QUFDYixxR0FBQSxVQUFVLE9BQUE7QUFDVix5R0FBQSxjQUFjLE9BQUE7QUFDZCx3R0FBQSxhQUFhLE9BQUE7QUFDYixnSEFBQSxxQkFBcUIsT0FBQTtBQUNyQiwwR0FBQSxlQUFlLE9BQUE7QUFDZixpSEFBQSxzQkFBc0IsT0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQXV0aGVudGljYXRpb24gTW9kdWxlIEV4cG9ydHNcbiAqL1xuXG4vLyBHb29nbGUgT0F1dGhcbmV4cG9ydCB7XG4gIEdPT0dMRV9DT05GSUcsXG4gIHZlcmlmeUdvb2dsZVRva2VuLFxuICBhdXRoZW50aWNhdGVXaXRoR29vZ2xlLFxuICB0eXBlIEdvb2dsZVVzZXJJbmZvLFxuICB0eXBlIEdvb2dsZUF1dGhSZXN1bHQsXG59IGZyb20gJy4vZ29vZ2xlJztcblxuLy8gU2Vzc2lvbiBtYW5hZ2VtZW50XG5leHBvcnQge1xuICBTRVNTSU9OX0NPTkZJRyxcbiAgU0VTU0lPTl9SRURJU19LRVlTLFxuICBnZW5lcmF0ZVNlc3Npb25Ub2tlbixcbiAgY3JlYXRlU2Vzc2lvbixcbiAgZ2V0U2Vzc2lvbixcbiAgcmVmcmVzaFNlc3Npb24sXG4gIGRlbGV0ZVNlc3Npb24sXG4gIGRlbGV0ZUFsbFVzZXJTZXNzaW9ucyxcbiAgZ2V0VXNlclNlc3Npb25zLFxuICBjbGVhbnVwRXhwaXJlZFNlc3Npb25zLFxuICB0eXBlIFNlc3Npb25JbmZvLFxuICB0eXBlIENyZWF0ZVNlc3Npb25PcHRpb25zLFxufSBmcm9tICcuL3Nlc3Npb24nO1xuIl19