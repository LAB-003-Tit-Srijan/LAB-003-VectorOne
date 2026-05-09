import { useCallback, useState } from 'react';
import { captureClientException } from '../lib/monitoring';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookMarked, Loader2, Sparkles } from 'lucide-react';
import { useLMS } from '../context/LMSContext';

type Tab = 'summaries' | 'notes' | 'flashcards' | 'quizzes';

const tabCopy: Record<
  Tab,
  { label: string; description: string; prompt: (mode: string) => string }
> = {
  summaries: {
    label: 'AI summaries',
    description: 'High-level narrative of the full lecture, grounded in transcript.',
    prompt: (mode) =>
      `Study mode: ${mode}. Write a structured lecture summary with sections: Overview, Key ideas, Definitions, Takeaways. Use only the lecture transcript.`,
  },
  notes: {
    label: 'Study notes',
    description: 'Bulleted notes you can export or copy before exams.',
    prompt: (mode) =>
      `Study mode: ${mode}. Create concise study notes as nested bullets. Include "Exam watchlist" for tricky ideas. Lecture only.`,
  },
  flashcards: {
    label: 'Flashcards',
    description: 'Question / answer pairs for spaced repetition.',
    prompt: (mode) =>
      `Study mode: ${mode}. Create 8 flashcards in format "Q: ... A: ..." covering the lecture. Lecture only, no outside facts.`,
  },
  quizzes: {
    label: 'Quizzes',
    description: 'Short checks with answers to validate understanding.',
    prompt: (mode) =>
      `Study mode: ${mode}. Build a 6-question quiz about the lecture with answers at the end. Mix difficulty. Lecture only.`,
  },
};

export function RevisionPage() {
  const { videoId, sessionId, transcriptData, learningMode } = useLMS();
  const [tab, setTab] = useState<Tab>('summaries');
  const [content, setContent] = useState<Partial<Record<Tab, string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!videoId || transcriptData.length === 0) {
      setError('Load a lecture on the Learn page first.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const question = tabCopy[tab].prompt(learningMode);
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          sessionId,
          question,
          transcript: transcriptData,
        }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      const text = data.answer ?? '';
      let shown = '';
      setContent((c) => ({ ...c, [tab]: '' }));
      if (!text.length) {
        setLoading(false);
        return;
      }
      const step = Math.max(1, Math.ceil(text.length / 80));
      const id = window.setInterval(() => {
        shown = text.slice(0, shown.length + step);
        setContent((c) => ({ ...c, [tab]: shown }));
        if (shown.length >= text.length) {
          window.clearInterval(id);
          setLoading(false);
        }
      }, 22);
    } catch (e: unknown) {
      captureClientException(e, { scope: 'RevisionPage', route: '/api/ask' });
      setError(e instanceof Error ? e.message : 'Generation failed.');
      setLoading(false);
    }
  }, [videoId, sessionId, transcriptData, learningMode, tab]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-['Manrope'] tracking-tight flex items-center gap-2">
          <BookMarked className="w-7 h-7 text-rose-300" />
          Revision lab
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Summaries, notes, flashcards, and quizzes generated from your loaded lecture — same RAG stack as chat.
        </p>
      </div>

      {!videoId || transcriptData.length === 0 ? (
        <div
          className="rounded-2xl border p-6 text-sm"
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
        >
          <Link to="/learn" className="font-semibold text-indigo-400 hover:underline">
            Open Learn
          </Link>{' '}
          and load a transcript to enable revision tools.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(Object.keys(tabCopy) as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className="px-3 py-2 rounded-xl text-xs font-semibold border capitalize"
            style={{
              borderColor: tab === key ? 'rgba(99,102,241,0.45)' : 'var(--surface-border)',
              background: tab === key ? 'rgba(99,102,241,0.12)' : 'var(--surface-muted)',
              color: tab === key ? 'var(--text-main)' : 'var(--text-muted)',
            }}
          >
            {tabCopy[key].label}
          </button>
        ))}
      </div>

      <div
        className="rounded-3xl border overflow-hidden flex flex-col min-h-[420px]"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
      >
        <div className="p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderColor: 'var(--surface-border)' }}>
          <div>
            <div className="font-semibold text-sm">{tabCopy[tab].label}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {tabCopy[tab].description}
            </div>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            disabled={loading || !videoId || transcriptData.length === 0}
            onClick={() => void generate()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold premium-button text-white disabled:opacity-45"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate
          </motion.button>
        </div>
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto custom-scrollbar max-h-[560px]">
          {error && (
            <div className="mb-4 text-sm text-rose-300 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2">
              {error}
            </div>
          )}
          <pre
            className="whitespace-pre-wrap text-sm font-sans leading-relaxed"
            style={{ color: 'var(--text-main)' }}
          >
            {content[tab] || (loading ? '' : 'Press Generate to create revision content for this tab.')}
          </pre>
        </div>
      </div>
    </div>
  );
}
