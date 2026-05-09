import { motion } from 'framer-motion';
import { BookOpen, FastForward, Briefcase, GraduationCap } from 'lucide-react';

const MODES = [
  { id: 'Beginner', icon: BookOpen, desc: 'Detailed explanations' },
  { id: 'Exam Revision', icon: GraduationCap, desc: 'Focus on formulas' },
  { id: 'Interview Prep', icon: Briefcase, desc: 'Conceptual questions' },
  { id: 'Fast Recap', icon: FastForward, desc: 'High-level summary' },
];

interface ControlsProps {
  learningMode: string;
  setLearningMode: (mode: string) => void;
}

export function Controls({ learningMode, setLearningMode }: ControlsProps) {
  return (
    <div className="glass-panel w-full rounded-2xl p-2 flex items-center justify-between overflow-x-auto custom-scrollbar">
      <div className="flex gap-2">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = learningMode === mode.id;
          
          return (
            <button
              key={mode.id}
              onClick={() => setLearningMode(mode.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 whitespace-nowrap ${
                isActive 
                  ? 'text-white' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-mode"
                  className="absolute inset-0 bg-indigo-500/20 border border-indigo-500/50 rounded-xl"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-indigo-400' : ''}`} />
              <div className="flex flex-col items-start relative z-10">
                <span className="text-xs font-semibold leading-none mb-1">{mode.id}</span>
                <span className={`text-[9px] leading-none ${isActive ? 'text-indigo-200/70' : 'text-slate-500'}`}>
                  {mode.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="hidden lg:flex items-center gap-3 px-4 border-l border-slate-700/50">
        <div className="text-right">
          <div className="text-xs font-semibold text-slate-200">Confusion Det.</div>
          <div className="text-[10px] text-emerald-400">Active - Monitoring</div>
        </div>
        <div className="w-8 h-8 rounded-full border border-emerald-500/30 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
