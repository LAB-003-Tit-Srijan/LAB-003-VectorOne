import { motion } from 'framer-motion';
import { Moon, Settings, Sun } from 'lucide-react';
import { STUDY_MODES } from '../data/studyModes';
import { useLMS } from '../context/LMSContext';
import type { AiPreferences } from '../types/lms';

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition-colors hover:bg-white/5"
      style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
    >
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</div>
      </div>
      <div
        className={`w-11 h-6 rounded-full relative shrink-0 transition-colors ${checked ? 'bg-indigo-500' : 'bg-slate-600/50'}`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </div>
    </button>
  );
}

export function SettingsPage() {
  const {
    theme,
    setTheme,
    learningMode,
    setLearningMode,
    aiPreferences,
    setAiPreferences,
  } = useLMS();

  const setStyle = (responseStyle: AiPreferences['responseStyle']) => {
    setAiPreferences((p) => ({ ...p, responseStyle }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-['Manrope'] tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-slate-400" />
          Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Study modes, appearance, and how the assistant frames answers.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Appearance
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.99 }}
            onClick={() => setTheme('light')}
            className="rounded-2xl border p-4 flex items-center gap-3 text-left"
            style={{
              borderColor: theme === 'light' ? 'rgba(99,102,241,0.5)' : 'var(--surface-border)',
              background: 'var(--surface-muted)',
            }}
          >
            <Sun className="w-5 h-5 text-amber-400" />
            <div>
              <div className="font-medium text-sm">Light</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Crisp daytime contrast</div>
            </div>
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.99 }}
            onClick={() => setTheme('dark')}
            className="rounded-2xl border p-4 flex items-center gap-3 text-left"
            style={{
              borderColor: theme === 'dark' ? 'rgba(99,102,241,0.5)' : 'var(--surface-border)',
              background: 'var(--surface-muted)',
            }}
          >
            <Moon className="w-5 h-5 text-indigo-300" />
            <div>
              <div className="font-medium text-sm">Dark</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Low-glare focus mode</div>
            </div>
          </motion.button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Default study mode
        </h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {STUDY_MODES.map((mode) => {
            const Icon = mode.icon;
            const active = learningMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setLearningMode(mode.id)}
                className="rounded-2xl border px-3 py-3 flex items-center gap-2 text-left text-sm transition-colors"
                style={{
                  borderColor: active ? 'rgba(99,102,241,0.45)' : 'var(--surface-border)',
                  background: active ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(6,182,212,0.08))' : 'var(--surface-muted)',
                  color: active ? 'var(--text-main)' : 'var(--text-muted)',
                }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-medium">{mode.id}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          AI preferences
        </h2>
        <div className="space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Response length
          </div>
          <div className="flex flex-wrap gap-2">
            {(['concise', 'balanced', 'thorough'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setStyle(key)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border capitalize"
                style={{
                  borderColor: aiPreferences.responseStyle === key ? 'rgba(99,102,241,0.5)' : 'var(--surface-border)',
                  background:
                    aiPreferences.responseStyle === key ? 'rgba(99,102,241,0.12)' : 'var(--surface-muted)',
                }}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
        <Toggle
          checked={aiPreferences.citeTimestamps}
          onChange={(v) => setAiPreferences((p) => ({ ...p, citeTimestamps: v }))}
          label="Prefer timestamp citations"
          description="When possible, anchor explanations to lecture timecodes."
        />
        <Toggle
          checked={aiPreferences.showSourceHints}
          onChange={(v) => setAiPreferences((p) => ({ ...p, showSourceHints: v }))}
          label="Show source hints in UI"
          description="Surfaces retrieval context in the assistant panel (visual only for now)."
        />
      </section>
    </div>
  );
}
