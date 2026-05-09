import express from 'express';
import cors from 'cors';
import * as Sentry from '@sentry/node';
import { YoutubeTranscript } from 'youtube-transcript';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { mkdtemp, readdir, readFile, rm } from 'fs/promises';

const app = express();
const PORT = process.env.PORT || 3001;
const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
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

function reportServerError(error, context) {
  if (!SENTRY_DSN || error == null) return;
  const err = error instanceof Error ? error : new Error(String(error));
  Sentry.captureException(err, { extra: context });
}
const NIM_API_KEY = process.env.NIM_API_KEY ?? process.env.NVIDIA_NIM_API_KEY;
const NIM_BASE_URL = process.env.NIM_BASE_URL ?? 'https://integrate.api.nvidia.com/v1';
const EMBEDDING_MODEL = process.env.NIM_EMBEDDING_MODEL ?? 'nvidia/nv-embedqa-e5-v5';
const EMBEDDING_FALLBACK_MODELS = (
  process.env.NIM_EMBEDDING_FALLBACK_MODELS ?? 'nvidia/nv-embed-v1'
)
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);
const GENERATION_MODEL =
  process.env.NIM_GENERATION_MODEL ?? 'meta/llama-3.1-70b-instruct';
const FALLBACK_ANSWER = 'This topic is not covered in the lecture.';
const RETRIEVAL_TOP_K = 4;
const MIN_RELEVANCE_SCORE = 0.18;
const MAX_MEMORY_TURNS = 8;
const ENABLE_VISUAL_CONTEXT = process.env.ENABLE_VISUAL_CONTEXT !== 'false';
const VISION_MODEL =
  process.env.NIM_VISION_MODEL ?? 'meta/llama-3.2-11b-vision-instruct';
const FRAME_INTERVAL_SECONDS = Number(process.env.FRAME_INTERVAL_SECONDS ?? 25);
const MAX_FRAMES = Number(process.env.MAX_VISUAL_FRAMES ?? 8);
const VISUAL_CONTEXT_TIMEOUT_MS = Number(process.env.VISUAL_CONTEXT_TIMEOUT_MS ?? 1200);
const ragStore = new Map();
const sessionStore = new Map();
const visualStore = new Map();
const analyticsStore = new Map();
const execFileAsync = promisify(execFile);
const embeddingStrategyCache = new Map();

app.use(cors());
app.use(express.json());

/**
 * Extracts a YouTube video ID from a URL or returns the string as-is if
 * it's already just an ID (11 chars, alphanumeric + _ -).
 */
function extractVideoId(input) {
  try {
    const url = new URL(input);
    // youtu.be short links
    if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1).split('?')[0];
    }
    // youtube.com/watch?v=...
    const v = url.searchParams.get('v');
    if (v) return v;
    // youtube.com/embed/<id> or youtube.com/shorts/<id>
    const parts = url.pathname.split('/').filter(Boolean);
    if (['embed', 'shorts', 'v'].includes(parts[0]) && parts[1]) return parts[1];
  } catch {
    // Not a URL — could be a bare video ID
  }
  // Bare 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) {
    return input.trim();
  }
  return null;
}

function normalizeTranscriptUnits(items) {
  if (!Array.isArray(items) || items.length === 0) return [];

  const sample = items.slice(0, 8);
  const looksLikeMilliseconds = sample.some((item) => {
    const duration = Number(item?.duration ?? 0);
    const offset = Number(item?.offset ?? item?.start ?? 0);
    // Caption durations over ~30 are unlikely in seconds for normal subtitle chunks.
    return duration > 30 || offset > 300;
  });

  const factor = looksLikeMilliseconds ? 1 / 1000 : 1;

  return items.map((item) => {
    const startRaw = Number(item?.offset ?? item?.start ?? 0);
    const durationRaw = Number(item?.duration ?? 0);
    const start = Number.isFinite(startRaw) ? startRaw * factor : 0;
    const duration = Number.isFinite(durationRaw) ? durationRaw * factor : 0;

    return {
      text: item?.text ?? '',
      start,
      duration,
      offset: start,
    };
  });
}

