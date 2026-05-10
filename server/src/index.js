import 'dotenv/config';
import { createApp } from './app.js';
import { isProduction, PORT } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { initSentry } from './middleware/sentry.js';

async function bootstrap() {
  initSentry();

  try {
    await connectDatabase();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isProduction) {
      console.error('[bootstrap] MongoDB connection failed — exiting');
      console.error(msg);
      process.exit(1);
    }
    console.warn('[bootstrap] MongoDB unavailable — starting API without database (development only).');
    console.warn(`[bootstrap] ${msg}`);
    console.warn(
      '[bootstrap] Routes that require MongoDB will return 503. Fix DNS/network or MONGODB_URI (Atlas SRV needs working DNS).'
    );
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
