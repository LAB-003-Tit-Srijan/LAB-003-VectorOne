import { Router } from 'express';
import { getTranscript } from '../controllers/transcript.controller.js';
import { postAsk } from '../controllers/ask.controller.js';
import { postTrack, getInsights, getSessionTimeline } from '../controllers/analytics.controller.js';
import { postSummarize } from '../controllers/ai.controller.js';
import { authenticate, requireMongo } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireMongo);
router.use(authenticate);

router.get('/transcript', getTranscript);
router.post('/ask', postAsk);
router.post('/track', postTrack);
router.get('/insights', getInsights);
router.get('/session-timeline', getSessionTimeline);

router.post('/ai/summarize', postSummarize);

export default router;
