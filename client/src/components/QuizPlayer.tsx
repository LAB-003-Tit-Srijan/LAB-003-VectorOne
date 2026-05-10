/**
 * QuizPlayer — modular, interactive MCQ quiz component.
 *
 * Exports:
 *   QuizQuestion  – renders a single MCQ with option picking + reveal
 *   QuizPlayer    – orchestrates the full quiz session:
 *                   • question navigation
 *                   • live score tracking
 *                   • results screen with per-question review
 *                   • difficulty / topic badges
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ChevronRight, RotateCcw, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLMS } from '../context/LMSContext';

// ── Shared types ─────────────────────────────────────────────────────────────

export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export interface QuizQuestionData {
    question:     string;
    options:      string[];          // length 2–4
    correctIndex: number;            // 0-based
    explanation:  string;
    difficulty:   QuizDifficulty;
    topic:        string;
}

// ── Difficulty badge styles ────────────────────────────────────────────────

const DIFF: Record<QuizDifficulty, { label: string; cls: string }> = {
    easy:   { label: 'Easy',   cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
    medium: { label: 'Medium', cls: 'bg-amber-500/15  text-amber-400  border-amber-500/25'  },
    hard:   { label: 'Hard',   cls: 'bg-rose-500/15   text-rose-400   border-rose-500/25'   },
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

// ── QuizQuestion ─────────────────────────────────────────────────────────────

interface QuizQuestionProps {
    data:         QuizQuestionData;
    index:        number;         // 0-based
    total:        number;
    onAnswer:     (selectedIndex: number, correct: boolean) => void;
    answered:     number | null;  // selected index, or null
}

export function QuizQuestion({ data, index, total, onAnswer, answered }: QuizQuestionProps) {
    const diff     = DIFF[data.difficulty] ?? DIFF.medium;
    const revealed = answered !== null;

    function pick(i: number) {
        if (revealed) return;
        onAnswer(i, i === data.correctIndex);
    }

    return (
        <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Question {index + 1} / {total}
                </span>
                {data.topic && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold"
                        style={{ borderColor: 'rgba(99,102,241,0.30)', background: 'rgba(99,102,241,0.08)', color: '#818cf8' }}>
                        {data.topic}
                    </span>
                )}
                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${diff.cls}`}>
                    {diff.label}
                </span>
            </div>

            {/* Question stem */}
            <p className="text-sm sm:text-base font-semibold leading-relaxed" style={{ color: 'var(--text-main)' }}>
                {data.question}
            </p>

            {/* Options */}
            <div className="space-y-2.5">
                {data.options.map((opt, i) => {
                    const isSelected = answered === i;
                    const isCorrect  = i === data.correctIndex;

                    let border = 'var(--surface-border)';
                    let bg     = 'transparent';
                    let textCl = 'var(--text-main)';

                    if (revealed) {
                        if (isCorrect) {
                            border = 'rgba(52,211,153,0.55)';
                            bg     = 'rgba(52,211,153,0.09)';
                        } else if (isSelected) {
                            border = 'rgba(239,68,68,0.50)';
                            bg     = 'rgba(239,68,68,0.08)';
                        }
                    } else if (isSelected) {
                        border = 'rgba(99,102,241,0.55)';
                        bg     = 'rgba(99,102,241,0.10)';
                    }

                    return (
                        <motion.button
                            key={i}
                            type="button"
                            whileTap={revealed ? {} : { scale: 0.985 }}
                            onClick={() => pick(i)}
                            disabled={revealed}
                            className="w-full flex items-center gap-3 p-3 sm:p-3.5 rounded-xl border text-left transition-colors disabled:cursor-default"
                            style={{ borderColor: border, background: bg, color: textCl }}
                        >
                            {/* Letter badge */}
                            <span
                                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                                style={{
                                    background: revealed && isCorrect
                                        ? 'rgba(52,211,153,0.20)'
                                        : revealed && isSelected
                                        ? 'rgba(239,68,68,0.18)'
                                        : 'var(--surface-border)',
                                    color: revealed && isCorrect ? '#34d399'
                                        : revealed && isSelected ? '#f87171'
                                        : 'var(--text-muted)',
                                }}
                            >
                                {OPTION_LETTERS[i]}
                            </span>

                            <span className="flex-1 text-sm leading-snug">{opt}</span>

                            {/* Result icon */}
                            {revealed && isCorrect && (
                                <CheckCircle2 className="shrink-0 w-4 h-4 text-emerald-400" />
                            )}
                            {revealed && isSelected && !isCorrect && (
                                <XCircle className="shrink-0 w-4 h-4 text-red-400" />
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* Explanation (revealed after answering) */}
            <AnimatePresence>
                {revealed && data.explanation && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="rounded-xl border p-3.5 text-sm leading-relaxed"
                        style={{
                            borderColor: 'rgba(99,102,241,0.22)',
                            background:  'rgba(99,102,241,0.06)',
                            color:       'var(--text-main)',
                        }}
                    >
                        <span className="font-bold text-indigo-400 text-[11px] uppercase tracking-wider">Explanation · </span>
                        {data.explanation}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Results screen ────────────────────────────────────────────────────────────

interface ResultsProps {
    questions:   QuizQuestionData[];
    answers:     (number | null)[];
    onRestart:   () => void;
    onReview:    () => void;
}

function ScoreRing({ pct }: { pct: number }) {
    const r = 36;
    const circ = 2 * Math.PI * r;
    const dash = circ * (pct / 100);

    return (
        <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="8" />
            <motion.circle
                cx="48" cy="48" r={r}
                fill="none"
                stroke={pct >= 70 ? '#34d399' : pct >= 40 ? '#f59e0b' : '#f87171'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${circ}`}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: circ - dash }}
                transition={{ duration: 1, ease: 'easeOut' }}
                transform="rotate(-90 48 48)"
            />
            <text x="48" y="54" textAnchor="middle" fontSize="18" fontWeight="700"
                fill={pct >= 70 ? '#34d399' : pct >= 40 ? '#f59e0b' : '#f87171'}>
                {pct}%
            </text>
        </svg>
    );
}

function Results({ questions, answers, onRestart, onReview }: ResultsProps) {
    const correct = answers.filter((a, i) => a === questions[i]?.correctIndex).length;
    const total   = questions.length;
    const pct     = Math.round((correct / total) * 100);

    const label = pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good work!' : pct >= 40 ? 'Keep practising.' : 'Needs revision.';

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6 py-8"
        >
            <Trophy className="w-8 h-8 text-amber-400" />
            <ScoreRing pct={pct} />

            <div className="text-center space-y-1">
                <p className="text-xl font-bold font-['Manrope']" style={{ color: 'var(--text-main)' }}>
                    {correct} / {total} correct
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>

            {/* Per-difficulty breakdown */}
            <div className="flex gap-3 flex-wrap justify-center">
                {(['easy', 'medium', 'hard'] as QuizDifficulty[]).map(d => {
                    const qs   = questions.filter(q => q.difficulty === d);
                    const ok   = qs.filter((q, _) => answers[questions.indexOf(q)] === q.correctIndex).length;
                    if (!qs.length) return null;
                    return (
                        <div key={d} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${DIFF[d].cls}`}>
                            {DIFF[d].label}: {ok}/{qs.length}
                        </div>
                    );
                })}
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onReview}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-indigo-500/10"
                    style={{ borderColor: 'rgba(99,102,241,0.35)', color: 'var(--text-main)' }}
                >
                    Review answers
                </button>
                <button
                    type="button"
                    id="btn-quiz-restart"
                    onClick={onRestart}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold premium-button text-white"
                >
                    <RotateCcw className="w-4 h-4" /> Retake
                </button>
            </div>
        </motion.div>
    );
}

// ── Review screen ─────────────────────────────────────────────────────────────

function ReviewScreen({ questions, answers, onBack }: {
    questions: QuizQuestionData[];
    answers:   (number | null)[];
    onBack:    () => void;
}) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Answer review</h3>
                <button
                    type="button"
                    onClick={onBack}
                    className="text-xs text-indigo-400 hover:underline"
                >
                    ← Back to results
                </button>
            </div>
            {questions.map((q, i) => (
                <div key={i} className="rounded-2xl border p-4 space-y-3"
                    style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}>
                    <QuizQuestion
                        data={q}
                        index={i}
                        total={questions.length}
                        answered={answers[i]}
                        onAnswer={() => {}} // no-op — review is read-only
                    />
                </div>
            ))}
            <button
                type="button"
                onClick={onBack}
                className="text-xs text-indigo-400 hover:underline"
            >
                ← Back to results
            </button>
        </div>
    );
}

