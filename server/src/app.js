import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { registerRoutes } from './routes/index.js';
import { attachSentryErrorHandler } from './middleware/sentry.js';

export function createApp() {
  const app = express();

  // Basic Security Headers
  app.use(helmet({
    crossOriginResourcePolicy: false, // Allow cross-origin images/resources if needed
  }));

  // CORS Configuration
  app.use(cors());

  // Rate Limiting to prevent brute force/spam
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 500, // Limit each IP to 500 requests per window
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
  });
  app.use('/api', limiter);

  app.use(express.json({ limit: '10mb' }));
  
  // NoSQL Injection Protection
  app.use(mongoSanitize());

  registerRoutes(app);

  attachSentryErrorHandler(app);

  return app;
}
