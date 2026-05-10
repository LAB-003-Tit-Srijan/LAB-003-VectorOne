import { YoutubeTranscript } from 'youtube-transcript';
import { extractVideoId } from '../utils/youtube.js';
import { normalizeTranscriptUnits } from '../utils/transcript.js';
import { buildOrGetRagIndex, ensureVisualContext } from '../services/rag.service.js';
import { reportServerError } from '../middleware/sentry.js';
import { handleTranscriptGenerated } from './transcriptProcessing.controller.js';

/**
 * GET /api/transcript?videoId=<id_or_url>
 */
export async function getTranscript(req, res) {
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

    // Automatically trigger the AI processing pipeline (fire and forget)
    handleTranscriptGenerated(videoId, transcript);

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
}
