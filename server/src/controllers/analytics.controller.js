import {
  trackReplay,
  trackQuizMistake,
  computeLearnerInsights,
  getAnalytics,
} from '../services/analytics.service.js';
import {
  getGlobalAnalytics,
  trackUserActivity,
  trackQuizOutcome,
} from '../services/globalAnalytics.service.js';
import { getDetailedLearningInsights } from '../services/learningInsights.service.js';

export async function postTrack(req, res) {
  const { sessionId, videoId, eventType, timestamp, topic, isCorrect } = req.body ?? {};
  if (!sessionId || !videoId || !eventType) {
    return res.status(400).json({ error: 'sessionId, videoId and eventType are required.' });
  }

  const userId = req.authUserId;

  if (eventType === 'replay') {
    trackReplay(sessionId, videoId, timestamp ?? 0);
    if (userId) await trackUserActivity(userId);
  } else if (eventType === 'quiz_mistake') {
    trackQuizMistake(sessionId, videoId, typeof topic === 'string' ? topic : 'general');
    if (userId) await trackQuizOutcome(userId, false, topic);
  } else if (eventType === 'quiz_success') {
    if (userId) await trackQuizOutcome(userId, true, topic);
  }

  return res.json({ ok: true });
}

export function getInsights(req, res) {
  const sessionId = req.query.sessionId;
  const videoId = req.query.videoId;

  if (!sessionId || !videoId) {
    return res.status(400).json({ error: 'sessionId and videoId are required.' });
  }

  const insights = computeLearnerInsights(String(sessionId), String(videoId));
  return res.json(insights);
}

export function getSessionTimeline(req, res) {
  const sessionId = String(req.query.sessionId ?? '');
  const videoId = String(req.query.videoId ?? '');
  const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 28));

  if (!sessionId || !videoId) {
    return res.status(400).json({ error: 'sessionId and videoId are required.' });
  }

  const analytics = getAnalytics(sessionId, videoId);
  const feed = Array.isArray(analytics.activityFeed) ? analytics.activityFeed : [];
  const items = feed
    .slice()
    .sort((a, b) => (b.at ?? 0) - (a.at ?? 0))
    .slice(0, limit);

  return res.json({ items });
}

export async function getGlobalInsights(req, res) {
  const userId = req.authUserId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const analytics = await getGlobalAnalytics(userId);
    return res.json(analytics);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch global analytics' });
  }
}

export async function getLearningRecommendations(req, res) {
  const userId = req.authUserId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const recommendations = await getDetailedLearningInsights(userId);
    return res.json(recommendations);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
}


