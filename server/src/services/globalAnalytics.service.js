import { GlobalAnalytics } from '../models/GlobalAnalytics.model.js';

/**
 * Increments activity for a given date and updates study streak.
 */
export async function trackUserActivity(userId) {
  const today = new Date().toISOString().split('T')[0];
  
  let analytics = await GlobalAnalytics.findOne({ userId });
  if (!analytics) {
    analytics = new GlobalAnalytics({ userId });
  }

  // Update daily activity
  const dayIndex = analytics.dailyActivity.findIndex(d => d.date === today);
  if (dayIndex > -1) {
    analytics.dailyActivity[dayIndex].actions += 1;
  } else {
    analytics.dailyActivity.push({ date: today, actions: 1 });
  }

  // Update streak
  const lastDate = analytics.lastStudyDate ? new Date(analytics.lastStudyDate).toISOString().split('T')[0] : null;
  
  if (!lastDate) {
    analytics.currentStreak = 1;
  } else if (lastDate === today) {
    // Already studied today, streak stays the same
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastDate === yesterdayStr) {
      analytics.currentStreak += 1;
    } else {
      analytics.currentStreak = 1;
    }
  }

  if (analytics.currentStreak > analytics.longestStreak) {
    analytics.longestStreak = analytics.currentStreak;
  }

  analytics.lastStudyDate = new Date();
  analytics.updatedAt = new Date();
  await analytics.save();
}

/**
 * Tracks lecture analysis.
 */
export async function trackLectureAnalyzed(userId, videoId) {
  let analytics = await GlobalAnalytics.findOne({ userId });
  if (!analytics) analytics = new GlobalAnalytics({ userId });

  if (!analytics.analyzedVideoIds.includes(videoId)) {
    analytics.analyzedVideoIds.push(videoId);
    analytics.totalLecturesAnalyzed += 1;
    await analytics.save();
  }
  
  await trackUserActivity(userId);
}

/**
 * Tracks quiz outcomes.
 */
export async function trackQuizOutcome(userId, isCorrect, topic) {
  let analytics = await GlobalAnalytics.findOne({ userId });
  if (!analytics) analytics = new GlobalAnalytics({ userId });

  analytics.totalQuizQuestionsAttempted += 1;
  if (isCorrect) {
    analytics.totalQuizCorrectAnswers += 1;
  } else if (topic) {
    const currentStruggles = analytics.conceptStruggles.get(topic) || 0;
    analytics.conceptStruggles.set(topic, currentStruggles + 1);
  }

  await analytics.save();
  await trackUserActivity(userId);
}

/**
 * Tracks revision actions (notes, flashcards).
 */
export async function trackRevisionAction(userId) {
  let analytics = await GlobalAnalytics.findOne({ userId });
  if (!analytics) analytics = new GlobalAnalytics({ userId });

  analytics.revisionCount += 1;
  await analytics.save();
  await trackUserActivity(userId);
}

/**
 * Fetches the global analytics for the user.
 */
export async function getGlobalAnalytics(userId) {
  let analytics = await GlobalAnalytics.findOne({ userId });
  if (!analytics) {
    analytics = await GlobalAnalytics.create({ userId });
  }
  
  // Format for Recharts
  const consistencyData = analytics.dailyActivity.slice(-14).map(d => ({
    date: d.date.split('-').slice(1).join('/'), // MM/DD
    actions: d.actions
  }));

  const weakConcepts = Array.from(analytics.conceptStruggles.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalLecturesAnalyzed: analytics.totalLecturesAnalyzed,
    currentStreak: analytics.currentStreak,
    longestStreak: analytics.longestStreak,
    quizAccuracy: analytics.totalQuizQuestionsAttempted === 0 
      ? 0 
      : Math.round((analytics.totalQuizCorrectAnswers / analytics.totalQuizQuestionsAttempted) * 100),
    revisionCount: analytics.revisionCount,
    weakConcepts,
    consistencyData
  };
}
