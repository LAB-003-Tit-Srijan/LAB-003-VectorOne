export const NODE_ENV = process.env.NODE_ENV ?? 'development';
export const isProduction = NODE_ENV === 'production';

export const PORT = Number(process.env.PORT) || 3001;

/** MongoDB Atlas (or local) connection string. Required in production when using the database. */
export const MONGODB_URI = (process.env.MONGODB_URI ?? '').trim();

export const SENTRY_DSN = process.env.SENTRY_DSN;

export const NIM_API_KEY = process.env.NIM_API_KEY ?? process.env.NVIDIA_NIM_API_KEY;
export const NIM_BASE_URL = process.env.NIM_BASE_URL ?? 'https://integrate.api.nvidia.com/v1';
export const EMBEDDING_MODEL = process.env.NIM_EMBEDDING_MODEL ?? 'nvidia/nv-embedqa-e5-v5';
export const EMBEDDING_FALLBACK_MODELS = (
  process.env.NIM_EMBEDDING_FALLBACK_MODELS ?? 'nvidia/nv-embed-v1'
)
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);
export const GENERATION_MODEL =
  process.env.NIM_GENERATION_MODEL ?? 'meta/llama-3.1-70b-instruct';
export const FALLBACK_ANSWER = 'This topic is not covered in the lecture.';
export const RETRIEVAL_TOP_K = 12;
export const MIN_RELEVANCE_SCORE = 0.05;
export const MAX_MEMORY_TURNS = 8;
export const ENABLE_VISUAL_CONTEXT = process.env.ENABLE_VISUAL_CONTEXT !== 'false';
export const VISION_MODEL =
  process.env.NIM_VISION_MODEL ?? 'meta/llama-3.2-11b-vision-instruct';
export const FRAME_INTERVAL_SECONDS = Number(process.env.FRAME_INTERVAL_SECONDS ?? 25);
export const MAX_FRAMES = Number(process.env.MAX_VISUAL_FRAMES ?? 8);
export const VISUAL_CONTEXT_TIMEOUT_MS = Number(process.env.VISUAL_CONTEXT_TIMEOUT_MS ?? 1200);

/** Auth — use strong secrets in production */
export const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ??
  (isProduction ? '' : 'dev-only-change-JWT_ACCESS_SECRET');
export const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ??
  (isProduction ? '' : 'dev-only-change-JWT_REFRESH_SECRET');
export const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
export const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

/** Google OAuth Client ID (Web client) — used to verify ID tokens */
export const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID ?? '').trim();

/** Google Gemini (summarize / auxiliary AI). Prefer GEMINI_API_KEY or legacy GOOGLE_API_KEY */
export const GEMINI_API_KEY =
  (process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? '').trim();
/** Model ID e.g. gemini-1.5-flash, gemini-1.5-flash-latest */
export const GEMINI_MODEL = (process.env.GEMINI_MODEL ?? 'gemini-1.5-flash').trim();
/** Max characters accepted for POST /api/ai/summarize body.text */
export const GEMINI_SUMMARIZE_MAX_INPUT_CHARS = Number(
  process.env.GEMINI_SUMMARIZE_MAX_INPUT_CHARS ?? 120_000
);
