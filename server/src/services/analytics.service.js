import { analyticsStore, sessionStore } from '../models/stores.js';
import { FALLBACK_ANSWER, MAX_MEMORY_TURNS } from '../config/env.js';
import { formatTimestamp } from '../utils/time.js';
import { normalizeQuestionText, extractTopicTokens } from '../utils/text.js';

export function getSessionKey(sessionId, videoId) {
  return `${sessionId}::${videoId}`;
}

export function getSessionMemory(sessionId, videoId) {
  const key = getSessionKey(sessionId, videoId);
  return sessionStore.get(key) ?? [];
}

export function getAnalytics(sessionId, videoId) {
  const key = getSessionKey(sessionId, videoId);
  if (!analyticsStore.has(key)) {
    analyticsStore.set(key, {
      totalQuestions: 0,
      fallbackAnswers: 0,
      repeatedQuestions: 0,
      confusionSignals: 0,
      quizMistakes: 0,
      topicStats: new Map(),
      replayBuckets: new Map(),
      confusionBuckets: new Map(),
      recentReplayBuckets: [],
      activityFeed: [],
    });
  }
  return analyticsStore.get(key);
}

function appendActivity(sessionId, videoId, entry) {
  const analytics = getAnalytics(sessionId, videoId);
  if (!Array.isArray(analytics.activityFeed)) {
    analytics.activityFeed = [];
  }
  analytics.activityFeed.push({
    ...entry,
    at: entry.at ?? Date.now(),
  });
  analytics.activityFeed = analytics.activityFeed.slice(-80);
}

export function trackReplay(sessionId, videoId, timestampSeconds) {
  const analytics = getAnalytics(sessionId, videoId);
  const sec = Math.max(0, Number(timestampSeconds) || 0);
  const bucket = Math.floor(sec / 10) * 10;
  analytics.replayBuckets.set(bucket, (analytics.replayBuckets.get(bucket) ?? 0) + 1);
  analytics.recentReplayBuckets = [...analytics.recentReplayBuckets, bucket].slice(-20);
  appendActivity(sessionId, videoId, {
    type: 'replay',
    label: `Replay at ${formatTimestamp(sec)}`,
    second: Math.floor(sec),
  });
}

export function trackQuizMistake(sessionId, videoId, topic = 'general') {
  const analytics = getAnalytics(sessionId, videoId);
  analytics.quizMistakes += 1;
  const stats = analytics.topicStats.get(topic) ?? { mentions: 0, struggles: 0 };
  stats.mentions += 1;
  stats.struggles += 1;
  analytics.topicStats.set(topic, stats);
}

export function trackQuestionOutcome(sessionId, videoId, question, answer, signals) {
  const analytics = getAnalytics(sessionId, videoId);
  analytics.totalQuestions += 1;
  if (answer === FALLBACK_ANSWER) analytics.fallbackAnswers += 1;
  if (signals.repeated) analytics.repeatedQuestions += 1;
  if (signals.confusing) analytics.confusionSignals += 1;

  if ((signals.confusing || answer === FALLBACK_ANSWER) && analytics.recentReplayBuckets.length > 0) {
    const lastReplayBucket = analytics.recentReplayBuckets[analytics.recentReplayBuckets.length - 1];
    analytics.confusionBuckets.set(
      lastReplayBucket,
      (analytics.confusionBuckets.get(lastReplayBucket) ?? 0) + 1
    );
  }

  const topics = extractTopicTokens(question);
  for (const topic of topics) {
    const stats = analytics.topicStats.get(topic) ?? { mentions: 0, struggles: 0 };
    stats.mentions += 1;
    if (signals.confusing || signals.repeated || answer === FALLBACK_ANSWER) {
      stats.struggles += 1;
    }
    analytics.topicStats.set(topic, stats);
  }
}

