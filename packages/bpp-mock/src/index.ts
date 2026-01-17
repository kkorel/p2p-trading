/**
 * BPP Mock - Beckn Provider Platform (Seller)
 */

import express from 'express';
import path from 'path';
import { config, createLogger } from '@p2p/shared';
import routes from './routes';
import { initDb, closeDb } from './db';

const app = express();
const logger = createLogger('BPP');
const PORT = config.ports.bpp;

// Middleware
app.use(express.json());

// Serve static seller dashboard
app.use(express.static(path.join(__dirname, '../public')));

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'bpp-mock' });
});

// Serve seller dashboard for all non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/seller') || req.path.startsWith('/select') || 
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
    logger.info(`BPP Mock running on port ${PORT}`);
    logger.info(`Callback delay: ${config.callbackDelay}ms`);
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
