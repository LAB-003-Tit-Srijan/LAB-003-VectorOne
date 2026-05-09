import express from 'express';
import cors from 'cors';
import { registerRoutes } from './routes/index.js';
import { attachSentryErrorHandler } from './middleware/sentry.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  registerRoutes(app);

  attachSentryErrorHandler(app);

  return app;
}
