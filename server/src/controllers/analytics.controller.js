import {
  trackReplay,
  trackQuizMistake,
  computeLearnerInsights,
  getAnalytics,
} from '../services/analytics.service.js';

export function postTrack(req, res) {
  const { sessionId, videoId, eventType, timestamp, topic } = req.body ?? {};
  if (!sessionId || !videoId || !eventType) {
    return res.status(400).json({ error: 'sessionId, videoId and eventType are required.' });
  }

  if (eventType === 'replay') {
    trackReplay(sessionId, videoId, timestamp ?? 0);
  } else if (eventType === 'quiz_mistake') {
    trackQuizMistake(sessionId, videoId, typeof topic === 'string' ? topic : 'general');
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
