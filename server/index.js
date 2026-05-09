import express from 'express';
import cors from 'cors';
import { YoutubeTranscript } from 'youtube-transcript';

const app = express();
const PORT = process.env.PORT || 3001;

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

    // Normalise field names: youtube-transcript uses `offset`, we expose `start`
    // so the frontend can use either.
    const transcript = rawTranscript.map((item) => ({
      text: item.text,
      start: item.offset,        // seconds (float)
      duration: item.duration,   // seconds (float)
      // keep offset too for backward compat
      offset: item.offset,
    }));

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

    return res.status(500).json({
      error: 'Failed to fetch transcript. The video may be private, age-restricted, or unavailable.',
    });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`✅  Transcript API server running on http://localhost:${PORT}`);
});
