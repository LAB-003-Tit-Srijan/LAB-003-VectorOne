import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Brain,
  GraduationCap,
  MessageSquare,
  Moon,
  PlayCircle,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react';
import { useLMS } from '../context/LMSContext';

const features = [
  {
    icon: MessageSquare,
    title: 'Grounded AI tutor',
    body: 'Ask questions with lecture-only answers, timestamps, and session memory.',
  },
  {
    icon: Brain,
    title: 'Adaptive insights',
    body: 'Weak topics, replay patterns, and retention signals update as you learn.',
  },
  {
    icon: BarChart3,
    title: 'Analytics suite',
    body: 'Confusion heatmaps, replay-heavy segments, and mastery radar in one place.',
  },
  {
    icon: Zap,
    title: 'Command center',
    body: 'Smart chapters, quick actions, and a roadmap that stays in sync with your session.',
  },
];

export function LandingPage() {
  const { theme, setTheme } = useLMS();

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ color: 'var(--text-main)' }}>
      <div className="absolute inset-0 -z-10 opacity-40 dark:opacity-25 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[520px] h-[520px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[480px] h-[480px] rounded-full bg-cyan-500/15 blur-[100px]" />
      </div>

      <header className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-10 h-10 rounded-xl premium-button flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg font-['Manrope'] tracking-tight">
            Learn<span className="text-gradient">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            className="w-10 h-10 rounded-xl flex items-center justify-center border"
            style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link
            to="/dashboard"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold premium-button text-white"
          >
            Open app
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        <section className="pt-10 md:pt-16 lg:pt-20 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium mb-6" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}>
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              AI-native learning platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold font-['Manrope'] tracking-tight leading-[1.08] mb-6">
              Turn any lecture into a{' '}
              <span className="text-gradient">personal AI classroom</span>.
            </h1>
            <p className="text-base sm:text-lg max-w-xl mb-8" style={{ color: 'var(--text-muted)' }}>
              Transcripts, visual context, and analytics work together so every answer stays grounded,
              every revisit is tracked, and your study path stays sharp.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold premium-button text-white shadow-lg shadow-indigo-500/25"
              >
                Start for free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/learn"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold border transition-colors hover:opacity-95"
                style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
              >
                <PlayCircle className="w-4 h-4" />
                Jump to Learn
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div
              className="rounded-3xl border p-6 sm:p-8 shadow-2xl"
              style={{
                borderColor: 'var(--surface-border)',
                background: 'linear-gradient(155deg, var(--surface-card), var(--surface-muted))',
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Live session
                </div>
                <span className="text-[10px] px-2 py-1 rounded-lg border" style={{ borderColor: 'var(--surface-border)' }}>
                  NIM · RAG
                </span>
              </div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl p-4 border"
                    style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
                  >
                    <div className="h-2 w-1/3 rounded-full mb-3 bg-indigo-500/30" />
                    <div className="h-2 w-full rounded-full mb-2 bg-white/5" />
                    <div className="h-2 w-4/5 rounded-full bg-white/5" />
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Models stay inside your lecture boundary — by design.
              </div>
            </div>
          </motion.div>
        </section>

        <section className="mt-24 md:mt-28">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold font-['Manrope'] mb-3">Built for serious learners</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Everything you need to run a modern AI study stack — without losing the rigor of a real classroom.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: i * 0.06, duration: 0.35 }}
                  className="rounded-2xl border p-5 h-full"
                  style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-indigo-500/15 text-indigo-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-sm mb-2">{f.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {f.body}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section className="mt-24 rounded-3xl border p-8 sm:p-12 text-center" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}>
          <h2 className="text-2xl sm:text-3xl font-bold font-['Manrope'] mb-4">Ready when you are</h2>
          <p className="max-w-lg mx-auto mb-8" style={{ color: 'var(--text-muted)' }}>
            Open the dashboard, paste a YouTube lecture, and let the platform wire up transcript sync, AI Q&amp;A, and analytics automatically.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-semibold premium-button text-white"
          >
            Go to dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
