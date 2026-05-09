import { useEffect, useMemo, useState } from 'react';
import { Target, Activity, Zap, Brain, Loader2, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from 'recharts';

interface InsightsResponse {
  weakTopics: Array<{ topic: string; mentions: number; struggleRate: number }>;
  replayHotspots: Array<{ timestamp: number; count: number }>;
  summary: {
    totalQuestions: number;
    repeatedQuestions: number;
    confusionSignals: number;
    fallbackAnswers: number;
    quizMistakes: number;
    confusionLevel: 'Low' | 'Medium' | 'High';
    confusionScore: number;
    fallbackRate: number;
  };
  learningPatterns: {
    frequentlyRevisitedTopics: string[];
    replayedSegments: number[];
  };
}

interface LearningInsightsProps {
  sessionId: string;
  videoId: string;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

export function LearningInsights({ sessionId, videoId }: LearningInsightsProps) {
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !videoId) {
      setInsights(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const fetchInsights = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/insights?sessionId=${encodeURIComponent(sessionId)}&videoId=${encodeURIComponent(videoId)}`
        );
        const data = (await res.json()) as InsightsResponse & { error?: string };
        if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);
        if (!cancelled) {
          setInsights(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load insights.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchInsights();
    const interval = window.setInterval(fetchInsights, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [sessionId, videoId]);

  const radarData = useMemo(() => {
    if (!insights || insights.weakTopics.length === 0) {
      return [{ subject: 'Focus', score: 80, fullMark: 100 }];
    }

    return insights.weakTopics.map((topic) => ({
      subject: topic.topic.slice(0, 10),
      score: Math.max(5, Math.round((1 - topic.struggleRate) * 100)),
      fullMark: 100,
    }));
  }, [insights]);

  const confusionLevel = insights?.summary.confusionLevel ?? 'Low';
  const weakTopic = insights?.weakTopics[0]?.topic ?? 'No weak topic yet';
  const weakTopicHint = insights?.weakTopics[0]
    ? `${Math.round(insights.weakTopics[0].struggleRate * 100)}% struggle rate`
    : 'Keep asking questions to build profile';

  return (
    <div className="glass-panel w-full h-full rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-2 text-slate-300 pb-2 border-b border-slate-700/50">
        <Activity className="w-4 h-4 text-cyan-400" />
        <h3 className="font-semibold text-sm">Learning Insights</h3>
      </div>

      {isLoading && (
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          Updating learner profile...
        </div>
      )}

      {error && (
        <div className="text-xs text-rose-300 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 flex items-start gap-1.5">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 flex flex-col gap-1 hover:-translate-y-1 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer group">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1 group-hover:text-slate-300 transition-colors">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-medium uppercase tracking-wider">Confusion</span>
          </div>
          <div className="text-xl font-bold text-slate-100">{confusionLevel}</div>
          <div className="text-[10px] text-slate-500">
            Repeats: {insights?.summary.repeatedQuestions ?? 0} | Mistakes: {insights?.summary.quizMistakes ?? 0}
          </div>
        </div>
        
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 flex flex-col gap-1 hover:-translate-y-1 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer group">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1 group-hover:text-slate-300 transition-colors">
            <Target className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-xs font-medium uppercase tracking-wider">Weak Topic</span>
          </div>
          <div className="text-sm font-bold text-slate-100 truncate">{weakTopic}</div>
          <div className="text-[10px] text-indigo-400">{weakTopicHint}</div>
        </div>
      </div>

      <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50 text-xs text-slate-300">
        <div className="font-medium text-slate-200 mb-1">Learning Pattern</div>
        <div className="text-slate-400">
          {insights?.learningPatterns.frequentlyRevisitedTopics.length
            ? `Frequently revisited: ${insights.learningPatterns.frequentlyRevisitedTopics.join(', ')}`
            : 'No dominant topic pattern yet.'}
        </div>
        <div className="text-slate-400 mt-1">
          {insights?.replayHotspots.length
            ? `Replay hotspots: ${insights.replayHotspots
                .map((spot) => `${formatTime(spot.timestamp)} (${spot.count}x)`)
                .join(', ')}`
            : 'Replay hotspots will appear after seeks.'}
        </div>
      </div>

      <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700/50 p-2 min-h-[160px] flex flex-col">
        <div className="flex items-center gap-1.5 text-slate-400 mb-2 px-2 pt-1">
          <Brain className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-medium uppercase tracking-wider">Knowledge Map</span>
        </div>
        <div className="flex-1 w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Radar name="Mastery" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }} 
                itemStyle={{ color: '#818cf8', fontWeight: 'bold' }} 
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
