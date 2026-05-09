import * as Sentry from '@sentry/react';

export function captureClientException(error: unknown, context?: Record<string, unknown>): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  const err = error instanceof Error ? error : new Error(String(error));
  Sentry.captureException(err, { extra: context });
}
