import { useEffect, useRef } from 'react';
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

export function Transcript({ transcriptData, currentTime, onSeek, isLoading, error }: TranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Auto-scroll to active item
  useEffect(() => {
    if (activeItemRef.current && containerRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime]);

  return (
    <div className="glass-panel w-full rounded-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-900/50">
        <div className="flex items-center gap-2 text-slate-300">
          <FileText className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Interactive Transcript</h3>
        </div>
        <div className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
          Auto-scroll enabled
        </div>
      </div>
      
      <div ref={containerRef} className="max-h-[360px] overflow-y-auto p-4 custom-scrollbar space-y-2 relative">
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
          const isActive = currentTime >= item.offset && currentTime < item.offset + item.duration;
          
          return (
            <motion.div 
              whileHover={{ x: 4 }}
              key={idx}
              ref={isActive ? activeItemRef : null}
              onClick={() => onSeek(item.offset)}
              className={`flex gap-4 p-3 rounded-xl cursor-pointer transition-colors duration-200 ${
                isActive 
                  ? 'bg-indigo-500/10 border border-indigo-500/20' 
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
