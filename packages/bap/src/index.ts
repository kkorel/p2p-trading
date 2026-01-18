/**
 * Combined Prosumer Application - BAP (Consumer) + BPP (Provider)
 * Single Express server hosting both buyer and seller functionality
 */

import express from 'express';
import path from 'path';
import { config, createLogger } from '@p2p/shared';
import routes from './routes';
import callbacks from './callbacks';
import sellerRoutes from './seller-routes';
import { initDb, closeDb } from './db';

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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'prosumer', roles: ['bap', 'bpp'] });
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
  await initDb();
  logger.info('Database initialized');
  
  const server = app.listen(PORT, () => {
    logger.info(`Prosumer app running on port ${PORT}`);
    logger.info(`CDS URL: ${config.urls.cds}`);
    logger.info(`Roles: Consumer (BAP) + Provider (BPP)`);
    logger.info(`Matching weights: price=${config.matching.weights.price}, trust=${config.matching.weights.trust}, time=${config.matching.weights.timeWindowFit}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down...');
    server.close(() => {
      closeDb();
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down...');
    server.close(() => {
      closeDb();
      process.exit(0);
    });
  });
}

start().catch(err => {
  logger.error(`Failed to start: ${err.message}`);
  process.exit(1);
});

export default app;
