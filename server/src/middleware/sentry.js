import * as Sentry from '@sentry/node';
import { SENTRY_DSN } from '../config/env.js';

export function initSentry() {
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.05),
    integrations: [Sentry.expressIntegration()],
  });

  process.on('unhandledRejection', (reason) => {
    reportServerError(reason instanceof Error ? reason : new Error(String(reason)), {
      type: 'unhandledRejection',
    });
  });
}

export function reportServerError(error, context) {
  if (!SENTRY_DSN || error == null) return;
  const err = error instanceof Error ? error : new Error(String(error));
  Sentry.captureException(err, { extra: context });
}

export function attachSentryErrorHandler(app) {
  if (SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }
}

export { Sentry };
