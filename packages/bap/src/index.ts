/**
 * Combined Prosumer Application - BAP (Consumer) + BPP (Provider)
 * Single Express server hosting both buyer and seller functionality
 * 
 * Implements Beckn Protocol v2 security measures:
 * - Helmet for HTTP security headers
 * - CORS configuration
 * - Rate limiting
 * - Request validation
 * - Cryptographic signing (optional, enabled via env)
 */

import express from 'express';
import path from 'path';
import { 
  config, 
  createLogger, 
  validateEnv,
  applySecurityMiddleware,
  initializeSecureClient,
  initializeVerification,
  validateBecknMessage,
  logBecknSignature,
} from '@p2p/shared';
import routes from './routes';
import callbacks from './callbacks';
import sellerRoutes from './seller-routes';
import authRoutes from './auth-routes';
import { initDb, closeDb, checkDbHealth } from './db';
import { startDiscomMockService, stopDiscomMockService } from './discom-mock';

const app = express();
const logger = createLogger('PROSUMER');
const PORT = config.ports.bap;

// Apply security middleware (helmet, cors, rate limiting)
applySecurityMiddleware(app, {
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || '*',
  corsCredentials: true,
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 1000,                 // 1000 requests per window
  trustedProxies: 1,
});

// JSON body parser with size limit
app.use(express.json({ limit: '5mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Authentication routes (public - no auth required for login/OTP)
app.use('/auth', authRoutes);

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
    req.path.startsWith('/auth') || req.path.startsWith('/seller') ||
    req.path.startsWith('/select') || req.path.startsWith('/init') ||
    req.path.startsWith('/confirm') || req.path.startsWith('/status') ||
    req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server after DB initialization
async function start() {
  try {
    // Validate environment configuration
    const envValidation = validateEnv();
    if (!envValidation.valid) {
      logger.error('Environment validation failed:');
      envValidation.errors.forEach(err => logger.error(`  - ${err}`));
      process.exit(1);
    }

    // Log environment mode
    logger.info(`Starting in ${config.env.nodeEnv} mode (DEV_MODE=${config.env.isDevMode})`);

    // Initialize Beckn signing (for outgoing requests)
    const signingEnabled = process.env.BECKN_SIGNING_ENABLED === 'true';
    if (signingEnabled) {
      const keyPair = initializeSecureClient({
        enabled: true,
        ttlSeconds: parseInt(process.env.BECKN_SIGNATURE_TTL || '30', 10),
      });
      logger.info('Beckn message signing enabled', { keyId: keyPair.keyId });
    } else {
      logger.info('Beckn message signing disabled (set BECKN_SIGNING_ENABLED=true to enable)');
    }

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
      logger.info(`Prosumer app running on port ${PORT}`);
      logger.info(`CDS URL: ${config.urls.cds}`);
      logger.info(`Roles: Consumer (BAP) + Provider (BPP)`);
      logger.info(`Matching weights: price=${config.matching.weights.price}, trust=${config.matching.weights.trust}, time=${config.matching.weights.timeWindowFit}`);
      logger.info(`Security: Helmet=ON, CORS=ON, RateLimit=ON`);

      // Start DISCOM mock service for trust score verification
      startDiscomMockService();
    });

    // Graceful shutdown handler
    async function shutdown(signal: string) {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        try {
          stopDiscomMockService();
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
