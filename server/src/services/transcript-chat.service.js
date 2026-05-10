import {
  NIM_API_KEY,
  GEMINI_API_KEY,
  TRANSCRIPT_CHAT_PROVIDER,
} from '../config/env.js';
import { chatWithTranscriptContext } from './gemini-chat.service.js';
import { chatWithTranscriptContextNim } from './nim-chat.service.js';

/**
 * Which backend handles POST /api/chat.
 * @returns {'nim' | 'gemini' | null}
 */
export function resolveChatProvider() {
  const mode = TRANSCRIPT_CHAT_PROVIDER;

  if (mode === 'nim') {
    return NIM_API_KEY ? 'nim' : null;
  }
  if (mode === 'gemini') {
    return GEMINI_API_KEY ? 'gemini' : null;
  }

  // auto: prefer NIM when configured (same stack as /api/ask embeddings path)
  if (NIM_API_KEY) return 'nim';
  if (GEMINI_API_KEY) return 'gemini';
  return null;
}

/**
 * Unified transcript Q&A with structured JSON (answer, timestamps, relatedTopics).
 *
 * @param {{ question: string, transcriptContext: unknown }} params
 */
export async function chatWithTranscriptUnified(params) {
  const provider = resolveChatProvider();

  if (!provider) {
    const err = new Error(
      'No chat provider configured. Set NIM_API_KEY (recommended) or GEMINI_API_KEY, or set TRANSCRIPT_CHAT_PROVIDER=nim|gemini.'
    );
    err.code = 'NO_CHAT_PROVIDER';
    throw err;
  }

  if (provider === 'nim') {
    return chatWithTranscriptContextNim(params);
  }

  return chatWithTranscriptContext(params);
}
