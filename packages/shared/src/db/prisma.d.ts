/**
 * Prisma Client Singleton
 * Provides connection pooling and proper cleanup
 */
import { PrismaClient } from '../generated/prisma';
declare global {
    var prisma: PrismaClient | undefined;
}
export declare const prisma: PrismaClient<import("../generated/prisma").Prisma.PrismaClientOptions, never, import("../generated/prisma/runtime/library").DefaultArgs>;
/**
 * Check if PostgreSQL is connected
 */
export declare function checkPostgresConnection(): Promise<boolean>;
/**
 * Disconnect Prisma client (for graceful shutdown)
 */
export declare function disconnectPrisma(): Promise<void>;
/**
 * Connect Prisma client explicitly
 */
export declare function connectPrisma(): Promise<void>;
export type { PrismaClient };