function chunkTranscript(items, maxChars = 800) {
  const chunks = [];
  let buffer = [];
  let currentChars = 0;

  for (const item of items) {
    const text = (item.text ?? '').trim();
    if (!text) continue;

    const segmentSize = text.length + 1;
    if (buffer.length > 0 && currentChars + segmentSize > maxChars) {
      chunks.push(buildChunk(buffer, chunks.length));
      buffer = [];
      currentChars = 0;
    }

    buffer.push(item);
    currentChars += segmentSize;
  }

  if (buffer.length > 0) {
    chunks.push(buildChunk(buffer, chunks.length));
  }

  return chunks;
}

function buildChunk(lines, index) {
  const start = Number(lines[0]?.offset ?? lines[0]?.start ?? 0);
  const last = lines[lines.length - 1];
  const lastOffset = Number(last?.offset ?? last?.start ?? 0);
  const lastDuration = Number(last?.duration ?? 0);
  const end = Math.max(start, lastOffset + lastDuration);

  return {
    chunkId: `chunk-${index}`,
    start,
    end,
    text: lines.map((line) => line.text).join(' ').replace(/\s+/g, ' ').trim(),
  };
}

function dotProduct(a, b) {
  const len = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < len; i += 1) {
    sum += a[i] * b[i];
  }
  return sum;
}

function magnitude(vector) {
  let sum = 0;
  for (let i = 0; i < vector.length; i += 1) {
    sum += vector[i] * vector[i];
  }
  return Math.sqrt(sum);
}

function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length) return 0;
  const denominator = magnitude(a) * magnitude(b);
  if (denominator === 0) return 0;
  return dotProduct(a, b) / denominator;
}

function getSessionKey(sessionId, videoId) {
  return `${sessionId}::${videoId}`;
}

