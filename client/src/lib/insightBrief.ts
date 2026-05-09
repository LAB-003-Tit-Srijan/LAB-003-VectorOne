import type { InsightsResponse } from '../types/insights';

export function formatInsightTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

export function formatRelativeActivity(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 45) return 'Just now';
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 36) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function buildAiInsightLine(insights: InsightsResponse | null, videoReady: boolean): string {
  if (!videoReady) {
    return 'Load a lecture to unlock adaptive insights tailored to how you study.';
  }
  if (!insights || insights.summary.totalQuestions < 1) {
    return 'Ask your first question — replay patterns and topic focus will appear here.';
  }
  const topReplay = insights.replayHotspots[0];
  const weak = insights.weakTopics[0];
  const topAsk = insights.mostAskedConcepts[0];

  if (topReplay && topReplay.count >= 2 && weak) {
    return `You often replay around ${formatInsightTime(topReplay.timestamp)} — frequently with “${weak.topic}”.`;
  }
  if (topAsk && topAsk.mentions >= 2) {
    return `You circle back to ${topAsk.concept} in your questions — worth reinforcing that thread.`;
  }
  if (insights.summary.repeatedQuestions >= 2) {
    return 'Similar questions are repeating — try shorter, more targeted prompts.';
  }
  if (insights.learningPatterns.frequentlyRevisitedTopics.length) {
    return `Revisit pattern: ${insights.learningPatterns.frequentlyRevisitedTopics.slice(0, 3).join(', ')}.`;
  }
  return 'Session looks balanced — mix recap with deeper “why” questions.';
}
