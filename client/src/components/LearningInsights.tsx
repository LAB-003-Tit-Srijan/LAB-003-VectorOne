import { useMemo } from 'react';
import { Target, Activity, Zap, Brain, Loader2, AlertCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import type { InsightsResponse } from '../types/insights';

interface LearningInsightsProps {
  insights: InsightsResponse | null;
  isLoading: boolean;
  error: string | null;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

export function LearningInsights({ insights, isLoading, error }: LearningInsightsProps) {
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
  const retentionScore = insights?.summary.retentionScore ?? 100;

  const replayChartData = useMemo(
    () =>
      (insights?.replayHotspots ?? [])
        .slice()
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((spot) => ({ time: formatTime(spot.timestamp), replays: spot.count })),
    [insights]
  );

  const confusionChartData = useMemo(
    () =>
      (insights?.confusionHeatmap ?? []).map((item) => ({
        time: formatTime(item.timestamp),
        intensity: item.intensity,
      })),
    [insights]
  );

  const adaptiveRecommendation = useMemo(() => {
    if (!insights) {
      return 'Ask a few lecture questions to generate personalized guidance.';
    }

    const topWeak = insights.weakTopics[0];
    const topReplay = insights.replayHotspots[0];
    const highConfusion = insights.summary.confusionLevel === 'High';

    if (highConfusion && topWeak) {
      return `You seem to struggle with ${topWeak.topic}. Switching to simpler explanations and short step-by-step breakdowns.`;
    }
    if (insights.summary.retentionScore < 45 && topReplay) {
      return `Retention is dropping. Revisit the segment around ${formatTime(topReplay.timestamp)} and then ask for a quick recap quiz.`;
    }
    if (topWeak && topWeak.struggleRate >= 0.45) {
      return `Focus next on ${topWeak.topic}. Try one concrete example before moving to the next concept.`;
    }
    if (insights.mostAskedConcepts.length > 0) {
      return `You often ask about ${insights.mostAskedConcepts[0].concept}. I will keep responses concise and build progressively from that concept.`;
    }
    return 'Progress looks stable. Continue with conceptual questions to deepen understanding.';
  }, [insights]);

  return (
    <div className="glass-panel w-full h-full rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
      <div
        className="flex items-center gap-2 pb-2 border-b"
        style={{ color: 'var(--text-muted)', borderColor: 'var(--surface-border)' }}
      >
        <Activity className="w-4 h-4" style={{ color: 'var(--brand-b)' }} />
        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>
          Learning Insights
        </h3>
      </div>

      {isLoading && (
        <div className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
          <Loader2 className="w-3 h-3 animate-spin" />
          Updating learner profile...
          <div className="flex gap-1 ml-1">
            <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
            <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse [animation-delay:120ms]" />
            <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse [animation-delay:240ms]" />
          </div>
        </div>
      )}

      {error && (
        <div className="text-xs text-rose-300 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 flex items-start gap-1.5">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div
        className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs"
        style={{ color: 'var(--text-main)' }}
      >
        {adaptiveRecommendation}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl p-3 border flex flex-col gap-1 hover:-translate-y-1 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer group"
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}
        >
          <div
            className="flex items-center gap-1.5 mb-1 transition-colors group-hover:opacity-90"
            style={{ color: 'var(--text-muted)' }}
          >
            <Zap className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
            <span className="text-xs font-medium uppercase tracking-wider">Confusion</span>
          </div>
          <div className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>
            {confusionLevel}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Repeats: {insights?.summary.repeatedQuestions ?? 0} | Mistakes: {insights?.summary.quizMistakes ?? 0}
          </div>
        </div>

        <div
          className="rounded-xl p-3 border flex flex-col gap-1 hover:-translate-y-1 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer group"
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}
        >
          <div
            className="flex items-center gap-1.5 mb-1 transition-colors group-hover:opacity-90"
            style={{ color: 'var(--text-muted)' }}
          >
            <Target className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="text-xs font-medium uppercase tracking-wider">Weak Topic</span>
          </div>
          <div className="text-sm font-bold truncate" style={{ color: 'var(--text-main)' }}>
            {weakTopic}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--brand-a)' }}>
            {weakTopicHint}
          </div>
        </div>
      </div>

      <div
        className="rounded-xl p-3 border"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}
      >
        <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          <span className="uppercase tracking-wider font-medium">Retention Score</span>
          <span className="font-semibold" style={{ color: 'var(--text-main)' }}>
            {retentionScore}%
          </span>
        </div>
        <div
          className="h-2.5 rounded-full overflow-hidden"
          style={{ background: 'color-mix(in srgb, var(--surface-border) 55%, var(--surface-muted))' }}
        >
          <div
            className={`h-full transition-all duration-500 ${
              retentionScore >= 70 ? 'bg-emerald-500' : retentionScore >= 40 ? 'bg-yellow-500' : 'bg-rose-500'
            }`}
            style={{ width: `${Math.max(4, retentionScore)}%` }}
          />
        </div>
      </div>

      <div
        className="rounded-xl p-3 border text-xs"
        style={{
          borderColor: 'var(--surface-border)',
          background: 'var(--surface-muted)',
          color: 'var(--text-muted)',
        }}
      >
        <div className="font-medium mb-1" style={{ color: 'var(--text-main)' }}>
          Learning Pattern
        </div>
        <div>
          {insights?.learningPatterns.frequentlyRevisitedTopics.length
            ? `Frequently revisited: ${insights.learningPatterns.frequentlyRevisitedTopics.join(', ')}`
            : 'No dominant topic pattern yet.'}
        </div>
        <div className="mt-1">
          {insights?.replayHotspots.length
            ? `Replay hotspots: ${insights.replayHotspots
                .map((spot) => `${formatTime(spot.timestamp)} (${spot.count}x)`)
                .join(', ')}`
            : 'Replay hotspots will appear after seeks.'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          className="rounded-xl border p-2 min-h-[140px]"
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}
        >
          <div
            className="text-[11px] uppercase tracking-wider px-1 pb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Replay-Heavy Segments
          </div>
          <div className="w-full h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={replayChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-card)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '8px',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="replays" fill="var(--brand-b)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          className="rounded-xl border p-2 min-h-[140px]"
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}
        >
          <div
            className="text-[11px] uppercase tracking-wider px-1 pb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Confusion Heatmap
          </div>
          <div className="w-full h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={confusionChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-card)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '8px',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                  }}
                />
                <Line type="monotone" dataKey="intensity" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div
        className="rounded-xl p-3 border text-xs"
        style={{
          borderColor: 'var(--surface-border)',
          background: 'var(--surface-muted)',
          color: 'var(--text-muted)',
        }}
      >
        <div className="font-medium mb-1" style={{ color: 'var(--text-main)' }}>
          Most Asked Concepts
        </div>
        <div>
          {insights?.mostAskedConcepts.length
            ? insights.mostAskedConcepts
                .map((item) => `${item.concept} (${item.mentions}x)`)
                .join(', ')
            : 'Concept frequency will appear as you ask questions.'}
        </div>
      </div>

      <div
        className="flex-1 rounded-xl border p-2 min-h-[160px] flex flex-col"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}
      >
        <div
          className="flex items-center gap-1.5 mb-2 px-2 pt-1"
          style={{ color: 'var(--text-muted)' }}
        >
          <Brain className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--brand-a)' }} />
          <span className="text-xs font-medium uppercase tracking-wider">Knowledge Map</span>
        </div>
        <div className="flex-1 w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
              <PolarGrid stroke="var(--surface-border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <Radar
                name="Mastery"
                dataKey="score"
                stroke="var(--brand-a)"
                fill="var(--brand-a)"
                fillOpacity={0.35}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: '8px',
                  color: 'var(--text-main)',
                  fontSize: '12px',
                }}
                itemStyle={{ color: 'var(--brand-a)', fontWeight: 'bold' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
