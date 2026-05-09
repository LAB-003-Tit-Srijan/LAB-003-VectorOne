import { motion } from 'framer-motion';
import { STUDY_MODES } from '../data/studyModes';

interface ControlsProps {
  learningMode: string;
  setLearningMode: (mode: string) => void;
}

export function Controls({ learningMode, setLearningMode }: ControlsProps) {
  return (
    <div className="glass-panel w-full rounded-3xl p-2.5 flex items-center justify-between overflow-x-auto custom-scrollbar">
      <div className="flex gap-2">
        {STUDY_MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = learningMode === mode.id;
          
          return (
            <button
              key={mode.id}
              onClick={() => setLearningMode(mode.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 whitespace-nowrap ${
                isActive 
                  ? 'text-white' 
                  : 'hover:bg-white/5'
              }`}
              style={{ color: isActive ? '#fff' : 'var(--text-muted)' }}
            >
              {isActive && (
                <motion.div
                  layoutId="active-mode"
                  className="absolute inset-0 rounded-2xl"
                  style={{ background: 'linear-gradient(105deg, rgba(99,102,241,0.4), rgba(6,182,212,0.35))' }}
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
      
      <div className="hidden lg:flex items-center gap-3 px-4 border-l" style={{ borderColor: 'var(--surface-border)' }}>
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
