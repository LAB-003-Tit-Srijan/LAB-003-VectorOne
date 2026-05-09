import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export interface TranscriptItem {
  text: string;
  duration: number;
  offset: number;
}

interface TranscriptProps {
  transcriptData: TranscriptItem[];
  currentTime: number;
  onSeek: (time: number) => void;
  isLoading: boolean;
  error: string | null;
}

const AUTO_SCROLL_RESUME_MS = 5000;

export function Transcript({ transcriptData, currentTime, onSeek, isLoading, error }: TranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);
  const previousActiveIndexRef = useRef<number>(-1);

  // Track whether the user is manually scrolling
  const [userScrolling, setUserScrolling] = useState(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When user clicks a timestamp, immediately force that index active
  const [forcedIndex, setForcedIndex] = useState<number | null>(null);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Find the active transcript line — just pick the last item whose offset we've passed
  const computedIndex = useMemo(() => {
    if (transcriptData.length === 0) return -1;

    let best = -1;
    for (let i = 0; i < transcriptData.length; i++) {
      if (transcriptData[i].offset <= currentTime + 0.15) {
        best = i;
      } else {
        break;
      }
    }
    return best;
  }, [transcriptData, currentTime]);

  // Use forced index if set, otherwise use computed
  const activeIndex = forcedIndex !== null ? forcedIndex : computedIndex;

  // Clear forced index once the video naturally catches up
  useEffect(() => {
    if (forcedIndex !== null && computedIndex >= forcedIndex) {
      setForcedIndex(null);
    }
  }, [computedIndex, forcedIndex]);

  const handleTimestampClick = useCallback((idx: number, offset: number) => {
    setForcedIndex(idx);
    onSeek(offset);
  }, [onSeek]);

  // Detect manual scroll and pause auto-scroll
  const handleUserScroll = useCallback(() => {
    setUserScrolling(true);

    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
    }

    resumeTimerRef.current = setTimeout(() => {
      setUserScrolling(false);
    }, AUTO_SCROLL_RESUME_MS);
  }, []);

  // Listen for wheel & touch — these ONLY fire on real user interaction
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleUserScroll, { passive: true });
    container.addEventListener('touchmove', handleUserScroll, { passive: true });
    return () => {
      container.removeEventListener('wheel', handleUserScroll);
      container.removeEventListener('touchmove', handleUserScroll);
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
      }
    };
  }, [handleUserScroll]);

  // Auto-scroll whenever the active line changes
  useEffect(() => {
    if (activeIndex < 0) return;
    if (activeIndex === previousActiveIndexRef.current) return;
    previousActiveIndexRef.current = activeIndex;

    if (userScrolling) return;
    scrollToActive();
  }, [activeIndex, userScrolling]);

  // When auto-scroll resumes after user was away, jump to active item
  useEffect(() => {
    if (!userScrolling && activeIndex >= 0) {
      scrollToActive();
    }
  }, [userScrolling]);

  function scrollToActive() {
    const container = containerRef.current;
    const activeEl = activeItemRef.current;
    if (!container || !activeEl) return;

    const containerTop = container.getBoundingClientRect().top;
    const activeTop = activeEl.getBoundingClientRect().top;
    const scrollTarget = container.scrollTop + (activeTop - containerTop) - 8;

    container.scrollTo({
      top: Math.max(0, scrollTarget),
      behavior: 'smooth',
    });
  }

  return (
    <div className="glass-panel w-full rounded-3xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}>
        <div className="flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
          <FileText className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Interactive Transcript</h3>
        </div>
        <div
          className={`text-xs px-2 py-1 rounded transition-colors duration-300 ${
            userScrolling
              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
              : 'border border-transparent'
          }`}
          style={!userScrolling ? { color: 'var(--text-muted)', background: 'var(--surface-card)' } : undefined}
        >
          {userScrolling ? 'Scrolled away · resuming…' : 'Auto-scroll enabled'}
        </div>
      </div>
      
      <div ref={containerRef} className="max-h-[380px] overflow-y-auto p-4 custom-scrollbar space-y-2 relative">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 z-10">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mb-2" />
            <p className="text-sm text-slate-400">Loading transcript...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 p-6 text-center z-10">
            <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
            <p className="text-sm text-slate-300 mb-1">Transcript Unavailable</p>
            <p className="text-xs text-slate-500">{error}</p>
          </div>
        )}

        {!isLoading && !error && transcriptData.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <FileText className="w-8 h-8 opacity-20 mb-2" />
            <p className="text-sm">No transcript loaded</p>
          </div>
        )}

        {!isLoading && !error && transcriptData.map((item, idx) => {
          const isActive = idx === activeIndex;
          
          return (
            <motion.div 
              whileHover={{ x: 4 }}
              animate={
                isActive
                  ? { x: 2, scale: 1.01, boxShadow: '0 0 0 1px rgba(99,102,241,0.2), 0 0 24px rgba(99,102,241,0.15)' }
                  : { x: 0, scale: 1, boxShadow: '0 0 0 0 rgba(0,0,0,0)' }
              }
              transition={{ duration: 0.22, ease: 'easeOut' }}
              key={idx}
              ref={isActive ? activeItemRef : null}
              onClick={() => handleTimestampClick(idx, item.offset)}
              className={`flex gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                isActive 
                  ? 'bg-indigo-500/15 border border-indigo-400/40 shadow-[0_0_0_1px_rgba(99,102,241,0.2)]' 
                  : 'hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <div className={`flex items-center gap-1.5 text-xs font-mono font-medium mt-0.5 ${
                isActive ? 'text-indigo-400' : 'text-slate-500'
              }`}>
                {isActive && <Clock className="w-3 h-3" />}
                {formatTime(item.offset)}
              </div>
              <div className={`text-sm leading-relaxed ${
                isActive ? 'text-slate-100 font-medium' : 'text-slate-400'
              }`} dangerouslySetInnerHTML={{ __html: item.text }} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

