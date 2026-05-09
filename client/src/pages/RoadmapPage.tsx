import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Circle, Map, Sparkles } from 'lucide-react';
import { useLMS } from '../context/LMSContext';

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

export function RoadmapPage() {
  const { insights, videoId } = useLMS();

  const steps: { title: string; detail: string; done: boolean }[] = [];

  if (!videoId) {
    steps.push({
      title: 'Connect a lecture',
      detail: 'Open Learn and paste a YouTube URL to seed your roadmap.',
      done: false,
    });
  } else if (!insights || insights.summary.totalQuestions < 1) {
    steps.push({
      title: 'Calibrate your profile',
      detail: 'Ask a few grounded questions so we can detect weak topics and replay habits.',
      done: false,
    });
  }

  (insights?.weakTopics ?? []).slice(0, 3).forEach((w) => {
    steps.push({
      title: `Stabilize · ${w.topic}`,
      detail: `Struggle rate ${Math.round(w.struggleRate * 100)}% — add drills and simpler explanations.`,
      done: w.struggleRate < 0.35,
    });
  });

  (insights?.mostAskedConcepts ?? [])
    .filter((c) => c.struggleRate < 0.42)
    .slice(0, 2)
    .forEach((c) => {
      steps.push({
        title: `Go deeper · ${c.concept}`,
        detail: `${c.mentions} asks — stretch into edge cases and interview-style prompts.`,
        done: c.mentions >= 4,
      });
    });

  const replay = insights?.replayHotspots?.[0];
  if (replay) {
    steps.push({
      title: `Re-watch · ${formatTime(replay.timestamp)}`,
      detail: `${replay.count} replays — consolidate before moving on.`,
      done: replay.count < 2,
    });
  }

  if (steps.length === 0) {
    steps.push({
      title: 'Keep exploring',
      detail: 'Your roadmap will refine as you study. Mix recap with “why” questions.',
      done: false,
    });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-['Manrope'] tracking-tight flex items-center gap-2">
          <Map className="w-7 h-7 text-indigo-400" />
          Learning roadmap
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Personalized progression from weak topics, curiosity patterns, and replay signals.
        </p>
      </div>

      <div
        className="rounded-3xl border p-6 sm:p-8 relative overflow-hidden"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-[0.08] bg-[radial-gradient(circle_at_20%_20%,_rgba(99,102,241,0.9),_transparent_50%)]" />
        <div className="relative space-y-6">
          {steps.map((step, i) => (
            <motion.div
              key={`${step.title}-${i}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex gap-4"
            >
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                    step.done ? 'text-emerald-400 border-emerald-500/40' : 'text-indigo-300 border-indigo-500/30'
                  }`}
                  style={{ background: 'var(--surface-card)' }}
                >
                  {step.done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </div>
                {i < steps.length - 1 && (
                  <div className="w-px flex-1 min-h-[24px] my-1" style={{ background: 'var(--surface-border)' }} />
                )}
              </div>
              <div className="pb-2 flex-1">
                <div className="font-semibold">{step.title}</div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  {step.detail}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div
        className="rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}
      >
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-sm">Stay in sync</div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              The Learn workspace updates this roadmap as you ask questions and seek timestamps.
            </p>
          </div>
        </div>
        <Link
          to="/learn"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold premium-button text-white shrink-0"
        >
          Open Learn
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