export function computeLearnerInsights(sessionId, videoId) {
  const analytics = getAnalytics(sessionId, videoId);
  const topicEntries = Array.from(analytics.topicStats.entries()).map(([topic, stats]) => {
    const difficulty = stats.mentions === 0 ? 0 : stats.struggles / stats.mentions;
    return { topic, ...stats, difficulty };
  });

  topicEntries.sort((a, b) => b.difficulty - a.difficulty || b.mentions - a.mentions);
  const weakTopics = topicEntries.slice(0, 4).map((entry) => ({
    topic: entry.topic,
    mentions: entry.mentions,
    struggleRate: Number(entry.difficulty.toFixed(2)),
  }));

  const replayHotspots = Array.from(analytics.replayBuckets.entries())
    .map(([bucket, count]) => ({ timestamp: bucket, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const confusionHeatmap = Array.from(analytics.confusionBuckets.entries())
    .map(([bucket, count]) => ({ timestamp: bucket, intensity: count }))
    .sort((a, b) => a.timestamp - b.timestamp);

  const mostAskedConcepts = topicEntries
    .slice()
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 5)
    .map((entry) => ({
      concept: entry.topic,
      mentions: entry.mentions,
      struggleRate: Number(entry.difficulty.toFixed(2)),
    }));

  const confusionScoreRaw =
    analytics.confusionSignals + analytics.repeatedQuestions + analytics.fallbackAnswers;
  const confusionScore = Math.min(100, confusionScoreRaw * 8);
  const confusionLevel =
    confusionScore >= 70 ? 'High' : confusionScore >= 35 ? 'Medium' : 'Low';

  const retentionPenalty =
    analytics.fallbackAnswers * 12 +
    analytics.repeatedQuestions * 6 +
    analytics.confusionSignals * 7 +
    analytics.quizMistakes * 8;
  const retentionScore = Math.max(0, Math.min(100, 100 - retentionPenalty));

  return {
    weakTopics,
    replayHotspots,
    confusionHeatmap,
    mostAskedConcepts,
    summary: {
      totalQuestions: analytics.totalQuestions,
      repeatedQuestions: analytics.repeatedQuestions,
      confusionSignals: analytics.confusionSignals,
      fallbackAnswers: analytics.fallbackAnswers,
      quizMistakes: analytics.quizMistakes,
      confusionLevel,
      confusionScore,
      retentionScore,
      fallbackRate:
        analytics.totalQuestions === 0
          ? 0
          : Number((analytics.fallbackAnswers / analytics.totalQuestions).toFixed(2)),
    },
    learningPatterns: {
      frequentlyRevisitedTopics: weakTopics.map((item) => item.topic),
      replayedSegments: replayHotspots.map((item) => item.timestamp),
    },
  };
}

export function saveSessionTurn(sessionId, videoId, question, answer) {
  const key = getSessionKey(sessionId, videoId);
  const existing = sessionStore.get(key) ?? [];
  const next = [
    ...existing,
    {
      question,
      answer,
      normalizedQuestion: normalizeQuestionText(question),
      createdAt: Date.now(),
    },
  ].slice(-MAX_MEMORY_TURNS);
  sessionStore.set(key, next);
  const q = String(question ?? '').trim();
  appendActivity(sessionId, videoId, {
    type: 'question',
    label: q.length > 120 ? `${q.slice(0, 117)}…` : q,
  });
}

export function detectMemorySignals(question, history) {
  const normalized = normalizeQuestionText(question);
  if (!normalized) {
    return {
      repeated: false,
      confusing: false,
      repeatedQuestion: '',
    };
  }

  const repeats = history.filter((turn) => turn.normalizedQuestion === normalized);
  const confusionKeywords = ['confuse', 'still', "don't understand", 'again', 'not clear'];
  const confusingByWords = confusionKeywords.some((word) => normalized.includes(word));
  const repeated = repeats.length > 0;
  const confusing = confusingByWords || repeats.length >= 2;

  return {
    repeated,
    confusing,
    repeatedQuestion: repeats[repeats.length - 1]?.question ?? '',
  };
}
