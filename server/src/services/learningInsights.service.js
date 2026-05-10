import { GlobalAnalytics } from '../models/GlobalAnalytics.model.js';
import { QuizModel } from '../models/Quiz.model.js';

/**
 * Generates advanced learning insights and recommendations based on 
 * user performance data across quizzes and revisions.
 */
export async function getDetailedLearningInsights(userId) {
  const analytics = await GlobalAnalytics.findOne({ userId });
  if (!analytics) return null;

  const conceptStruggles = Array.from(analytics.conceptStruggles.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count);

  const weakTopics = conceptStruggles.slice(0, 3);
  
  const insights = weakTopics.map(wt => {
    let severity = wt.count > 10 ? 'Critical' : wt.count > 5 ? 'Moderate' : 'Low';
    let recommendation = '';
    let actionType = '';

    if (wt.count > 8) {
      recommendation = `You've struggled with "${wt.topic}" across multiple quizzes. We recommend re-reading the study notes and watching the relevant lecture segments again.`;
      actionType = 'notes';
    } else if (wt.count > 3) {
      recommendation = `Topic "${wt.topic}" seems to be a bit tricky. Try going through the flashcards for this concept to reinforce your memory.`;
      actionType = 'flashcards';
    } else {
      recommendation = `You're making some progress on "${wt.topic}", but a quick quiz session could help solidify your understanding.`;
      actionType = 'quiz';
    }

    return {
      topic: wt.topic,
      struggleCount: wt.count,
      severity,
      recommendation,
      actionType,
      accuracy: Math.max(0, 100 - (wt.count * 10)) // Simple mock accuracy for now
    };
  });

  // Calculate overall mastery
  const totalStruggles = conceptStruggles.reduce((acc, curr) => acc + curr.count, 0);
  const masteryScore = Math.max(0, 100 - (totalStruggles * 2));

  return {
    masteryScore,
    insights,
    totalRevisionActions: analytics.revisionCount,
    lastStudyDate: analytics.lastStudyDate,
    suggestedPath: insights.length > 0 ? insights[0].actionType : 'new_lecture'
  };
}
