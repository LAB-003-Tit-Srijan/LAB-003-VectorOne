import {
  NIM_API_KEY,
  NIM_BASE_URL,
  NIM_CHAT_MODEL,
  GEMINI_CHAT_MAX_QUESTION_CHARS,
  GEMINI_CHAT_MAX_TRANSCRIPT_CHARS,
} from '../config/env.js';
import { parseJsonSafe, extractApiError } from '../utils/http.js';
import { parseModelJson } from './gemini-summarize.service.js';
import { formatTranscriptContext } from './gemini-chat.service.js';

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

const SYSTEM_PROMPT = `You are a teaching assistant. Answer using ONLY the lecture transcript context provided.
If the context does not contain enough information, say so clearly in your answer.
Reply with ONLY valid JSON — no markdown fences, no commentary before or after the JSON object.
Do not invent facts that are not grounded in the transcript.`;

/**
 * POST /api/chat via NVIDIA NIM OpenAI-compatible chat/completions.
 *
 * @param {{ question: string, transcriptContext: unknown }} params
 * @returns {Promise<{ answer: string, timestamps: number[], relatedTopics: string[] }>}
 */
export async function chatWithTranscriptContextNim({ question, transcriptContext }) {
  if (!NIM_API_KEY) {
    const err = new Error('NIM_API_KEY is not configured.');
    err.code = 'NIM_NOT_CONFIGURED';
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

  const userPrompt = `Use the transcript context to answer the question.

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

  // Some NIM models (e.g. Gemma) reject `role: "system"`; fold instructions into the user turn.
  const body = {
    model: NIM_CHAT_MODEL,
    messages: [
      {
        role: 'user',
        content: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
      },
    ],
    temperature: 0.35,
    max_tokens: 2048,
  };

  const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NIM_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const reason = extractApiError(data, 'NIM chat request failed.');
    const err = new Error(`NIM chat request failed (${res.status}): ${reason}`);
    err.code = 'NIM_CHAT_HTTP';
    err.status = res.status;
    throw err;
  }

  const rawText = data?.choices?.[0]?.message?.content?.trim() ?? '';
  if (!rawText) {
    throw new Error('NIM returned an empty response.');
  }

  let parsed;
  try {
    parsed = parseModelJson(rawText);
  } catch {
    throw new Error('Model response was not valid JSON.');
  }

  if (typeof parsed.answer !== 'string' || !parsed.answer.trim()) {
    throw new Error('Invalid model response: "answer" must be a non-empty string.');
  }

  return {
    answer: parsed.answer.trim(),
    timestamps: normalizeTimestampArray(parsed.timestamps),
    relatedTopics: normalizeTopicArray(parsed.relatedTopics),
  };
}
