/**
 * CDS Mock - Catalog Discovery Service
 */

import express from 'express';
import { config, createLogger } from '@p2p/shared';
import routes from './routes';
import { initDb, closeDb } from './db';

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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cds-mock' });
});

// Start server after DB initialization
async function start() {
  await initDb();
  logger.info('Database initialized');
  
  const server = app.listen(PORT, () => {
    logger.info(`CDS Mock running on port ${PORT}`);
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
