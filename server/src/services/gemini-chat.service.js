import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  GEMINI_API_KEY,
  GEMINI_CHAT_MAX_QUESTION_CHARS,
  GEMINI_CHAT_MAX_TRANSCRIPT_CHARS,
  GEMINI_MODEL,
} from '../config/env.js';
import { parseModelJson } from './gemini-summarize.service.js';

const SYSTEM_INSTRUCTION = `You are a teaching assistant. Answer using ONLY the lecture transcript context provided.
If the context does not contain enough information, say so clearly in your answer.
Always reply with ONLY valid JSON — no markdown fences, no commentary before or after the JSON object.
Do not invent facts that are not grounded in the transcript.`;

/**
 * @param {unknown} transcriptContext
 * @returns {string}
 */
export function formatTranscriptContext(transcriptContext) {
  if (transcriptContext === undefined || transcriptContext === null) {
    throw new Error('transcriptContext is required.');
  }

  if (typeof transcriptContext === 'string') {
    const s = transcriptContext.trim();
    if (!s) throw new Error('transcriptContext must not be empty.');
    return s;
  }

  if (Array.isArray(transcriptContext)) {
    if (transcriptContext.length === 0) {
      throw new Error('transcriptContext array must not be empty.');
    }

    const parts = [];
    for (let i = 0; i < transcriptContext.length; i++) {
      const item = transcriptContext[i];
      if (typeof item === 'string') {
        const t = item.trim();
        if (t) parts.push(`[${i}] ${t}`);
        continue;
      }
      if (item && typeof item === 'object') {
        const text = String(item.text ?? item.content ?? '').trim();
        if (!text) continue;
        const start = item.start ?? item.offset;
        const end = item.end;
        const chunkId = item.chunkId != null ? String(item.chunkId) : null;
        if (typeof start === 'number' && typeof end === 'number' && Number.isFinite(start) && Number.isFinite(end)) {
          const label = chunkId ? `${chunkId} ` : '';
          parts.push(`[${i}] ${label}(${start}s–${end}s)\n${text}`);
        } else {
          parts.push(`[${i}] ${text}`);
        }
      }
    }

    if (parts.length === 0) {
      throw new Error('transcriptContext array did not contain usable text.');
    }
    return parts.join('\n\n');
  }

  throw new Error('transcriptContext must be a string or an array of strings or chunk objects.');
}

/**
 * @param {unknown} value
 * @returns {number[]}
 */
function normalizeTimestampArray(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const v of value) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      out.push(Math.max(0, v));
      continue;
    }
    if (typeof v === 'string') {
      const n = parseFloat(v.replace(/,/g, ''));
      if (Number.isFinite(n)) out.push(Math.max(0, n));
    }
  }
  return out;
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function normalizeTopicArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((t) => String(t ?? '').trim())
    .filter(Boolean)
    .slice(0, 20);
}

/**
 * Answer a user question with Gemini using transcript context; response is structured JSON.
 *
 * @param {{ question: string, transcriptContext: unknown }} params
 * @returns {Promise<{ answer: string, timestamps: number[], relatedTopics: string[] }>}
 */
export async function chatWithTranscriptContext({ question, transcriptContext }) {
  if (!GEMINI_API_KEY) {
    const err = new Error('GEMINI_API_KEY is not configured.');
    err.code = 'GEMINI_NOT_CONFIGURED';
    throw err;
  }

  const q = typeof question === 'string' ? question.trim() : '';
  if (!q) {
    const err = new Error('question is required.');
    err.code = 'INVALID_QUESTION';
    throw err;
  }
  if (q.length > GEMINI_CHAT_MAX_QUESTION_CHARS) {
    const err = new Error(
      `question exceeds maximum length of ${GEMINI_CHAT_MAX_QUESTION_CHARS} characters.`
    );
    err.code = 'QUESTION_TOO_LONG';
    throw err;
  }

  const contextBlock = formatTranscriptContext(transcriptContext);
  const truncated =
    contextBlock.length > GEMINI_CHAT_MAX_TRANSCRIPT_CHARS
      ? `${contextBlock.slice(0, GEMINI_CHAT_MAX_TRANSCRIPT_CHARS)}\n\n[… transcript truncated …]`
      : contextBlock;

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.35,
      responseMimeType: 'application/json',
    },
  });

  const prompt = `Use the transcript context to answer the question.

Return a single JSON object with EXACTLY these keys:
1. "answer" — string: a clear, helpful answer grounded in the transcript.
2. "timestamps" — array of numbers: seconds (e.g. 125.5) in the lecture where supporting evidence appears. Use times from cue markers in the context when present; otherwise estimate best-effort or use an empty array.
3. "relatedTopics" — array of strings: 2–6 short follow-up topics or concepts mentioned in the transcript that relate to the question.

QUESTION:
"""
${q}
"""

TRANSCRIPT CONTEXT:
"""
${truncated}
"""`;

  const result = await model.generateContent(prompt);
  const outText = result.response.text();
  const parsed = parseModelJson(outText);

  if (typeof parsed.answer !== 'string' || !parsed.answer.trim()) {
    throw new Error('Invalid model response: "answer" must be a non-empty string.');
  }

  return {
    answer: parsed.answer.trim(),
    timestamps: normalizeTimestampArray(parsed.timestamps),
    relatedTopics: normalizeTopicArray(parsed.relatedTopics),
  };
}
