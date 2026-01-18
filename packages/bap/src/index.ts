/**
 * Combined Prosumer Application - BAP (Consumer) + BPP (Provider)
 * Single Express server hosting both buyer and seller functionality
 * 
 * Note: Environment variables are loaded via ts-node's -r dotenv/config flag
 */

import express from 'express';
import path from 'path';
import { config, createLogger } from '@p2p/shared';
import routes from './routes';
import callbacks from './callbacks';
import sellerRoutes from './seller-routes';
import { initDb, closeDb, checkDbHealth } from './db';

const app = express();
const logger = createLogger('PROSUMER');
const PORT = config.ports.bap;

// Middleware
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// Consumer API routes (BAP)
app.use('/', routes);

// Callback endpoints for receiving async responses
app.use('/callbacks', callbacks);

// Seller/Provider routes (BPP) - includes Beckn protocol routes and seller management APIs
app.use('/', sellerRoutes);

// Health check - verifies database and cache connectivity
app.get('/health', async (req, res) => {
  try {
    const health = await checkDbHealth();
    const isHealthy = health.postgres && health.redis;
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ok' : 'degraded',
      service: 'prosumer',
      roles: ['bap', 'bpp'],
      postgres: health.postgres ? 'connected' : 'disconnected',
      redis: health.redis ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      service: 'prosumer',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// Serve frontend for all non-API routes (SPA fallback)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/callbacks') || 
      req.path.startsWith('/seller') || req.path.startsWith('/select') ||
      req.path.startsWith('/init') || req.path.startsWith('/confirm') ||
      req.path.startsWith('/status') || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server after DB initialization
async function start() {
  try {
    await initDb();
    logger.info('Database and Redis connections initialized');
    
    const server = app.listen(PORT, () => {
      logger.info(`Prosumer app running on port ${PORT}`);
      logger.info(`CDS URL: ${config.urls.cds}`);
      logger.info(`Roles: Consumer (BAP) + Provider (BPP)`);
      logger.info(`Matching weights: price=${config.matching.weights.price}, trust=${config.matching.weights.trust}, time=${config.matching.weights.timeWindowFit}`);
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
