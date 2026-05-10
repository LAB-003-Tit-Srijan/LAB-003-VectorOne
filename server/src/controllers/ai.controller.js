import {
  GEMINI_API_KEY,
  GEMINI_SUMMARIZE_MAX_INPUT_CHARS,
  NIM_API_KEY
} from '../config/env.js';
import { summarizeStudyMaterial, generateSmartSummary } from '../services/gemini-summarize.service.js';
import { generateSmartSummaryNIM } from '../services/nim-api.service.js';
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

/**
 * POST /api/ai/smart-summarize
 * Body: { "text": "study material", "type": "full" | "last5mins" | "topic" | "exam" }
 */
export async function postSmartSummarize(req, res) {
  if (!NIM_API_KEY) {
    return res.status(503).json({
      error: 'NVIDIA NIM is not configured. Set NIM_API_KEY on the server.',
    });
  }

  const { text, type } = req.body ?? {};

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required and must be a string.' });
  }

  if (!type || typeof type !== 'string') {
    return res.status(400).json({ error: 'type is required.' });
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return res.status(400).json({ error: 'text must not be empty.' });
  }

  try {
    const result = await generateSmartSummaryNIM(trimmed, type);
    return res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Smart Summarization failed.';
    console.error('[ai/smart-summarize]', message);
    reportServerError(err, { route: 'POST /api/ai/smart-summarize' });

    if (message.includes('NIM_API_KEY')) {
      return res.status(503).json({ error: message });
    }
    if (message.includes('429') || message.includes('quota')) {
      return res.status(429).json({ error: 'NIM API rate limited. Please try again later.' });
    }
    if (message.includes('API key') || message.includes('401')) {
      return res.status(502).json({ error: 'NIM API rejected the request. Check API key.' });
    }
    if (message.includes('Invalid response') || message.includes('valid JSON')) {
      return res.status(502).json({ error: 'Model returned an unexpected format. Try again.' });
    }

    return res.status(500).json({
      error: message.length < 200 ? message : 'Smart summarization failed. Please try again.',
    });
  }
}