// ── QuizPlayer ────────────────────────────────────────────────────────────────

export interface QuizPlayerProps {
    questions: QuizQuestionData[];
}

type Screen = 'quiz' | 'results' | 'review';

export function QuizPlayer({ questions }: QuizPlayerProps) {
    const { authFetch } = useAuth();
    const { videoId, sessionId } = useLMS();
    const [index,     setIndex]     = useState(0);
    const [answers,   setAnswers]   = useState<(number | null)[]>(() => Array(questions.length).fill(null));
    const [screen,    setScreen]    = useState<Screen>('quiz');
    const [direction, setDirection] = useState(1);

    const current    = questions[index];
    const totalQ     = questions.length;
    const answeredQ  = answers.filter(a => a !== null).length;

    async function handleAnswer(selectedIndex: number, isCorrect: boolean) {
        setAnswers(prev => {
            const next = [...prev];
            next[index] = selectedIndex;
            return next;
        });

        // Track in analytics
        if (videoId && sessionId) {
          authFetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              videoId,
              eventType: isCorrect ? 'quiz_success' : 'quiz_mistake',
              topic: current.topic,
              isCorrect
            })
          }).catch(err => console.error('Failed to track quiz outcome:', err));
        }
    }

    function goTo(dir: 1 | -1) {
        const next = index + dir;
        if (next < 0 || next >= totalQ) return;
        setDirection(dir);
        setIndex(next);
    }

    function finish() {
        setScreen('results');
    }

    function restart() {
        setAnswers(Array(questions.length).fill(null));
        setIndex(0);
        setScreen('quiz');
    }

    if (screen === 'results') {
        return (
            <Results
                questions={questions}
                answers={answers}
                onRestart={restart}
                onReview={() => setScreen('review')}
            />
        );
    }

    if (screen === 'review') {
        return (
            <ReviewScreen
                questions={questions}
                answers={answers}
                onBack={() => setScreen('results')}
            />
        );
    }

    // ── Quiz screen ──────────────────────────────────────────────────────────
    const progressPct = (answeredQ / totalQ) * 100;

    return (
        <div className="space-y-5">
            {/* Progress bar */}
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-border)' }}>
                <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, var(--brand-a), var(--brand-b))' }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.3 }}
                />
            </div>

            {/* Question navigator dots */}
            <div className="flex flex-wrap gap-1.5 items-center">
                {questions.map((q, i) => {
                    const ans     = answers[i];
                    const isRight = ans === q.correctIndex;
                    let dotCls    = '';
                    if (ans === null) {
                        dotCls = i === index
                            ? 'bg-indigo-400'
                            : 'bg-[var(--surface-border)]';
                    } else {
                        dotCls = isRight ? 'bg-emerald-400' : 'bg-red-400';
                    }
                    return (
                        <button
                            key={i}
                            type="button"
                            aria-label={`Go to question ${i + 1}`}
                            onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
                            className={`w-2 h-2 rounded-full transition-all hover:opacity-80 ${dotCls} ${i === index ? 'scale-125' : ''}`}
                        />
                    );
                })}
                <span className="ml-auto text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {answeredQ} / {totalQ} answered
                </span>
            </div>

            {/* Animated question */}
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={index}
                    initial={{ opacity: 0, x: direction * 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{    opacity: 0, x: direction * -50 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                    <QuizQuestion
                        data={current}
                        index={index}
                        total={totalQ}
                        answered={answers[index]}
                        onAnswer={handleAnswer}
                    />
                </motion.div>
            </AnimatePresence>

            {/* Navigation row */}
            <div className="flex items-center justify-between pt-1 gap-3">
                <button
                    type="button"
                    id="btn-quiz-prev"
                    onClick={() => goTo(-1)}
                    disabled={index === 0}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-30 hover:bg-indigo-500/10"
                    style={{ borderColor: 'var(--surface-border)', color: 'var(--text-main)' }}
                >
                    ← Prev
                </button>

                {index < totalQ - 1 ? (
                    <button
                        type="button"
                        id="btn-quiz-next"
                        onClick={() => goTo(1)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors hover:bg-indigo-500/10"
                        style={{ borderColor: 'var(--surface-border)', color: 'var(--text-main)' }}
                    >
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        type="button"
                        id="btn-quiz-finish"
                        onClick={finish}
                        disabled={answeredQ === 0}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold premium-button text-white disabled:opacity-45"
                    >
                        <Trophy className="w-4 h-4" /> Finish quiz
                    </button>
                )}
            </div>
        </div>
    );
}
