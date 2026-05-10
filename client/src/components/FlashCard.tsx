/**
 * FlashCard — a reusable animated flip-card component.
 *
 * Props:
 *   question    — front face text
 *   answer      — back face text
 *   difficulty  — 'easy' | 'medium' | 'hard'  (colours the badge)
 *   index       — card number for display (1-based)
 *   total       — total cards in deck (for "3 / 10" counter)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface FlashCardProps {
  question:   string;
  answer:     string;
  difficulty: Difficulty;
  index:      number;
  total:      number;
}

const DIFF_STYLES: Record<Difficulty, { label: string; className: string }> = {
  easy:   { label: 'Easy',   className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  medium: { label: 'Medium', className: 'bg-amber-500/15  text-amber-400  border-amber-500/25'  },
  hard:   { label: 'Hard',   className: 'bg-rose-500/15   text-rose-400   border-rose-500/25'   },
};

export function FlashCard({ question, answer, difficulty, index, total }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false);
  const diff = DIFF_STYLES[difficulty] ?? DIFF_STYLES.medium;

  return (
    <div
      className="relative w-full cursor-pointer select-none"
      style={{ perspective: '1200px' }}
      onClick={() => setFlipped(f => !f)}
      role="button"
      tabIndex={0}
      aria-label={flipped ? 'Show question' : 'Reveal answer'}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setFlipped(f => !f); }}
    >
      {/* ── Card shell — flip container ─────────────────────────────── */}
      <motion.div
        className="relative w-full"
        style={{ transformStyle: 'preserve-3d', minHeight: '220px' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* ── FRONT face ──────────────────────────────────────────────── */}
        <div
          className="absolute inset-0 rounded-2xl border flex flex-col justify-between p-5 sm:p-6"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            borderColor: 'var(--surface-border)',
            background: 'var(--surface-muted)',
          }}
        >
          {/* Top row */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Question · {index} / {total}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${diff.className}`}>
              {diff.label}
            </span>
          </div>

          {/* Question text */}
          <p className="text-sm sm:text-base font-semibold leading-relaxed text-center px-2" style={{ color: 'var(--text-main)' }}>
            {question}
          </p>

          {/* Tap hint */}
          <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
            Tap to reveal answer
          </p>
        </div>

        {/* ── BACK face ───────────────────────────────────────────────── */}
        <div
          className="absolute inset-0 rounded-2xl border flex flex-col justify-between p-5 sm:p-6"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderColor: 'rgba(99,102,241,0.30)',
            background: 'rgba(99,102,241,0.06)',
          }}
        >
          {/* Top row */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
              Answer · {index} / {total}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${diff.className}`}>
              {diff.label}
            </span>
          </div>

          {/* Answer text */}
          <p className="text-sm sm:text-base leading-relaxed text-center px-2" style={{ color: 'var(--text-main)' }}>
            {answer}
          </p>

          {/* Tap hint */}
          <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
            Tap to flip back
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FlashcardDeck — manages the full revision-mode UI:
     • card navigation  (prev / next)
     • progress bar
     • shuffle toggle
     • difficulty filter
     • keyboard shortcuts (← →  Space)
   ───────────────────────────────────────────────────────────────────────── */

export interface FlashcardDeckProps {
  cards: FlashCardProps[];
}

export function FlashcardDeck({ cards }: FlashcardDeckProps) {
  const [index,     setIndex]     = useState(0);
  const [flipped,   setFlipped]   = useState(false);
  const [direction, setDirection] = useState(1);          // +1 forward, -1 backward
  const [filter,    setFilter]    = useState<Difficulty | 'all'>('all');
  const [shuffled,  setShuffled]  = useState(false);
  const [deck,      setDeck]      = useState(cards);

  const filtered = filter === 'all' ? deck : deck.filter(c => c.difficulty === filter);

  // counts per difficulty for the filter badges
  const counts = { all: deck.length, easy: 0, medium: 0, hard: 0 };
  deck.forEach(c => { counts[c.difficulty]++; });

  const current = filtered[index] ?? null;
  const total   = filtered.length;

  function go(dir: 1 | -1) {
    setDirection(dir);
    setFlipped(false);
    setIndex(i => {
      const next = i + dir;
      if (next < 0)      return total - 1;
      if (next >= total) return 0;
      return next;
    });
  }

  function handleShuffle() {
    const copy = [...deck].sort(() => Math.random() - 0.5);
    setDeck(copy);
    setIndex(0);
    setFlipped(false);
    setShuffled(s => !s);
  }

  function handleFilterChange(f: Difficulty | 'all') {
    setFilter(f);
    setIndex(0);
    setFlipped(false);
  }

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft')  go(-1);
    if (e.key === ' ')          setFlipped(f => !f);
  }

  if (!current) {
    return (
      <div className="text-sm p-4 text-center" style={{ color: 'var(--text-muted)' }}>
        No flashcards match this filter.
      </div>
    );
  }

  return (
    <div className="space-y-4" onKeyDown={handleKeyDown} tabIndex={-1}>

      {/* ── Controls row ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Difficulty filters */}
        {(['all', 'easy', 'medium', 'hard'] as const).map(f => {
          const diffStyle = f !== 'all' ? DIFF_STYLES[f] : null;
          const active    = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => handleFilterChange(f)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border capitalize transition-colors ${
                active
                  ? (diffStyle?.className ?? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40')
                  : 'border-transparent opacity-55 hover:opacity-80'
              }`}
              style={active ? {} : { color: 'var(--text-muted)' }}
            >
              {f === 'all' ? `All · ${counts.all}` : `${f} · ${counts[f]}`}
            </button>
          );
        })}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Shuffle */}
        <button
          type="button"
          onClick={handleShuffle}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
            shuffled
              ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300'
              : 'border-transparent opacity-55 hover:opacity-80'
          }`}
          style={shuffled ? {} : { color: 'var(--text-muted)' }}
        >
          ⇄ Shuffle
        </button>
      </div>

      {/* ── Progress bar ─────────────────────────────────────────────── */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-border)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, var(--brand-a), var(--brand-b))' }}
          animate={{ width: `${((index + 1) / total) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* ── Animated card ────────────────────────────────────────────── */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${index}-${filter}-${shuffled}`}
          initial={{ opacity: 0, x: direction * 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{    opacity: 0, x: direction * -60 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <FlashCard
            question={current.question}
            answer={current.answer}
            difficulty={current.difficulty}
            index={index + 1}
            total={total}
          />
        </motion.div>
      </AnimatePresence>

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          id="btn-flashcard-prev"
          onClick={() => go(-1)}
          disabled={total <= 1}
          className="px-4 py-2 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-30 hover:bg-indigo-500/10"
          style={{ borderColor: 'var(--surface-border)', color: 'var(--text-main)' }}
        >
          ← Prev
        </button>

        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {index + 1} / {total} · Space to flip · ← → to navigate
        </span>

        <button
          type="button"
          id="btn-flashcard-next"
          onClick={() => go(1)}
          disabled={total <= 1}
          className="px-4 py-2 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-30 hover:bg-indigo-500/10"
          style={{ borderColor: 'var(--surface-border)', color: 'var(--text-main)' }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
