import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  BookMarked,
  Brain,
  ChevronRight,
  Clock3,
  Compass,
  History,
  Lightbulb,
  ListTree,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { STUDY_MODES } from '../data/studyModes';
import { buildSmartChapters } from '../lib/smartChapters';
import type { InsightsResponse, TimelineItem } from '../types/insights';
import type { TranscriptItem } from './Transcript';

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

function formatRelativeTime(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 45) return 'Just now';
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 36) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function buildAiInsightLine(insights: InsightsResponse | null, videoReady: boolean): string {
  if (!videoReady) {
    return 'Load a lecture to unlock adaptive insights tailored to how you study.';
  }
  if (!insights || insights.summary.totalQuestions < 1) {
    return 'Ask your first question — I will spot replay patterns and topic focus automatically.';
  }
  const topReplay = insights.replayHotspots[0];
  const weak = insights.weakTopics[0];
  const topAsk = insights.mostAskedConcepts[0];

  if (topReplay && topReplay.count >= 2 && weak) {
    return `You frequently replay around ${formatTime(topReplay.timestamp)} — often while working through “${weak.topic}”.`;
  }
  if (topAsk && topAsk.mentions >= 2) {
    return `You often circle back to ${topAsk.concept} in your questions — we will reinforce that thread.`;
  }
  if (insights.summary.repeatedQuestions >= 2) {
    return 'You have repeated similar questions — I will default to clearer, slower explanations.';
  }
  if (insights.learningPatterns.frequentlyRevisitedTopics.length) {
    return `Revisit pattern: ${insights.learningPatterns.frequentlyRevisitedTopics.slice(0, 3).join(', ')}.`;
  }
  return 'Your session looks balanced — keep mixing recap with deeper “why” questions.';
}

function buildFocusInsight(insights: InsightsResponse | null, videoReady: boolean): string {
  if (!videoReady) return 'Waiting for transcript.';
  if (!insights) return 'Syncing learner profile…';
  const { confusionLevel, retentionScore, totalQuestions } = insights.summary;
  if (totalQuestions === 0) return 'No questions yet — focus baseline is neutral.';
  if (confusionLevel === 'High' && retentionScore < 55) {
    return 'High friction detected — prioritize short recap segments before new topics.';
  }
  if (retentionScore >= 75 && confusionLevel === 'Low') {
    return 'Strong retention signal — good moment for interview-style explanations.';
  }
  return `Confusion ${confusionLevel.toLowerCase()} · retention ${retentionScore}% — adjust pace as needed.`;
}

function buildLearningPath(insights: InsightsResponse | null, videoReady: boolean): string[] {
  if (!videoReady) return ['Load a video to see your path'];
  if (!insights) return ['Analyzing your session…'];

  const path: string[] = [];
  for (const w of insights.weakTopics.slice(0, 2)) {
    path.push(`Stabilize: ${w.topic}`);
  }
  const deepen = insights.mostAskedConcepts.filter((c) => c.struggleRate < 0.42).slice(0, 2);
  for (const c of deepen) {
    path.push(`Go deeper: ${c.concept}`);
  }
  if (insights.replayHotspots[0]) {
    path.push(`Re-watch: ${formatTime(insights.replayHotspots[0].timestamp)} (${insights.replayHotspots[0].count}× replays)`);
  }
  if (path.length === 0) {
    path.push('Ask questions to personalize your next steps');
  }
  return path.slice(0, 5);
}

const sectionEase = [0.22, 1, 0.36, 1] as const;

const quickActions = (
  learningMode: string,
  currentTime: number
): { id: string; label: string; prompt: string }[] => [
  {
    id: 'quiz',
    label: 'Generate Quiz',
    prompt: `Study mode: ${learningMode}. Generate 5 quiz questions about this lecture only, with brief answers.`,
  },
  {
    id: 'notes',
    label: 'Create Notes',
    prompt: `Study mode: ${learningMode}. Create structured study notes: key ideas, definitions, and a recap section. Lecture only.`,
  },
  {
    id: 'summarize',
    label: 'Summarize Section',
    prompt: `Summarize what the instructor covers around ${formatTime(currentTime)} (roughly ±2 minutes). Use only the lecture.`,
  },
  {
    id: 'simpler',
    label: 'Explain Simpler',
    prompt: `Study mode: ${learningMode}. Explain the main ideas from this lecture in simpler language with a quick analogy. Lecture only.`,
  },
  {
    id: 'interview',
    label: 'Interview Qs',
    prompt: `Study mode: ${learningMode}. List 5 technical interview questions this lecture helps with, with concise grounded answers.`,
  },
];

