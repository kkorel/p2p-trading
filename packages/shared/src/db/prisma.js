"use strict";
/**
 * Prisma Client Singleton
 * Provides connection pooling and proper cleanup
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.checkPostgresConnection = checkPostgresConnection;
exports.disconnectPrisma = disconnectPrisma;
exports.connectPrisma = connectPrisma;
const prisma_1 = require("../generated/prisma");
// Connection pool configuration for production
const prismaClientSingleton = () => {
    return new prisma_1.PrismaClient({
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });
};
// Use global variable in development to prevent multiple instances during hot-reload
exports.prisma = globalThis.prisma ?? prismaClientSingleton();
if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = exports.prisma;
}
/**
 * Check if PostgreSQL is connected
 */
async function checkPostgresConnection() {
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch (error) {
        console.error('PostgreSQL connection check failed:', error);
        return false;
    }
}
/**
 * Disconnect Prisma client (for graceful shutdown)
 */
async function disconnectPrisma() {
    await exports.prisma.$disconnect();
}
/**
 * Connect Prisma client explicitly
 */
async function connectPrisma() {
    await exports.prisma.$connect();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpc21hLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicHJpc21hLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQWtDSCwwREFRQztBQUtELDRDQUVDO0FBS0Qsc0NBRUM7QUF0REQsZ0RBQW1EO0FBUW5ELCtDQUErQztBQUMvQyxNQUFNLHFCQUFxQixHQUFHLEdBQUcsRUFBRTtJQUNqQyxPQUFPLElBQUkscUJBQVksQ0FBQztRQUN0QixHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEtBQUssYUFBYTtZQUN6QyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQztZQUM1QixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDYixXQUFXLEVBQUU7WUFDWCxFQUFFLEVBQUU7Z0JBQ0YsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWTthQUM5QjtTQUNGO0tBQ0YsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDO0FBRUYscUZBQXFGO0FBQ3hFLFFBQUEsTUFBTSxHQUFHLFVBQVUsQ0FBQyxNQUFNLElBQUkscUJBQXFCLEVBQUUsQ0FBQztBQUVuRSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxLQUFLLFlBQVksRUFBRSxDQUFDO0lBQzFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsY0FBTSxDQUFDO0FBQzdCLENBQUM7QUFFRDs7R0FFRztBQUNJLEtBQUssVUFBVSx1QkFBdUI7SUFDM0MsSUFBSSxDQUFDO1FBQ0gsTUFBTSxjQUFNLENBQUMsU0FBUyxDQUFBLFVBQVUsQ0FBQztRQUNqQyxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM1RCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7QUFDSCxDQUFDO0FBRUQ7O0dBRUc7QUFDSSxLQUFLLFVBQVUsZ0JBQWdCO0lBQ3BDLE1BQU0sY0FBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQzdCLENBQUM7QUFFRDs7R0FFRztBQUNJLEtBQUssVUFBVSxhQUFhO0lBQ2pDLE1BQU0sY0FBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQzFCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFByaXNtYSBDbGllbnQgU2luZ2xldG9uXG4gKiBQcm92aWRlcyBjb25uZWN0aW9uIHBvb2xpbmcgYW5kIHByb3BlciBjbGVhbnVwXG4gKi9cblxuaW1wb3J0IHsgUHJpc21hQ2xpZW50IH0gZnJvbSAnLi4vZ2VuZXJhdGVkL3ByaXNtYSc7XG5cbi8vIERlY2xhcmUgZ2xvYmFsIHR5cGUgZm9yIGRldmVsb3BtZW50IGhvdC1yZWxvYWRcbmRlY2xhcmUgZ2xvYmFsIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXZhclxuICB2YXIgcHJpc21hOiBQcmlzbWFDbGllbnQgfCB1bmRlZmluZWQ7XG59XG5cbi8vIENvbm5lY3Rpb24gcG9vbCBjb25maWd1cmF0aW9uIGZvciBwcm9kdWN0aW9uXG5jb25zdCBwcmlzbWFDbGllbnRTaW5nbGV0b24gPSAoKSA9PiB7XG4gIHJldHVybiBuZXcgUHJpc21hQ2xpZW50KHtcbiAgICBsb2c6IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnIFxuICAgICAgPyBbJ3F1ZXJ5JywgJ2Vycm9yJywgJ3dhcm4nXSBcbiAgICAgIDogWydlcnJvciddLFxuICAgIGRhdGFzb3VyY2VzOiB7XG4gICAgICBkYjoge1xuICAgICAgICB1cmw6IHByb2Nlc3MuZW52LkRBVEFCQVNFX1VSTCxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSk7XG59O1xuXG4vLyBVc2UgZ2xvYmFsIHZhcmlhYmxlIGluIGRldmVsb3BtZW50IHRvIHByZXZlbnQgbXVsdGlwbGUgaW5zdGFuY2VzIGR1cmluZyBob3QtcmVsb2FkXG5leHBvcnQgY29uc3QgcHJpc21hID0gZ2xvYmFsVGhpcy5wcmlzbWEgPz8gcHJpc21hQ2xpZW50U2luZ2xldG9uKCk7XG5cbmlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gIGdsb2JhbFRoaXMucHJpc21hID0gcHJpc21hO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIFBvc3RncmVTUUwgaXMgY29ubmVjdGVkXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja1Bvc3RncmVzQ29ubmVjdGlvbigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBwcmlzbWEuJHF1ZXJ5UmF3YFNFTEVDVCAxYDtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdQb3N0Z3JlU1FMIGNvbm5lY3Rpb24gY2hlY2sgZmFpbGVkOicsIGVycm9yKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBEaXNjb25uZWN0IFByaXNtYSBjbGllbnQgKGZvciBncmFjZWZ1bCBzaHV0ZG93bilcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRpc2Nvbm5lY3RQcmlzbWEoKTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IHByaXNtYS4kZGlzY29ubmVjdCgpO1xufVxuXG4vKipcbiAqIENvbm5lY3QgUHJpc21hIGNsaWVudCBleHBsaWNpdGx5XG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb25uZWN0UHJpc21hKCk6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBwcmlzbWEuJGNvbm5lY3QoKTtcbn1cblxuZXhwb3J0IHR5cGUgeyBQcmlzbWFDbGllbnQgfTtcbiJdfQ==