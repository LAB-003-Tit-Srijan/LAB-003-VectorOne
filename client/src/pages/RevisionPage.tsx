import { useCallback, useState, useEffect } from 'react';
import { captureClientException } from '../lib/monitoring';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookMarked, Download, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { useLMS } from '../context/LMSContext';
import { useAuth } from '../context/AuthContext';
import { parseJsonBody } from '../lib/apiBase';
import { FlashcardDeck } from '../components/FlashCard';
import { QuizPlayer } from '../components/QuizPlayer';
import type { QuizQuestionData } from '../components/QuizPlayer';

function StudyNotes({ videoId }: { videoId: string }) {
  const { authFetch } = useAuth();
  const [notes, setNotes] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // We fetch automatically since the pipeline generates it on transcript load
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/notes/${videoId}`);
      if (!res.ok) throw new Error('Notes are not ready. The AI pipeline is still processing this lecture.');
      const data = await res.json();
      setNotes(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [videoId, authFetch]);

  // Download PDF handler — triggers a blob fetch from the backend
  const downloadPdf = useCallback(async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const res = await authFetch(`/api/notes/${videoId}/pdf`);
      if (!res.ok) throw new Error('PDF generation failed. Please try again.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study-notes-${videoId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      // surface inline — don't clobber the notes error state
      alert(err.message ?? 'Could not download PDF.');
    } finally {
      setPdfLoading(false);
    }
  }, [videoId, authFetch, pdfLoading]);

  // Initial fetch
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  if (loading) return <div className="text-sm p-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}><Loader2 className="w-4 h-4 animate-spin"/> Fetching notes from AI pipeline...</div>;
  if (error) return (
    <div className="text-sm p-4 border border-rose-500/20 bg-rose-500/5 rounded-xl text-rose-300">
      <div className="mb-3">{error}</div>
      <button onClick={fetchNotes} className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg transition-colors">Refresh Status</button>
    </div>
  );
  if (!notes || !notes.sections) return <div className="text-sm p-4">No notes generated.</div>;

  return (
    <div className="space-y-4">
      {/* Download bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {notes.sections.length} section{notes.sections.length !== 1 ? 's' : ''} · AI-generated
        </span>
        <motion.button
          id="btn-download-pdf"
          type="button"
          whileTap={{ scale: 0.96 }}
          disabled={pdfLoading}
          onClick={() => void downloadPdf()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50"
          style={{
            borderColor: 'rgba(99,102,241,0.35)',
            background: 'rgba(99,102,241,0.08)',
            color: 'var(--text-main)',
          }}
        >
          {pdfLoading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Download className="w-3.5 h-3.5 text-indigo-400" />}
          {pdfLoading ? 'Generating…' : 'Download PDF'}
        </motion.button>
      </div>
      {notes.sections.map((section: any, idx: number) => (
        <details key={idx} className="group bg-indigo-500/5 border border-indigo-500/20 rounded-2xl overflow-hidden" open={idx === 0}>
          <summary className="cursor-pointer p-4 font-semibold text-sm flex justify-between items-center bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors">
            {section.title}
            <span className="text-indigo-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="p-4 space-y-4 text-sm" style={{ color: 'var(--text-main)' }}>
            {section.content && <div className="whitespace-pre-wrap leading-relaxed">{section.content}</div>}
            
            {section.keyConcepts && section.keyConcepts.length > 0 && (
              <div className="bg-indigo-500/5 p-3.5 rounded-xl border border-indigo-500/10">
                <h4 className="text-[11px] font-bold text-indigo-400 mb-2 uppercase tracking-wider">Key Concepts</h4>
                <ul className="list-disc pl-4 space-y-1.5 opacity-90">
                  {section.keyConcepts.map((c: string, i: number) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
            
            {section.formulas && section.formulas.length > 0 && (
              <div className="bg-rose-500/10 p-3.5 rounded-xl border border-rose-500/20">
                <h4 className="text-[11px] font-bold text-rose-300 mb-2 uppercase tracking-wider">Formulas / Rules</h4>
                <ul className="list-disc pl-4 space-y-1.5 text-rose-200">
                  {section.formulas.map((f: string, i: number) => <li key={i} className="font-mono text-[13px]">{f}</li>)}
                </ul>
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

// ── StudyFlashcards ──────────────────────────────────────────────────────────
// Fetches stored flashcards; if none exist, offers a one-click generate button
// that calls POST /api/flashcards/generate with the current transcript text.
// ─────────────────────────────────────────────────────────────────────────────
type RawCard = { question: string; answer: string; difficulty: 'easy' | 'medium' | 'hard' };

function StudyFlashcards({
  videoId,
  transcriptText,
}: {
  videoId: string;
  transcriptText: string;
}) {
  const { authFetch } = useAuth();
  const [cards,      setCards]      = useState<RawCard[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/flashcards/${videoId}`);
      if (res.status === 404) {
        // Not yet generated — show empty state
        setCards([]);
        return;
      }
      if (!res.ok) throw new Error('Failed to load flashcards.');
      const data = await res.json();
      setCards(data.cards ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [videoId, authFetch]);

  const generate = useCallback(async () => {
    if (!transcriptText || transcriptText.length < 50) {
      setError('Transcript too short to generate flashcards.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await authFetch('/api/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, transcript: transcriptText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error ?? `Error ${res.status}`);
      }
      const data = await res.json();
      setCards(data.cards ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }, [videoId, transcriptText, authFetch]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  if (loading) {
    return (
      <div className="text-sm p-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
        <Loader2 className="w-4 h-4 animate-spin" /> Loading flashcards…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm p-4 border border-rose-500/20 bg-rose-500/5 rounded-xl text-rose-300 space-y-3">
        <div>{error}</div>
        <button onClick={fetchCards} className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg transition-colors">
          Retry
        </button>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No flashcards yet — generate them automatically from the lecture transcript.
        </p>
        <motion.button
          id="btn-generate-flashcards"
          type="button"
          whileTap={{ scale: 0.97 }}
          disabled={generating}
          onClick={() => void generate()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold premium-button text-white disabled:opacity-50"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'Generating flashcards…' : 'Generate Flashcards'}
        </motion.button>
      </div>
    );
  }

  // Map raw API cards to FlashCardProps shape (add sequential index + total)
  const deckCards = cards.map((c, i) => ({
    ...c,
    index: i + 1,
    total: cards.length,
  }));

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {cards.length} card{cards.length !== 1 ? 's' : ''} · AI-generated
        </span>
        <motion.button
          id="btn-regenerate-flashcards"
          type="button"
          whileTap={{ scale: 0.96 }}
          disabled={generating}
          onClick={() => void generate()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50"
          style={{
            borderColor: 'rgba(99,102,241,0.35)',
            background:  'rgba(99,102,241,0.08)',
            color:       'var(--text-main)',
          }}
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />}
          {generating ? 'Regenerating…' : 'Regenerate'}
        </motion.button>
      </div>

      <FlashcardDeck cards={deckCards} />
    </div>
  );
}

// ── StudyQuiz ────────────────────────────────────────────────────────────────
// Mirrors StudyFlashcards: loads stored quiz on mount, offers generate CTA if
// none exists, shows regenerate button once loaded.
// ─────────────────────────────────────────────────────────────────────────────
function StudyQuiz({
  videoId,
  transcriptText,
}: {
  videoId: string;
  transcriptText: string;
}) {
  const { authFetch } = useAuth();
  const [questions,  setQuestions]  = useState<QuizQuestionData[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const fetchQuiz = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/quiz/${videoId}`);
      if (res.status === 404) { setQuestions([]); return; }
      if (!res.ok) throw new Error('Failed to load quiz.');
      const data = await res.json();
      setQuestions(data.questions ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [videoId, authFetch]);

  const generate = useCallback(async () => {
    if (!transcriptText || transcriptText.length < 50) {
      setError('Transcript too short to generate a quiz.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await authFetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, transcript: transcriptText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error ?? `Error ${res.status}`);
      }
      const data = await res.json();
      setQuestions(data.questions ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }, [videoId, transcriptText, authFetch]);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  if (loading) {
    return (
      <div className="text-sm p-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
        <Loader2 className="w-4 h-4 animate-spin" /> Loading quiz…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm p-4 border border-rose-500/20 bg-rose-500/5 rounded-xl text-rose-300 space-y-3">
        <div>{error}</div>
        <button onClick={fetchQuiz} className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg transition-colors">
          Retry
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No quiz yet — generate one automatically from the lecture transcript.
        </p>
        <motion.button
          id="btn-generate-quiz"
          type="button"
          whileTap={{ scale: 0.97 }}
          disabled={generating}
          onClick={() => void generate()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold premium-button text-white disabled:opacity-50"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'Generating quiz…' : 'Generate Quiz'}
        </motion.button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {questions.length} question{questions.length !== 1 ? 's' : ''} · AI-generated
        </span>
        <motion.button
          id="btn-regenerate-quiz"
          type="button"
          whileTap={{ scale: 0.96 }}
          disabled={generating}
          onClick={() => void generate()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50"
          style={{
            borderColor: 'rgba(99,102,241,0.35)',
            background:  'rgba(99,102,241,0.08)',
            color:       'var(--text-main)',
          }}
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />}
          {generating ? 'Regenerating…' : 'Regenerate'}
        </motion.button>
      </div>

      <QuizPlayer key={questions.length} questions={questions} />
    </div>
  );
}

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
  const { authFetch } = useAuth();
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
      const res = await authFetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          sessionId,
          question,
          transcript: transcriptData,
        }),
      });
      const data = await parseJsonBody<{ answer?: string; error?: string }>(res);
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
  }, [videoId, sessionId, transcriptData, learningMode, tab, authFetch]);

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
          {tab !== 'notes' && tab !== 'flashcards' && tab !== 'quizzes' && (
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
          )}
        </div>
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto custom-scrollbar max-h-[560px]">
          {error && tab !== 'notes' && (
            <div className="mb-4 text-sm text-rose-300 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2">
              {error}
            </div>
          )}
          {tab === 'notes' ? (
            <StudyNotes videoId={videoId} />
          ) : tab === 'flashcards' ? (
            <StudyFlashcards
              videoId={videoId}
              transcriptText={transcriptData.map((t: any) => t.text).join(' ')}
            />
          ) : tab === 'quizzes' ? (
            <StudyQuiz
              videoId={videoId}
              transcriptText={transcriptData.map((t: any) => t.text).join(' ')}
            />
          ) : (
            <pre
              className="whitespace-pre-wrap text-sm font-sans leading-relaxed"
              style={{ color: 'var(--text-main)' }}
            >
              {content[tab] || (loading ? '' : 'Press Generate to create revision content for this tab.')}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
