import { useEffect, useState } from 'react';
import type { InsightsResponse, TimelineItem } from '../types/insights';
import { captureClientException } from '../lib/monitoring';

export function useLearningData(sessionId: string, videoId: string, pollMs = 5000) {
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !videoId) {
      setInsights(null);
      setTimeline([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchAll = async () => {
      try {
        setIsLoading(true);
        const [insRes, tlRes] = await Promise.all([
          fetch(
            `/api/insights?sessionId=${encodeURIComponent(sessionId)}&videoId=${encodeURIComponent(videoId)}`
          ),
          fetch(
            `/api/session-timeline?sessionId=${encodeURIComponent(sessionId)}&videoId=${encodeURIComponent(videoId)}&limit=28`
          ),
        ]);

        const insData = (await insRes.json()) as InsightsResponse & { error?: string };
        const tlData = (await tlRes.json()) as { items?: TimelineItem[]; error?: string };

        if (!insRes.ok) throw new Error(insData.error ?? `Insights error ${insRes.status}`);
        if (!tlRes.ok) throw new Error(tlData.error ?? `Timeline error ${tlRes.status}`);

        if (!cancelled) {
          setInsights(insData);
          setTimeline(Array.isArray(tlData.items) ? tlData.items : []);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load learning data.');
          captureClientException(err, { scope: 'useLearningData', sessionId, videoId });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchAll();
    const id = window.setInterval(fetchAll, pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [sessionId, videoId, pollMs]);

  return { insights, timeline, isLoading, error };
}
