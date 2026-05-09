import {
  GEMINI_API_KEY,
  GEMINI_SUMMARIZE_MAX_INPUT_CHARS,
} from '../config/env.js';
import { summarizeStudyMaterial } from '../services/gemini-summarize.service.js';
import { reportServerError } from '../middleware/sentry.js';

/**
 * POST /api/ai/summarize
 * Body: { "text": "study material" }
 */
export async function postSummarize(req, res) {
  if (!GEMINI_API_KEY) {
    return res.status(503).json({
      error: 'Gemini is not configured. Set GEMINI_API_KEY (or GOOGLE_AI_API_KEY) on the server.',
    });
  }

  const { text } = req.body ?? {};

  if (text === undefined || text === null || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required and must be a string.' });
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return res.status(400).json({ error: 'text must not be empty.' });
  }

  if (trimmed.length > GEMINI_SUMMARIZE_MAX_INPUT_CHARS) {
    return res.status(400).json({
      error: `text exceeds maximum length of ${GEMINI_SUMMARIZE_MAX_INPUT_CHARS} characters.`,
    });
  }

  try {
    const result = await summarizeStudyMaterial(trimmed);
    return res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Summarization failed.';
    console.error('[ai/summarize]', message);
    reportServerError(err, { route: 'POST /api/ai/summarize' });

    if (message.includes('GEMINI_API_KEY')) {
      return res.status(503).json({ error: message });
    }
    if (message.includes('API key') || message.includes('PERMISSION_DENIED')) {
      return res.status(502).json({ error: 'Gemini API rejected the request. Check API key and billing.' });
    }
    if (message.includes('Invalid response') || message.includes('valid JSON')) {
      return res.status(502).json({ error: 'Model returned an unexpected format. Try again.' });
    }

    return res.status(500).json({
      error: message.length < 200 ? message : 'Summarization failed. Please try again.',
    });
  }
}
