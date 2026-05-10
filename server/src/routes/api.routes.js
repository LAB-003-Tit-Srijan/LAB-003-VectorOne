import { Router } from 'express';
import { getTranscript } from '../controllers/transcript.controller.js';
import { postAsk } from '../controllers/ask.controller.js';
import { postTrack, getInsights, getSessionTimeline, getGlobalInsights, getLearningRecommendations } from '../controllers/analytics.controller.js';
import { postSummarize, postSmartSummarize } from '../controllers/ai.controller.js';
import { postChat } from '../controllers/chat.controller.js';
import { handleGetNotes } from '../controllers/notes.controller.js';
import { handleGetNotesPdf } from '../controllers/notesPdf.controller.js';
import { handleGetFlashcards, handleGenerateFlashcards } from '../controllers/flashcards.controller.js';
import { handleGetQuiz, handleGenerateQuiz } from '../controllers/quiz.controller.js';
import { handleGetRoadmap, handleGenerateRoadmap, handleCompleteNode } from '../controllers/roadmap.controller.js';
import { authenticate, requireMongo } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireMongo);
router.use(authenticate);

router.get('/transcript', getTranscript);
router.post('/ask', postAsk);
router.post('/track', postTrack);
router.get('/insights', getInsights);
router.get('/session-timeline', getSessionTimeline);
router.get('/analytics/global', getGlobalInsights);
router.get('/analytics/recommendations', getLearningRecommendations);

router.post('/ai/summarize', postSummarize);
router.post('/ai/smart-summarize', postSmartSummarize);
router.post('/chat', postChat);

router.get('/notes/:videoId/pdf', handleGetNotesPdf);
router.get('/notes/:videoId', handleGetNotes);

router.get('/flashcards/:videoId', handleGetFlashcards);
router.post('/flashcards/generate', handleGenerateFlashcards);

router.get('/quiz/:videoId', handleGetQuiz);
router.post('/quiz/generate', handleGenerateQuiz);

router.get('/roadmap', handleGetRoadmap);
router.post('/roadmap/generate', handleGenerateRoadmap);
router.patch('/roadmap/node/:nodeId', handleCompleteNode);

router.use((req, res) => {
  res.status(404).json({ error: 'API route not found.', path: req.originalUrl });
});

export default router;
