/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string;
  /** Same OAuth Web Client ID as server GOOGLE_CLIENT_ID */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** Backend origin when the UI is not proxied (e.g. http://localhost:3001) */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
