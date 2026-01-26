/**
 * CDS Mock - Catalog Discovery Service
 * 
 * Implements Beckn Protocol v2 security measures:
 * - Helmet for HTTP security headers
 * - CORS configuration
 * - Rate limiting
 * - Request validation
 */

import express from 'express';
import { 
  config, 
  createLogger,
  applySecurityMiddleware,
  initializeVerification,
  validateBecknMessage,
} from '@p2p/shared';
import routes from './routes';
import { initDb, closeDb, checkDbHealth } from './db';

const app = express();
const logger = createLogger('CDS');
const PORT = config.ports.cds;

// Apply security middleware (helmet, cors, rate limiting)
applySecurityMiddleware(app, {
  corsOrigins: '*', // CDS accepts requests from any BAP
  corsCredentials: true,
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 2000,                 // Higher limit for discovery service
  trustedProxies: 1,
});

// JSON body parser with size limit
app.use(express.json({ limit: '5mb' }));

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
    // Initialize Beckn signature verification (for incoming requests)
    const verificationEnabled = process.env.BECKN_VERIFY_SIGNATURES === 'true';
    initializeVerification({
      enabled: verificationEnabled,
      allowUnsigned: !verificationEnabled, // Allow unsigned in dev mode
    });
    logger.info(`Beckn signature verification: ${verificationEnabled ? 'ENABLED' : 'DISABLED (dev mode)'}`);

    await initDb();
    logger.info('Database and Redis connections initialized');
    
    const server = app.listen(PORT, () => {
      logger.info(`CDS Mock running on port ${PORT}`);
      logger.info(`Callback delay: ${config.callbackDelay}ms`);
      logger.info(`Security: Helmet=ON, CORS=ON, RateLimit=ON`);
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
