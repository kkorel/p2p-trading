/**
 * Database Module for Prosumer App
 * Re-exports Prisma client and Redis from shared package
 */

import {
  prisma,
  connectPrisma,
  disconnectPrisma,
  checkPostgresConnection,
  redis,
  connectRedis,
  disconnectRedis,
  checkRedisConnection,
} from '@p2p/shared';

// Re-export for use in other modules
export {
  prisma,
  redis,
  checkPostgresConnection,
  checkRedisConnection,
};

/**
 * Initialize database connections (PostgreSQL + Redis)
 */
export async function initDb(): Promise<void> {
  await connectPrisma();
  await connectRedis();
  console.log('Database connections initialized');
}

/**
 * Close database connections gracefully
 */
export async function closeDb(): Promise<void> {
  await disconnectPrisma();
  await disconnectRedis();
  console.log('Database connections closed');
}

/**
 * Check health of all database connections
 */
export async function checkDbHealth(): Promise<{ postgres: boolean; redis: boolean }> {
  const [postgres, redisOk] = await Promise.all([
    checkPostgresConnection(),
    checkRedisConnection(),
  ]);
  return { postgres, redis: redisOk };
}
