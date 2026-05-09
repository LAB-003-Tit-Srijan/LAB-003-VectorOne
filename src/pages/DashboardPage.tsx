import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock3, PlayCircle, Target, TrendingUp, Zap } from 'lucide-react';
import { useLMS } from '../context/LMSContext';

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const {
    recentLectures,
    insights,
    learningDataLoading,
    videoId,
    loadLectureById,
  } = useLMS();

  const retention = insights?.summary.retentionScore ?? null;
  const confusion = insights?.summary.confusionLevel ?? '—';
  const weak = insights?.weakTopics ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-['Manrope'] tracking-tight mb-1">Dashboard</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Your lectures, progress signals, and next steps in one view.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          {
            label: 'Retention',
            value: retention != null ? `${retention}%` : videoId ? '—' : 'Open a lecture',
            icon: TrendingUp,
            hint: 'Based on your latest session signals.',
          },
          {
            label: 'Confusion',
            value: videoId ? confusion : '—',
            icon: Zap,
            hint: 'Aggregates repeats & fallbacks.',
          },
          {
            label: 'Active lecture',
            value: videoId ? videoId.slice(0, 8) + '…' : 'None',
            icon: PlayCircle,
            hint: 'Load or resume from Learn.',
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border p-5"
              style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                <Icon className="w-3.5 h-3.5" />
                {card.label}
              </div>
              <div className="text-2xl font-bold mb-1">{card.value}</div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.hint}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div
          className="rounded-3xl border p-5 sm:p-6"
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Recent lectures</h2>
            <Link
              to="/learn"
              className="text-xs font-semibold text-indigo-400 inline-flex items-center gap-1 hover:underline"
            >
              Open Learn
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentLectures.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No lectures yet. Paste a YouTube URL on the Learn page to start.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentLectures.slice(0, 6).map((lec) => (
                <li key={lec.videoId}>
                  <button
                    type="button"
                    onClick={async () => {
                      await loadLectureById(lec.url);
                      navigate('/learn');
                    }}
                    className="w-full flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors hover:bg-white/5"
                    style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0">
                      <PlayCircle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{lec.title}</div>
                      <div className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        <Clock3 className="w-3 h-3" />
                        {new Date(lec.lastOpenedAt).toLocaleString()}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 shrink-0 opacity-40" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className="rounded-3xl border p-5 sm:p-6"
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Weak topics &amp; hotspots</h2>
            {learningDataLoading && (
              <span className="text-[10px] animate-pulse" style={{ color: 'var(--text-muted)' }}>Updating…</span>
            )}
          </div>
          {!videoId ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Load a lecture to populate insights for this session.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <Target className="w-3 h-3" /> Weak topics
                </div>
                <div className="flex flex-wrap gap-2">
                  {weak.length === 0 ? (
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>No weak signals yet — keep asking questions.</span>
                  ) : (
                    weak.map((w) => (
                      <span
                        key={w.topic}
                        className="text-xs px-2.5 py-1 rounded-lg border"
                        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}
                      >
                        {w.topic}{' '}
                        <span className="opacity-60">({Math.round(w.struggleRate * 100)}%)</span>
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Replay-heavy segments
                </div>
                <ul className="space-y-1.5 text-sm">
                  {(insights?.replayHotspots ?? []).slice(0, 4).map((h) => (
                    <li key={h.timestamp} className="flex justify-between gap-2" style={{ color: 'var(--text-muted)' }}>
                      <span>{formatTime(h.timestamp)}</span>
                      <span className="tabular-nums">{h.count}×</span>
                    </li>
                  ))}
                  {(insights?.replayHotspots?.length ?? 0) === 0 && (
                    <li className="text-sm" style={{ color: 'var(--text-muted)' }}>Replays will appear after seeks.</li>
                  )}
                </ul>
              </div>
              <Link
                to="/analytics"
                className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:underline"
              >
                Full analytics
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