interface LearningCommandCenterProps {
  videoId: string;
  transcriptData: TranscriptItem[];
  insights: InsightsResponse | null;
  timeline: TimelineItem[];
  dataLoading: boolean;
  learningMode: string;
  setLearningMode: (mode: string) => void;
  currentTime: number;
  onSeek: (time: number) => void;
  onQuickAction: (prompt: string) => void;
}

export function LearningCommandCenter({
  videoId,
  transcriptData,
  insights,
  timeline,
  dataLoading,
  learningMode,
  setLearningMode,
  currentTime,
  onSeek,
  onQuickAction,
}: LearningCommandCenterProps) {
  const videoReady = Boolean(videoId && transcriptData.length > 0);

  const chapters = useMemo(() => buildSmartChapters(transcriptData), [transcriptData]);

  const aiLine = useMemo(() => buildAiInsightLine(insights, videoReady), [insights, videoReady]);
  const focusLine = useMemo(() => buildFocusInsight(insights, videoReady), [insights, videoReady]);
  const pathItems = useMemo(() => buildLearningPath(insights, videoReady), [insights, videoReady]);

  const retention = insights?.summary.retentionScore ?? null;
  const confusion = insights?.summary.confusionLevel ?? '—';
  const confusionScore = insights?.summary.confusionScore ?? null;
  const weakTopics = insights?.weakTopics ?? [];

  const actions = useMemo(
    () => quickActions(learningMode, currentTime),
    [learningMode, currentTime]
  );

  return (
    <div
      className="flex flex-col gap-4 h-full min-h-0 overflow-y-auto custom-scrollbar pr-1"
      style={{ color: 'var(--text-main)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: sectionEase }}
        className="flex items-center justify-between gap-2 shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl premium-button flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold font-['Manrope'] tracking-tight truncate">Learning command</h2>
            <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
              {dataLoading ? 'Live sync…' : videoReady ? 'Adaptive control center' : 'Paste a lecture URL'}
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-lg border shrink-0" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          AI
        </span>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04, duration: 0.35, ease: sectionEase }}
        className="rounded-2xl border p-3 space-y-2"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          <BookMarked className="w-3.5 h-3.5" />
          Study modes
        </div>
        <div className="grid grid-cols-2 gap-2">
          {STUDY_MODES.map((mode) => {
            const Icon = mode.icon;
            const active = learningMode === mode.id;
            return (
              <motion.button
                key={mode.id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => setLearningMode(mode.id)}
                className="relative flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[11px] border transition-colors"
                style={{
                  borderColor: active ? 'rgba(99,102,241,0.45)' : 'var(--surface-border)',
                  background: active ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.12))' : 'var(--surface-card)',
                  color: active ? 'var(--text-main)' : 'var(--text-muted)',
                  boxShadow: active ? '0 8px 24px rgba(99,102,241,0.12)' : undefined,
                }}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-indigo-400' : ''}`} />
                <span className="font-medium leading-tight">{mode.id}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.35, ease: sectionEase }}
        className="rounded-2xl border p-3 space-y-2"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          <Activity className="w-3.5 h-3.5" />
          Learning health
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-2.5 border" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}>
            <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Retention</div>
            <div className="text-lg font-bold tabular-nums">{retention != null ? `${retention}%` : '—'}</div>
            <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-border)' }}>
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(6, retention ?? 0)}%` }}
                transition={{ duration: 0.6, ease: sectionEase }}
              />
            </div>
          </div>
          <div className="rounded-xl p-2.5 border" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}>
            <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Confusion</div>
            <div className="text-lg font-bold">{confusion}</div>
            <div className="text-[10px] mt-0.5 tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {confusionScore != null ? `Score ${confusionScore}` : '—'}
            </div>
          </div>
        </div>
        <div className="rounded-xl p-2.5 border space-y-1.5" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}>
          <div className="text-[10px] uppercase tracking-wide flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <Target className="w-3 h-3" /> Weak topics
          </div>
          <div className="flex flex-wrap gap-1">
            {weakTopics.length === 0 ? (
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>No signals yet</span>
            ) : (
              weakTopics.slice(0, 4).map((w) => (
                <span
                  key={w.topic}
                  className="text-[10px] px-2 py-0.5 rounded-lg border"
                  style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
                >
                  {w.topic}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="rounded-xl p-2.5 border flex gap-2 items-start" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}>
          <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>{focusLine}</p>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.35, ease: sectionEase }}
        className="rounded-2xl border p-3 space-y-2"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          <ListTree className="w-3.5 h-3.5" />
          Smart chapters
        </div>
        {!videoReady ? (
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Chapters appear after the transcript loads.</p>
        ) : (
          <ul className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
            {chapters.map((ch, i) => (
              <motion.li key={`${ch.start}-${i}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                <button
                  type="button"
                  onClick={() => onSeek(ch.start)}
                  className="w-full flex items-start gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/5"
                  style={{ color: 'var(--text-main)' }}
                >
                  <span className="text-[10px] font-mono tabular-nums shrink-0 mt-0.5 px-1.5 py-0.5 rounded-md border" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}>
                    {formatTime(ch.start)}
                  </span>
                  <span className="text-[11px] leading-snug line-clamp-2">{ch.title}</span>
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.35, ease: sectionEase }}
        className="rounded-2xl border p-3 space-y-2 relative overflow-hidden"
        style={{ borderColor: 'var(--surface-border)', background: 'linear-gradient(145deg, var(--surface-muted), var(--surface-card))' }}
      >
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.9),_transparent_55%)]" />
        <div className="relative flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          AI insights
        </div>
        <p className="relative text-[12px] leading-relaxed font-medium" style={{ color: 'var(--text-main)' }}>
          “{aiLine}”
        </p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35, ease: sectionEase }}
        className="rounded-2xl border p-3 space-y-2"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          <Zap className="w-3.5 h-3.5" />
          Quick actions
        </div>
        <div className="flex flex-col gap-1.5">
          {actions.map((a, i) => (
            <motion.button
              key={a.id}
              type="button"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.03 }}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.99 }}
              disabled={!videoReady}
              onClick={() => onQuickAction(a.prompt)}
              className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[11px] font-medium border text-left disabled:opacity-45 disabled:pointer-events-none transition-colors"
              style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}
            >
              {a.label}
              <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-50" />
            </motion.button>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24, duration: 0.35, ease: sectionEase }}
        className="rounded-2xl border p-3 space-y-2"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          <Brain className="w-3.5 h-3.5" />
          Learning path
        </div>
        <ol className="space-y-1.5">
          {pathItems.map((step, i) => (
            <motion.li
              key={`${i}-${step}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
              className="flex gap-2 text-[11px] leading-snug"
            >
              <span className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 border" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}>
                {i + 1}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>{step}</span>
            </motion.li>
          ))}
        </ol>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.35, ease: sectionEase }}
        className="rounded-2xl border p-3 space-y-2 pb-4"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          <History className="w-3.5 h-3.5" />
          Session timeline
        </div>
        {!videoId ? (
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Open a lecture to record activity.</p>
        ) : timeline.length === 0 ? (
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Replays and questions will show up here.</p>
        ) : (
          <ul className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
            {timeline.map((item, i) => (
              <motion.li
                key={`${item.at}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.2) }}
                className="flex gap-2 text-[11px]"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                    item.type === 'replay' ? 'text-cyan-400' : 'text-indigo-400'
                  }`}
                  style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}
                >
                  {item.type === 'replay' ? <Clock3 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium capitalize" style={{ color: 'var(--text-main)' }}>{item.type}</span>
                    <span className="text-[10px] tabular-nums shrink-0" style={{ color: 'var(--text-muted)' }}>{formatRelativeTime(item.at)}</span>
                  </div>
                  <p className="line-clamp-2 mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                  {item.type === 'replay' && item.second != null && (
                    <button
                      type="button"
                      onClick={() => onSeek(item.second!)}
                      className="mt-1 text-[10px] font-medium text-indigo-400 hover:underline"
                    >
                      Jump {formatTime(item.second)}
                    </button>
                  )}
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </motion.section>
    </div>
  );
}
