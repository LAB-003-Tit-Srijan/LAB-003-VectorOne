import {
  chatWithTranscriptUnified,
  resolveChatProvider,
} from '../services/transcript-chat.service.js';
import { reportServerError } from '../middleware/sentry.js';

/**
 * POST /api/chat
 * Body: { question: string, transcriptContext: string | Array<string | { text, start?, end?, offset?, chunkId? }> }
 *
 * Uses NVIDIA NIM or Gemini based on TRANSCRIPT_CHAT_PROVIDER (default auto: NIM if NIM_API_KEY set).
 */
export async function postChat(req, res) {
  if (!resolveChatProvider()) {
    return res.status(503).json({
      error:
        'Chat AI not configured. Set NIM_API_KEY (recommended for /api/chat) or GEMINI_API_KEY. Optional: TRANSCRIPT_CHAT_PROVIDER=nim|gemini|auto.',
    });
  }

  const { question, transcriptContext } = req.body ?? {};

  try {
    const result = await chatWithTranscriptUnified({
      question,
      transcriptContext,
    });

    return res.status(200).json({
      answer: result.answer,
      timestamps: result.timestamps,
      relatedTopics: result.relatedTopics,
    });
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
    const message = err instanceof Error ? err.message : 'Chat request failed.';

    if (code === 'INVALID_QUESTION' || message.includes('transcriptContext')) {
      return res.status(400).json({ error: message });
    }
    if (code === 'QUESTION_TOO_LONG') {
      return res.status(400).json({ error: message });
    }
    if (code === 'GEMINI_NOT_CONFIGURED' || code === 'NIM_NOT_CONFIGURED' || code === 'NO_CHAT_PROVIDER') {
      return res.status(503).json({ error: message });
    }

    console.error('[chat]', message);
    reportServerError(err, { route: 'POST /api/chat' });

    const status =
      err && typeof err === 'object' && 'status' in err && typeof err.status === 'number'
        ? err.status
        : null;

    if (code === 'NIM_CHAT_HTTP' || (status && status >= 400 && status < 500)) {
      return res.status(502).json({
        error: message.length < 300 ? message : 'NIM rejected the chat request. Check NIM_CHAT_MODEL and API access.',
      });
    }

    if (message.includes('API key') || message.includes('PERMISSION_DENIED')) {
      return res.status(502).json({
        error: 'AI provider rejected the request. Check API key, billing, and model access.',
      });
    }
    if (
      message.includes('Invalid model response') ||
      message.includes('valid JSON') ||
      message.includes('Model response was not valid JSON')
    ) {
      return res.status(502).json({
        error: 'Model returned an unexpected format. Try again.',
      });
    }

    return res.status(500).json({
      error: message.length < 200 ? message : 'Chat failed. Please try again.',
    });
  }
}
