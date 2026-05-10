import { getNotes, generateNotesFromTranscript } from '../services/notes.service.js';
import { reportServerError } from '../middleware/sentry.js';
import { trackRevisionAction } from '../services/globalAnalytics.service.js';

export async function handleGetNotes(req, res) {
    const { videoId } = req.params;
    if (!videoId) {
        return res.status(400).json({ error: 'videoId is required' });
    }

    try {
        const notes = await getNotes(videoId);
        if (!notes) {
            return res.status(404).json({ error: 'Notes not found or still generating' });
        }
        
        if (req.authUserId) {
            trackRevisionAction(req.authUserId).catch(e => console.error('Failed to track revision:', e));
        }

        return res.json(notes);
    } catch (err) {
        reportServerError(err, { route: 'GET /api/notes/:videoId' });
        return res.status(500).json({ error: 'Internal server error' });
    }
}
