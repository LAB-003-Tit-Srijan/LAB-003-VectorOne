import { generateQuizFromTranscript, getQuiz } from '../services/quiz.service.js';
import { reportServerError } from '../middleware/sentry.js';

/**
 * GET /api/quiz/:videoId
 * Returns the stored quiz for the given video, or 404 if not yet generated.
 */
export async function handleGetQuiz(req, res) {
    const { videoId } = req.params;
    if (!videoId) {
        return res.status(400).json({ error: 'videoId is required' });
    }

    try {
        const quiz = await getQuiz(videoId);
        if (!quiz || !quiz.questions?.length) {
            return res.status(404).json({ error: 'Quiz not found. Generate one first.' });
        }
        return res.json(quiz);
    } catch (err) {
        reportServerError(err, { route: 'GET /api/quiz/:videoId' });
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * POST /api/quiz/generate
 * Body: { videoId: string, transcript: string }
 * Generates (or regenerates) a quiz from the raw transcript and returns it.
 */
export async function handleGenerateQuiz(req, res) {
    const { videoId, transcript } = req.body ?? {};

    if (!videoId || typeof videoId !== 'string') {
        return res.status(400).json({ error: 'videoId (string) is required.' });
    }
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 50) {
        return res.status(400).json({ error: 'transcript (string, min 50 chars) is required.' });
    }

    try {
        const quiz = await generateQuizFromTranscript(videoId, transcript.trim());
        return res.status(201).json(quiz);
    } catch (err) {
        reportServerError(err, { route: 'POST /api/quiz/generate' });
        return res.status(500).json({
            error: err instanceof Error ? err.message : 'Quiz generation failed.',
        });
    }
}
