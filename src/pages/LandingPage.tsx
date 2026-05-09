import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Brain, GraduationCap, MessageSquare, Moon, Sun } from 'lucide-react';
import { useLMS } from '../context/LMSContext';

const features = [
  {
    icon: MessageSquare,
    title: 'Grounded answers',
    body: 'Lecture-only responses with timestamps and memory.',
  },
  {
    icon: Brain,
    title: 'Adaptive signals',
    body: 'Weak topics and replays without cluttering study.',
  },
  {
    icon: BarChart3,
    title: 'Clear analytics',
    body: 'Heatmaps and retention when you want depth.',
  },
];

export function LandingPage() {
  const { theme, setTheme } = useLMS();

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ color: 'var(--text-main)' }}>
      <header className="mx-auto max-w-3xl px-5 py-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg premium-button flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold font-['Manrope'] tracking-tight">
            Learn<span className="text-gradient">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            className="w-10 h-10 rounded-lg flex items-center justify-center border"
            style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link
            to="/dashboard"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium premium-button text-white"
          >
            Open app
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-20">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="pt-6 md:pt-12"
        >
          <h1 className="text-3xl sm:text-4xl font-semibold font-['Manrope'] tracking-tight leading-tight mb-5">
            Calm AI for{' '}
            <span className="text-gradient">serious lectures</span>.
          </h1>
          <p className="text-base leading-relaxed mb-8 max-w-xl" style={{ color: 'var(--text-muted)' }}>
            Watch, read, and ask — on separate pages when you need focus. Analytics and revision stay out of the way until you open them.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium premium-button text-white"
            >
              Start
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/learn"
              className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-medium border"
              style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
            >
              Go to Learn
            </Link>
          </div>
        </motion.section>

        <section className="mt-20 space-y-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.25 }}
                className="rounded-xl border px-4 py-4 flex gap-4"
                style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
              >
                <Icon className="w-5 h-5 shrink-0 mt-0.5 opacity-70" />
                <div>
                  <h2 className="text-sm font-medium mb-1">{f.title}</h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {f.body}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
