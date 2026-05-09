import mongoose from 'mongoose';
import { MONGODB_URI, isProduction, NODE_ENV } from './env.js';

const log = (level, message, meta = {}) => {
  const ts = new Date().toISOString();
  const payload = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  const line = `[${ts}] [mongodb] ${message}${payload}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
};

/** @type {boolean} */
let listenersAttached = false;

function attachConnectionListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('connecting', () => {
    log('info', 'Connecting…');
  });

  mongoose.connection.on('connected', () => {
    const { host, name, port } = mongoose.connection;
    log('info', 'Connected', {
      host,
      name,
      port,
      readyState: mongoose.connection.readyState,
    });
  });

  mongoose.connection.on('error', (err) => {
    log('error', `Connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    log('warn', 'Disconnected from cluster');
  });

  // Atlas / driver reconnect attempts
  mongoose.connection.on('reconnected', () => {
    log('info', 'Reconnected after interruption');
  });

  mongoose.connection.on('close', () => {
    log('info', 'Connection closed');
  });
}

/**
 * Connect to MongoDB (Atlas). Reuses an existing connection if already open.
 * @returns {Promise<import('mongoose').Connection | null>}
 */
export async function connectDatabase() {
  if (!MONGODB_URI) {
    if (isProduction) {
      const err = new Error('MONGODB_URI is required in production');
      log('error', err.message);
      throw err;
    }
    log('warn', `MONGODB_URI not set — skipping MongoDB (${NODE_ENV})`);
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    log('info', 'Using existing connection (readyState=connected)');
    return mongoose.connection;
  }

  attachConnectionListeners();

  try {
    await mongoose.connect(MONGODB_URI, {
      // Atlas-friendly defaults; tune per workload
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE ?? 10),
      minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE ?? 1),
      serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? 10_000),
      socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS ?? 45_000),
      family: 4,
    });

    return mongoose.connection;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log('error', `Failed to connect: ${message}`);
    throw err;
  }
}

/**
 * Graceful disconnect (e.g. SIGTERM / tests).
 */
export async function disconnectDatabase() {
  if (mongoose.connection.readyState === 0) {
    log('info', 'disconnect skipped (already disconnected)');
    return;
  }
  try {
    await mongoose.disconnect();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log('error', `Error while disconnecting: ${message}`);
    throw err;
  }
}

/**
 * Native driver connection for advanced use; prefer `mongoose` models otherwise.
 */
export function getDbConnection() {
  return mongoose.connection;
}

export { mongoose };
