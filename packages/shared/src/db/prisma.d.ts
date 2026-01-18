import { PrismaClient } from '../generated/prisma';

export declare const prisma: PrismaClient;
export declare function checkPostgresConnection(): Promise<boolean>;
export declare function disconnectPrisma(): Promise<void>;
export declare function connectPrisma(): Promise<void>;
export type { PrismaClient };
