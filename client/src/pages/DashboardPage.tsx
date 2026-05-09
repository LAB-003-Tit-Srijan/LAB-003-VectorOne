import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock3, PlayCircle, Sparkles, Target } from 'lucide-react';
import { useLMS } from '../context/LMSContext';
import { buildAiInsightLine, formatInsightTime, formatRelativeActivity } from '../lib/insightBrief';
import { buildSmartChapters } from '../lib/smartChapters';
import { dashboardQuickPrompts } from '../lib/quickPrompts';

export function DashboardPage() {
  const navigate = useNavigate();
  const {
    recentLectures,
    insights,
    learningDataLoading,
    videoId,
    transcriptData,
    loadLectureById,
    timeline,
    learningMode,
    queueQuickAction,
    inputUrl,
    setInputUrl,
    submitLectureUrl,
  } = useLMS();

  const videoReady = Boolean(videoId && transcriptData.length > 0);
  const insightLine = useMemo(() => buildAiInsightLine(insights, videoReady), [insights, videoReady]);
  const chapters = useMemo(() => (videoReady ? buildSmartChapters(transcriptData) : []), [videoReady, transcriptData]);
  const quickPrompts = useMemo(() => dashboardQuickPrompts(learningMode), [learningMode]);

  const onQuick = (prompt: string) => {
    queueQuickAction(prompt);
    navigate('/learn');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold font-['Manrope'] tracking-tight">Dashboard</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Resume lectures, scan signals, jump back into focus.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Add lecture
        </h2>
        <div
          className="rounded-2xl border px-3 py-2.5 flex gap-2"
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
        >
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitLectureUrl()}
            placeholder="YouTube URL or ID"
            className="flex-1 min-w-0 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-main)' }}
          />
          <button
            type="button"
            onClick={() => {
              submitLectureUrl();
              navigate('/learn');
            }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg premium-button text-white shrink-0"
          >
            Open
          </button>
        </div>
      </section>

      {videoId && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm leading-relaxed pl-3 border-l-2 border-amber-500/40"
          style={{ color: 'var(--text-muted)' }}
        >
          {insightLine}
        </motion.p>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Recent
          </h2>
          <Link to="/learn" className="text-xs font-medium hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
            Learn →
          </Link>
        </div>
        {recentLectures.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No lectures yet. Add a URL above.
          </p>
        ) : (
          <ul className="space-y-2">
            {recentLectures.slice(0, 8).map((lec) => (
              <li key={lec.videoId}>
                <button
                  type="button"
                  onClick={async () => {
                    await loadLectureById(lec.url);
                    navigate('/learn');
                  }}
                  className="w-full flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-opacity hover:opacity-90"
                  style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}
                >
                  <PlayCircle className="w-4 h-4 shrink-0 opacity-70" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{lec.title}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {new Date(lec.lastOpenedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0 opacity-30" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {videoReady && chapters.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Chapters
          </h2>
          <ul className="space-y-1">
            {chapters.slice(0, 8).map((ch, i) => (
              <li key={`${ch.start}-${i}`}>
                <Link
                  to={`/learn?v=${encodeURIComponent(videoId)}&t=${encodeURIComponent(String(Math.floor(ch.start)))}`}
                  className="flex items-center gap-3 py-2 text-sm rounded-lg px-2 -mx-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                >
                  <span className="text-[11px] font-mono tabular-nums w-12 shrink-0 opacity-60">
                    {formatInsightTime(ch.start)}
                  </span>
                  <span className="truncate">{ch.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {videoId && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Activity
            </h2>
            {learningDataLoading && <span className="text-[10px] opacity-60">sync</span>}
          </div>
          {timeline.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Questions and seeks will appear here.</p>
          ) : (
            <ul className="space-y-2">
              {timeline.slice(0, 6).map((item, i) => (
                <li key={`${item.at}-${i}`} className="flex gap-3 text-sm">
                  <Clock3 className="w-4 h-4 shrink-0 mt-0.5 opacity-40" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="capitalize text-xs font-medium">{item.type}</span>
                      <span className="text-[10px] opacity-50">{formatRelativeActivity(item.at)}</span>
                    </div>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                      {item.label}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {videoReady && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Ask in chat
          </h2>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => onQuick(q.prompt)}
                className="text-xs font-medium px-3 py-2 rounded-xl border transition-opacity hover:opacity-85"
                style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
              >
                {q.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Signals
          </h2>
          <Link to="/analytics" className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Analytics →
          </Link>
        </div>
        {!videoId ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Load a lecture to see weak topics.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(insights?.weakTopics ?? []).length === 0 ? (
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>No weak-topic signal yet.</span>
            ) : (
              (insights?.weakTopics ?? []).slice(0, 5).map((w) => (
                <span
                  key={w.topic}
                  className="text-xs px-2.5 py-1 rounded-lg border inline-flex items-center gap-1"
                  style={{ borderColor: 'var(--surface-border)' }}
                >
                  <Target className="w-3 h-3 opacity-50" />
                  {w.topic}
                </span>
              ))
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border p-4 flex items-start gap-3" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}>
        <Sparkles className="w-4 h-4 shrink-0 mt-0.5 opacity-60" />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Study mode and AI preferences live in <Link to="/settings" className="underline font-medium">Settings</Link>.
          Structured revision tools are on <Link to="/revision" className="underline font-medium">Revision</Link>.
        </p>
      </section>
    </div>
  );
}
