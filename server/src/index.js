import 'dotenv/config';
import { createApp } from './app.js';
import { PORT } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { initSentry } from './middleware/sentry.js';

async function bootstrap() {
  initSentry();

  try {
    await connectDatabase();
  } catch (err) {
    console.error('[bootstrap] MongoDB connection failed — exiting');
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(PORT, () => {
    console.log(`✅  API server running on http://localhost:${PORT}`);
  });

  const shutdown = async (signal) => {
    console.info(`[bootstrap] Received ${signal}, closing HTTP server…`);
    await new Promise((resolve, reject) => {
      server.close((closeErr) => (closeErr ? reject(closeErr) : resolve()));
    });
    try {
      await disconnectDatabase();
    } catch {
      /* logged in disconnectDatabase */
    }
    process.exit(0);
  };

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });
}

bootstrap().catch((err) => {
  console.error('[bootstrap] Fatal error', err);
  process.exit(1);
});
