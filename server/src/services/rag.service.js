import { ENABLE_VISUAL_CONTEXT, NIM_API_KEY } from '../config/env.js';
import { ragStore, visualStore } from '../models/stores.js';
import { normalizeTranscriptUnits, chunkTranscript } from '../utils/transcript.js';
import { embedText, embedTextBatch, describeFrameWithVision } from './nim-api.service.js';
import { sampleFramesForVideo } from './visual-frames.service.js';

export function getVisualContext(videoId) {
  const current = visualStore.get(videoId);
  if (!current || current.status !== 'ready') return [];
  return current.chunks ?? [];
}

async function buildVisualContext(videoId) {
  if (!ENABLE_VISUAL_CONTEXT || !NIM_API_KEY) {
    return { chunks: [], status: 'disabled', createdAt: Date.now() };
  }

  const frames = await sampleFramesForVideo(videoId);
  if (frames.length === 0) {
    return { chunks: [], status: 'empty', createdAt: Date.now() };
  }

  const chunks = [];
  for (const frame of frames) {
    // Describe frames sequentially to avoid overloading the vision API
    const chunk = await describeFrameWithVision(videoId, frame);
    const embedding = await embedText(chunk.text, 'passage');
    chunks.push({ ...chunk, embedding });
  }

  return { chunks, status: 'ready', createdAt: Date.now() };
}

export function ensureVisualContext(videoId) {
  if (!ENABLE_VISUAL_CONTEXT) return Promise.resolve({ chunks: [] });

  const existing = visualStore.get(videoId);
  if (existing?.promise) return existing.promise;
  if (existing?.status === 'ready') return Promise.resolve(existing);

  const promise = buildVisualContext(videoId)
    .then((result) => {
      visualStore.set(videoId, result);
      return result;
    })
    .catch((error) => {
      const fallback = {
        chunks: [],
        status: 'error',
        error: error?.message ?? String(error),
        createdAt: Date.now(),
      };
      visualStore.set(videoId, fallback);
      return fallback;
    });

  visualStore.set(videoId, { status: 'processing', chunks: [], promise });
  return promise;
}

export async function buildOrGetRagIndex(videoId, transcript) {
  const normalized = normalizeTranscriptUnits(transcript ?? []);
  const visualChunks = getVisualContext(videoId);
  const signature = `${normalized.length}:${visualChunks.length}`;
  const existing = ragStore.get(videoId);

  if (existing && existing.signature === signature) {
    return existing;
  }

  const chunks = chunkTranscript(normalized);
  const BATCH_SIZE = 16;
  const withEmbeddings = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const embeddings = await embedTextBatch(
      batch.map((c) => c.text),
      'passage'
    );
    batch.forEach((chunk, idx) => {
      withEmbeddings.push({ ...chunk, embedding: embeddings[idx], sourceType: 'transcript' });
    });
  }

  withEmbeddings.push(...visualChunks);

  const index = {
    signature,
    chunks: withEmbeddings,
    createdAt: Date.now(),
  };
  ragStore.set(videoId, index);
  return index;
}