function normalizeQuestionText(text) {
  return (text ?? '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSessionMemory(sessionId, videoId) {
  const key = getSessionKey(sessionId, videoId);
  return sessionStore.get(key) ?? [];
}

function getAnalytics(sessionId, videoId) {
  const key = getSessionKey(sessionId, videoId);
  if (!analyticsStore.has(key)) {
    analyticsStore.set(key, {
      totalQuestions: 0,
      fallbackAnswers: 0,
      repeatedQuestions: 0,
      confusionSignals: 0,
      quizMistakes: 0,
      topicStats: new Map(),
      replayBuckets: new Map(),
      confusionBuckets: new Map(),
      recentReplayBuckets: [],
      activityFeed: [],
    });
  }
  return analyticsStore.get(key);
}

function appendActivity(sessionId, videoId, entry) {
  const analytics = getAnalytics(sessionId, videoId);
  if (!Array.isArray(analytics.activityFeed)) {
    analytics.activityFeed = [];
  }
  analytics.activityFeed.push({
    ...entry,
    at: entry.at ?? Date.now(),
  });
  analytics.activityFeed = analytics.activityFeed.slice(-80);
}

function extractTopicTokens(text, limit = 3) {
  const stopWords = new Set([
    'what',
    'when',
    'where',
    'which',
    'who',
    'why',
    'how',
    'this',
    'that',
    'from',
    'with',
    'about',
    'into',
    'your',
    'have',
    'does',
    'please',
    'explain',
    'video',
    'lecture',
  ]);

  const tokens = Array.from(tokenizeForOverlap(text)).filter((token) => !stopWords.has(token));
  return tokens.slice(0, limit);
}

function trackReplay(sessionId, videoId, timestampSeconds) {
  const analytics = getAnalytics(sessionId, videoId);
  const sec = Math.max(0, Number(timestampSeconds) || 0);
  const bucket = Math.floor(sec / 10) * 10;
  analytics.replayBuckets.set(bucket, (analytics.replayBuckets.get(bucket) ?? 0) + 1);
  analytics.recentReplayBuckets = [...analytics.recentReplayBuckets, bucket].slice(-20);
  appendActivity(sessionId, videoId, {
    type: 'replay',
    label: `Replay at ${formatTimestamp(sec)}`,
    second: Math.floor(sec),
  });
}

function trackQuizMistake(sessionId, videoId, topic = 'general') {
  const analytics = getAnalytics(sessionId, videoId);
  analytics.quizMistakes += 1;
  const stats = analytics.topicStats.get(topic) ?? { mentions: 0, struggles: 0 };
  stats.mentions += 1;
  stats.struggles += 1;
  analytics.topicStats.set(topic, stats);
}

function trackQuestionOutcome(sessionId, videoId, question, answer, signals) {
  const analytics = getAnalytics(sessionId, videoId);
  analytics.totalQuestions += 1;
  if (answer === FALLBACK_ANSWER) analytics.fallbackAnswers += 1;
  if (signals.repeated) analytics.repeatedQuestions += 1;
  if (signals.confusing) analytics.confusionSignals += 1;

  if ((signals.confusing || answer === FALLBACK_ANSWER) && analytics.recentReplayBuckets.length > 0) {
    const lastReplayBucket = analytics.recentReplayBuckets[analytics.recentReplayBuckets.length - 1];
    analytics.confusionBuckets.set(
      lastReplayBucket,
      (analytics.confusionBuckets.get(lastReplayBucket) ?? 0) + 1
    );
  }

  const topics = extractTopicTokens(question);
  for (const topic of topics) {
    const stats = analytics.topicStats.get(topic) ?? { mentions: 0, struggles: 0 };
    stats.mentions += 1;
    if (signals.confusing || signals.repeated || answer === FALLBACK_ANSWER) {
      stats.struggles += 1;
    }
    analytics.topicStats.set(topic, stats);
  }
}

function computeLearnerInsights(sessionId, videoId) {
  const analytics = getAnalytics(sessionId, videoId);
  const topicEntries = Array.from(analytics.topicStats.entries()).map(([topic, stats]) => {
    const difficulty = stats.mentions === 0 ? 0 : stats.struggles / stats.mentions;
    return { topic, ...stats, difficulty };
  });

  topicEntries.sort((a, b) => b.difficulty - a.difficulty || b.mentions - a.mentions);
  const weakTopics = topicEntries.slice(0, 4).map((entry) => ({
    topic: entry.topic,
    mentions: entry.mentions,
    struggleRate: Number(entry.difficulty.toFixed(2)),
  }));

  const replayHotspots = Array.from(analytics.replayBuckets.entries())
    .map(([bucket, count]) => ({ timestamp: bucket, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const confusionHeatmap = Array.from(analytics.confusionBuckets.entries())
    .map(([bucket, count]) => ({ timestamp: bucket, intensity: count }))
    .sort((a, b) => a.timestamp - b.timestamp);

  const mostAskedConcepts = topicEntries
    .slice()
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 5)
    .map((entry) => ({
      concept: entry.topic,
      mentions: entry.mentions,
      struggleRate: Number(entry.difficulty.toFixed(2)),
    }));

  const confusionScoreRaw =
    analytics.confusionSignals + analytics.repeatedQuestions + analytics.fallbackAnswers;
  const confusionScore = Math.min(100, confusionScoreRaw * 8);
  const confusionLevel =
    confusionScore >= 70 ? 'High' : confusionScore >= 35 ? 'Medium' : 'Low';

  const retentionPenalty =
    analytics.fallbackAnswers * 12 +
    analytics.repeatedQuestions * 6 +
    analytics.confusionSignals * 7 +
    analytics.quizMistakes * 8;
  const retentionScore = Math.max(0, Math.min(100, 100 - retentionPenalty));

  return {
    weakTopics,
    replayHotspots,
    confusionHeatmap,
    mostAskedConcepts,
    summary: {
      totalQuestions: analytics.totalQuestions,
      repeatedQuestions: analytics.repeatedQuestions,
      confusionSignals: analytics.confusionSignals,
      fallbackAnswers: analytics.fallbackAnswers,
      quizMistakes: analytics.quizMistakes,
      confusionLevel,
      confusionScore,
      retentionScore,
      fallbackRate:
        analytics.totalQuestions === 0
          ? 0
          : Number((analytics.fallbackAnswers / analytics.totalQuestions).toFixed(2)),
    },
    learningPatterns: {
      frequentlyRevisitedTopics: weakTopics.map((item) => item.topic),
      replayedSegments: replayHotspots.map((item) => item.timestamp),
    },
  };
}

function saveSessionTurn(sessionId, videoId, question, answer) {
  const key = getSessionKey(sessionId, videoId);
  const existing = sessionStore.get(key) ?? [];
  const next = [
    ...existing,
    {
      question,
      answer,
      normalizedQuestion: normalizeQuestionText(question),
      createdAt: Date.now(),
    },
  ].slice(-MAX_MEMORY_TURNS);
  sessionStore.set(key, next);
  const q = String(question ?? '').trim();
  appendActivity(sessionId, videoId, {
    type: 'question',
    label: q.length > 120 ? `${q.slice(0, 117)}…` : q,
  });
}

function detectMemorySignals(question, history) {
  const normalized = normalizeQuestionText(question);
  if (!normalized) {
    return {
      repeated: false,
      confusing: false,
      repeatedQuestion: '',
    };
  }

  const repeats = history.filter((turn) => turn.normalizedQuestion === normalized);
  const confusionKeywords = ['confuse', 'still', "don't understand", 'again', 'not clear'];
  const confusingByWords = confusionKeywords.some((word) => normalized.includes(word));
  const repeated = repeats.length > 0;
  const confusing = confusingByWords || repeats.length >= 2;

  return {
    repeated,
    confusing,
    repeatedQuestion: repeats[repeats.length - 1]?.question ?? '',
  };
}

function tokenizeForOverlap(text) {
  return new Set(
    String(text ?? '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2)
  );
}

function hasLexicalOverlap(question, chunks) {
  const qTokens = tokenizeForOverlap(question);
  if (qTokens.size === 0) return false;

  return chunks.some((chunk) => {
    const chunkTokens = tokenizeForOverlap(chunk.text);
    let overlap = 0;
    for (const token of qTokens) {
      if (chunkTokens.has(token)) overlap += 1;
      if (overlap >= 2) return true;
    }
    return false;
  });
}

async function parseJsonSafe(response) {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

function extractApiError(data, fallback) {
  if (typeof data?.error?.message === 'string') return data.error.message;
  if (typeof data?.message === 'string') return data.message;
  if (typeof data?.detail === 'string') return data.detail;
  if (typeof data?.raw === 'string') return data.raw.slice(0, 400);
  if (data && typeof data === 'object') return JSON.stringify(data).slice(0, 500);
  return fallback;
}

function isPersonIdentityQuestion(question) {
  const q = String(question ?? '').toLowerCase();
  return (
    /\bwho is (she|he|this person|that person)\b/.test(q) ||
    /\btell me about (her|him|this person|that person)\b/.test(q) ||
    /\bwho is in (the )?video\b/.test(q)
  );
}

function isVisualQuestion(question) {
  const q = String(question ?? '').toLowerCase();
  return /\b(diagram|shown|show|screen|slide|image|visual|figure|chart|graph|seen|looks like)\b/.test(
    q
  );
}

async function commandExists(command) {
  try {
    await execFileAsync('which', [command]);
    return true;
  } catch {
    return false;
  }
}

function formatTimestamp(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

async function sampleFramesForVideo(videoId) {
  const hasFfmpeg = await commandExists('ffmpeg');
  const hasYtDlp = await commandExists('yt-dlp');
  if (!hasFfmpeg || !hasYtDlp) {
    throw new Error('ffmpeg or yt-dlp is not available for visual extraction.');
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'lms-frames-'));
  const videoPath = path.join(tmpDir, `${videoId}.mp4`);
  const framePattern = path.join(tmpDir, 'frame-%03d.jpg');

  try {
    await execFileAsync('yt-dlp', [
      '-f',
      'bv*[height<=360]+ba/b[height<=360]/b',
      '-o',
      videoPath,
      '--no-playlist',
      url,
    ]);

    await execFileAsync('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      videoPath,
      '-vf',
      `fps=1/${FRAME_INTERVAL_SECONDS}`,
      '-frames:v',
      String(MAX_FRAMES),
      framePattern,
    ]);

    const names = (await readdir(tmpDir))
      .filter((name) => /^frame-\d+\.jpg$/.test(name))
      .sort();

    return Promise.all(
      names.map(async (name, index) => ({
        timestamp: index * FRAME_INTERVAL_SECONDS,
        imageBase64: (await readFile(path.join(tmpDir, name))).toString('base64'),
      }))
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

async function fetchVideoMetadata(videoId) {
  const hasYtDlp = await commandExists('yt-dlp');
  if (!hasYtDlp) return null;

  try {
    const { stdout } = await execFileAsync('yt-dlp', [
      '--dump-single-json',
      '--skip-download',
      `https://www.youtube.com/watch?v=${videoId}`,
    ]);
    const data = JSON.parse(stdout);
    return {
      title: data?.title ?? '',
      channel: data?.channel ?? data?.uploader ?? '',
      uploader: data?.uploader ?? '',
      webpageUrl: data?.webpage_url ?? `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch {
    return null;
  }
}

async function searchPersonOnWeb(query) {
  const res = await fetch(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=0`
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) return null;

  const related = Array.isArray(data?.RelatedTopics)
    ? data.RelatedTopics.flatMap((topic) => (Array.isArray(topic?.Topics) ? topic.Topics : [topic]))
    : [];
  const relatedText = related
    .map((item) => item?.Text)
    .filter((text) => typeof text === 'string')
    .slice(0, 4);

  const snippets = [
    data?.Heading ? `Heading: ${data.Heading}` : '',
    data?.AbstractText ? `Abstract: ${data.AbstractText}` : '',
    ...relatedText.map((text, idx) => `Related ${idx + 1}: ${text}`),
  ]
    .filter(Boolean)
    .join('\n');

  return snippets.trim() ? snippets : null;
}

async function maybeResolvePersonFromWeb(videoId, question) {
  if (!isPersonIdentityQuestion(question)) return null;

  const metadata = await fetchVideoMetadata(videoId);
  if (!metadata) return null;

  const [titleLookup, channelLookup] = await Promise.all([
    searchPersonOnWeb(`${metadata.title} ${metadata.channel} who is she`),
    searchPersonOnWeb(`${metadata.channel} biography`),
  ]);

  const evidence = [titleLookup, channelLookup].filter(Boolean).join('\n\n');
  if (!evidence) return null;

  return { metadata, evidence };
}

async function describeFrameWithVision(videoId, frame) {
  const prompt =
    `Describe only what is visibly shown in this lecture frame. ` +
    `Focus on diagrams, code, formulas, slides, and labels. Keep it under 40 words.`;

  const imageUrl = `data:image/jpeg;base64,${frame.imageBase64}`;
  const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NIM_API_KEY}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 120,
    }),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const reason = extractApiError(data, 'NIM vision request failed.');
    throw new Error(`NIM vision request failed (${res.status}): ${reason}`);
  }

  const text = data?.choices?.[0]?.message?.content?.trim() ?? '';
  return {
    chunkId: `visual-${videoId}-${Math.round(frame.timestamp)}`,
    start: frame.timestamp,
    end: frame.timestamp + 2,
    text: `Visual context around ${formatTimestamp(frame.timestamp)}: ${text || 'No clear visual details.'}`,
    sourceType: 'visual',
  };
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
    const chunk = await describeFrameWithVision(videoId, frame);
    const embedding = await embedText(chunk.text, 'passage');
    chunks.push({ ...chunk, embedding });
  }

  return { chunks, status: 'ready', createdAt: Date.now() };
}

function ensureVisualContext(videoId) {
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

function getVisualContext(videoId) {
  const current = visualStore.get(videoId);
  if (!current || current.status !== 'ready') return [];
  return current.chunks ?? [];
}

async function requestEmbedding(model, payload) {
  const res = await fetch(`${NIM_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NIM_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      ...payload,
    }),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const reason = extractApiError(data, 'NIM embedding request failed.');
    throw new Error(`[model=${model}] (${res.status}) ${reason}`);
  }

  const vector = data?.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error(`[model=${model}] Embedding API returned an empty vector.`);
  }
  return vector;
}

async function embedText(text, inputType) {
  const models = [EMBEDDING_MODEL, ...EMBEDDING_FALLBACK_MODELS].filter(
    (model, idx, arr) => arr.indexOf(model) === idx
  );
  const payloadVariants = [
    { input: [text], input_type: inputType, encoding_format: 'float' },
    { input: [text], encoding_format: 'float' },
    { input: text, encoding_format: 'float' },
  ];

  const strategyKey = `inputType:${inputType}`;
  const cached = embeddingStrategyCache.get(strategyKey);
  if (cached) {
    try {
      return await requestEmbedding(cached.model, cached.payload);
    } catch {
      embeddingStrategyCache.delete(strategyKey);
    }
  }

  const errors = [];
  for (const model of models) {
    for (let idx = 0; idx < payloadVariants.length; idx += 1) {
      const payload = payloadVariants[idx];
      try {
        const vector = await requestEmbedding(model, payload);
        embeddingStrategyCache.set(strategyKey, { model, payload });
        return vector;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(message);
      }
    }
  }

  throw new Error(`NIM embedding request failed. Attempts: ${errors.join(' | ')}`);
}

async function generateGroundedAnswer(
  question,
  topChunks,
  memory,
  learnerInsights,
  externalProfileContext = ''
) {
  const context = topChunks
    .map(
      (chunk, idx) =>
        `[${idx + 1}] (${chunk.sourceType ?? 'transcript'}) ${chunk.start.toFixed(2)}s-${chunk.end.toFixed(2)}s\n${chunk.text}`
    )
    .join('\n\n');

  const historyBlock =
    memory.history.length === 0
      ? 'No prior chat turns in this session.'
      : memory.history
          .map(
            (turn, index) =>
              `${index + 1}. User: ${turn.question}\n   Assistant: ${turn.answer}`
          )
          .join('\n');

  const prompt = `You are an AI lecture companion for a single lecture transcript.
Strict Rules:
- Answer ONLY using the transcript context provided below.
- Do NOT use external knowledge, assumptions, or generic explanations.
- If the answer is missing or unclear in context, respond exactly: "${FALLBACK_ANSWER}"
- Reject unrelated/general questions by responding exactly: "${FALLBACK_ANSWER}"
- Keep the answer concise and instructional.
- When possible, include lecture timestamps from context in the answer (example: "around 12:43").
- Use recent session memory to personalize guidance and acknowledge learning struggles when relevant.
- If this appears repeated/confusing, briefly acknowledge it (example: "You previously asked about recursion.").
- Use visual context lines when the user asks about diagrams, on-screen text, or what is shown.
- For person-identity questions, you may use "External profile context" if provided.
- If no relevant evidence exists, respond exactly: "${FALLBACK_ANSWER}".

Question:
${question}

Recent session memory:
${historyBlock}

Memory hints:
- repeated_question: ${memory.signals.repeated ? 'yes' : 'no'}
- confusing_followup: ${memory.signals.confusing ? 'yes' : 'no'}
- previous_similar_question: ${memory.signals.repeatedQuestion || 'none'}

Learner behavior summary:
- confusion_level: ${learnerInsights.summary.confusionLevel}
- repeated_questions: ${learnerInsights.summary.repeatedQuestions}
- quiz_mistakes: ${learnerInsights.summary.quizMistakes}
- weak_topics: ${learnerInsights.weakTopics.map((item) => item.topic).join(', ') || 'none'}
- replay_hotspots: ${
    learnerInsights.replayHotspots.map((item) => formatTimestamp(item.timestamp)).join(', ') || 'none'
  }

External profile context:
${externalProfileContext || 'none'}

Transcript context:
${context}
`;

  const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NIM_API_KEY}`,
    },
    body: JSON.stringify({
      model: GENERATION_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 260,
    }),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const reason = extractApiError(data, 'NIM chat request failed.');
    throw new Error(`NIM chat request failed (${res.status}): ${reason}`);
  }

  const answer = data?.choices?.[0]?.message?.content?.trim();
  if (!answer) {
    return FALLBACK_ANSWER;
  }
  return answer;
}

async function buildOrGetRagIndex(videoId, transcript) {
  const normalized = normalizeTranscriptUnits(transcript ?? []);
  const visualChunks = getVisualContext(videoId);
  const signature = `${normalized.length}:${visualChunks.length}`;
  const existing = ragStore.get(videoId);

  if (existing && existing.signature === signature) {
    return existing;
  }

  const chunks = chunkTranscript(normalized);
  const withEmbeddings = [];
  for (const chunk of chunks) {
    const embedding = await embedText(chunk.text, 'passage');
    withEmbeddings.push({ ...chunk, embedding, sourceType: 'transcript' });
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

/**
 * GET /api/transcript?videoId=<id_or_url>
 *
 * Returns: { transcript: [{ text, start, duration }] }
 * Errors:  { error: "..." }  with appropriate HTTP status
 */
app.get('/api/transcript', async (req, res) => {
  const raw = req.query.videoId;

  if (!raw) {
    return res.status(400).json({ error: 'Missing required query param: videoId' });
  }

  const videoId = extractVideoId(raw);

  if (!videoId) {
    return res
      .status(400)
      .json({ error: 'Invalid video ID or URL. Could not extract a YouTube video ID.' });
  }

  try {
    const rawTranscript = await YoutubeTranscript.fetchTranscript(videoId);

    const transcript = normalizeTranscriptUnits(rawTranscript);
    buildOrGetRagIndex(videoId, transcript).catch((error) => {
      console.warn(`[rag] warmup failed for ${videoId}: ${error?.message ?? error}`);
    });
    ensureVisualContext(videoId).catch((error) => {
      console.warn(`[visual] warmup failed for ${videoId}: ${error?.message ?? error}`);
    });

    return res.json({ transcript });
  } catch (err) {
    const msg = err?.message ?? String(err);
    console.error(`[transcript] Error for videoId="${videoId}":`, msg);

    if (
      msg.includes('Transcript is disabled') ||
      msg.includes('No captions') ||
      msg.includes('subtitles are disabled')
    ) {
      return res.status(404).json({
        error: 'This video does not have a transcript. Subtitles may be disabled.',
      });
    }

    if (msg.includes('Could not find') || msg.includes('No transcript')) {
      return res.status(404).json({
        error: 'No transcript found for this video.',
      });
    }

    reportServerError(err, { route: 'GET /api/transcript', videoId });
    return res.status(500).json({
      error: 'Failed to fetch transcript. The video may be private, age-restricted, or unavailable.',
    });
  }
});

app.post('/api/ask', async (req, res) => {
  if (!NIM_API_KEY) {
    return res.status(500).json({
      error: 'NIM_API_KEY (or NVIDIA_NIM_API_KEY) is missing on the server.',
    });
  }

  const { videoId, question, transcript, sessionId } = req.body ?? {};

  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({ error: 'videoId is required.' });
  }
  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'question is required.' });
  }
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId is required.' });
  }
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return res.status(400).json({ error: 'transcript is required.' });
  }

  try {
    const visualQuestion = isVisualQuestion(question);
    if (visualQuestion) {
      await Promise.race([
        ensureVisualContext(videoId),
        new Promise((resolve) => setTimeout(resolve, VISUAL_CONTEXT_TIMEOUT_MS)),
      ]);
    } else {
      // Keep visual pipeline running in the background without blocking normal asks.
      ensureVisualContext(videoId).catch(() => {});
    }

    const history = getSessionMemory(sessionId, videoId);
    const signals = detectMemorySignals(question.trim(), history);
    const learnerInsights = computeLearnerInsights(sessionId, videoId);
    const index = await buildOrGetRagIndex(videoId, transcript);
    const questionEmbedding = await embedText(question.trim(), 'query');

    const ranked = index.chunks
      .map((chunk) => ({
        ...chunk,
        score: cosineSimilarity(questionEmbedding, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score);

    const topChunks = ranked.slice(0, RETRIEVAL_TOP_K);
    const bestScore = topChunks[0]?.score ?? 0;
    const lexicalMatch = hasLexicalOverlap(question.trim(), topChunks);
    const webProfile = await maybeResolvePersonFromWeb(videoId, question.trim());
    if (!topChunks.length || (bestScore < MIN_RELEVANCE_SCORE && !lexicalMatch)) {
      if (webProfile) {
        const memory = {
          history: history.slice(-4),
          signals,
        };
        const answerFromWeb = await generateGroundedAnswer(
          question.trim(),
          topChunks,
          memory,
          learnerInsights,
          `Video title: ${webProfile.metadata.title}
Channel: ${webProfile.metadata.channel}
Video URL: ${webProfile.metadata.webpageUrl}
Web evidence:
${webProfile.evidence}`
        );
        saveSessionTurn(sessionId, videoId, question.trim(), answerFromWeb);
        trackQuestionOutcome(sessionId, videoId, question.trim(), answerFromWeb, signals);
        return res.json({ answer: answerFromWeb, sources: [] });
      }

      const answer = FALLBACK_ANSWER;
      saveSessionTurn(sessionId, videoId, question.trim(), answer);
      trackQuestionOutcome(sessionId, videoId, question.trim(), answer, signals);
      return res.json({
        answer: FALLBACK_ANSWER,
        sources: [],
      });
    }

    const memory = {
      history: history.slice(-4),
      signals,
    };
    const answer = await generateGroundedAnswer(
      question.trim(),
      topChunks,
      memory,
      learnerInsights,
      webProfile
        ? `Video title: ${webProfile.metadata.title}
Channel: ${webProfile.metadata.channel}
Video URL: ${webProfile.metadata.webpageUrl}
Web evidence:
${webProfile.evidence}`
        : ''
    );
    saveSessionTurn(sessionId, videoId, question.trim(), answer);
    trackQuestionOutcome(sessionId, videoId, question.trim(), answer, signals);
    const sources = topChunks.map((chunk) => ({
      chunkId: chunk.chunkId,
      start: chunk.start,
      end: chunk.end,
      score: Number(chunk.score.toFixed(4)),
    }));

    return res.json({ answer, sources });
  } catch (err) {
    const message = err?.message ?? 'Failed to process question.';
    console.error('[ask]', message);
    reportServerError(err, { route: 'POST /api/ask' });
    return res.status(500).json({
      error: message,
    });
  }
});

app.post('/api/track', (req, res) => {
  const { sessionId, videoId, eventType, timestamp, topic } = req.body ?? {};
  if (!sessionId || !videoId || !eventType) {
    return res.status(400).json({ error: 'sessionId, videoId and eventType are required.' });
  }

  if (eventType === 'replay') {
    trackReplay(sessionId, videoId, timestamp ?? 0);
  } else if (eventType === 'quiz_mistake') {
    trackQuizMistake(sessionId, videoId, typeof topic === 'string' ? topic : 'general');
  }

  return res.json({ ok: true });
});

app.get('/api/insights', (req, res) => {
  const sessionId = req.query.sessionId;
  const videoId = req.query.videoId;

  if (!sessionId || !videoId) {
    return res.status(400).json({ error: 'sessionId and videoId are required.' });
  }

  const insights = computeLearnerInsights(String(sessionId), String(videoId));
  return res.json(insights);
});

app.get('/api/session-timeline', (req, res) => {
  const sessionId = String(req.query.sessionId ?? '');
  const videoId = String(req.query.videoId ?? '');
  const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 28));

  if (!sessionId || !videoId) {
    return res.status(400).json({ error: 'sessionId and videoId are required.' });
  }

  const analytics = getAnalytics(sessionId, videoId);
  const feed = Array.isArray(analytics.activityFeed) ? analytics.activityFeed : [];
  const items = feed
    .slice()
    .sort((a, b) => (b.at ?? 0) - (a.at ?? 0))
    .slice(0, limit);

  return res.json({ items });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

if (SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.listen(PORT, () => {
  console.log(`✅  Transcript API server running on http://localhost:${PORT}`);
});
