/**
 * CDS Mock - Catalog Discovery Service
 * 
 * Note: Environment variables are loaded via ts-node's -r dotenv/config flag
 */

import express from 'express';
import { config, createLogger } from '@p2p/shared';
import routes from './routes';
import { initDb, closeDb, checkDbHealth } from './db';

const app = express();
const logger = createLogger('CDS');
const PORT = config.ports.cds;

// Middleware
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/', routes);

// Health check - verifies database and cache connectivity
app.get('/health', async (req, res) => {
  try {
    const health = await checkDbHealth();
    const isHealthy = health.postgres && health.redis;
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ok' : 'degraded',
      service: 'cds-mock',
      postgres: health.postgres ? 'connected' : 'disconnected',
      redis: health.redis ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      service: 'cds-mock',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// Start server after DB initialization
async function start() {
  try {
    await initDb();
    logger.info('Database and Redis connections initialized');
    
    const server = app.listen(PORT, () => {
      logger.info(`CDS Mock running on port ${PORT}`);
      logger.info(`Callback delay: ${config.callbackDelay}ms`);
    });

    // Graceful shutdown handler
    async function shutdown(signal: string) {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        try {
          await closeDb();
          logger.info('Database connections closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
      
      // Force exit after timeout
      setTimeout(() => {
        logger.warn('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to initialize:', error);
    process.exit(1);
  }
}

start().catch(err => {
  logger.error(`Failed to start: ${err.message}`);
  process.exit(1);
});

export default app;
