import {
    generateFlashcardsFromTranscript,
    getFlashcards,
} from '../services/flashcards.service.js';
import { reportServerError } from '../middleware/sentry.js';
import { trackRevisionAction } from '../services/globalAnalytics.service.js';

/**
 * GET /api/flashcards/:videoId
 * Returns the stored flashcard set for the given video, or 404 if not yet generated.
 */
export async function handleGetFlashcards(req, res) {
    const { videoId } = req.params;
    if (!videoId) {
        return res.status(400).json({ error: 'videoId is required' });
    }

    try {
        const set = await getFlashcards(videoId);
        if (!set || !set.cards?.length) {
            return res.status(404).json({ error: 'Flashcards not found. Generate them first.' });
        }
        
        if (req.authUserId) {
            trackRevisionAction(req.authUserId).catch(e => console.error('Failed to track revision:', e));
        }

        return res.json(set);
    } catch (err) {
        reportServerError(err, { route: 'GET /api/flashcards/:videoId' });
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * POST /api/flashcards/generate
 * Body: { videoId: string, transcript: string }
 * Generates (or regenerates) flashcards from the raw transcript text and
 * persists them, then returns the saved set.
 */
export async function handleGenerateFlashcards(req, res) {
    const { videoId, transcript } = req.body ?? {};

    if (!videoId || typeof videoId !== 'string') {
        return res.status(400).json({ error: 'videoId (string) is required in the request body.' });
    }
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 50) {
        return res.status(400).json({ error: 'transcript (string, min 50 chars) is required in the request body.' });
    }

    try {
        const set = await generateFlashcardsFromTranscript(videoId, transcript.trim());
        return res.status(201).json(set);
    } catch (err) {
        reportServerError(err, { route: 'POST /api/flashcards/generate' });
        return res.status(500).json({
            error: err instanceof Error ? err.message : 'Flashcard generation failed.',
        });
    }
}
