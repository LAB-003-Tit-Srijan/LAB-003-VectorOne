import { motion } from 'framer-motion';
import { 
  User, GraduationCap, Briefcase, 
  Zap, Check, HelpCircle 
} from 'lucide-react';

export type LearningMode = 'beginner' | 'exam-prep' | 'interview' | 'fast-recap';

interface ModeOption {
  id: LearningMode;
  label: string;
  icon: any;
  description: string;
  color: string;
}

const MODES: ModeOption[] = [
  { 
    id: 'beginner', 
    label: 'Beginner', 
    icon: User, 
    description: 'Simple analogies & step-by-step logic.', 
    color: 'text-blue-400 bg-blue-500/10' 
  },
  { 
    id: 'exam-prep', 
    label: 'Exam Prep', 
    icon: GraduationCap, 
    description: 'High-yield notes, formulas & concepts.', 
    color: 'text-emerald-400 bg-emerald-500/10' 
  },
  { 
    id: 'interview', 
    label: 'Interview', 
    icon: Briefcase, 
    description: 'Deep mastery & practical applications.', 
    color: 'text-purple-400 bg-purple-500/10' 
  },
  { 
    id: 'fast-recap', 
    label: 'Fast Recap', 
    icon: Zap, 
    description: 'Ultra-concise bullet points only.', 
    color: 'text-amber-400 bg-amber-500/10' 
  }
];

interface ModeSelectorProps {
  activeMode: LearningMode;
  onModeChange: (mode: LearningMode) => void;
}

export function ModeSelector({ activeMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10">
      {MODES.map((mode) => {
        const isActive = activeMode === mode.id;
        const Icon = mode.icon;
        
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
              isActive 
                ? 'text-white bg-indigo-500 shadow-lg shadow-indigo-500/20' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : mode.color.split(' ')[0]}`} />
            {mode.label}
            {isActive && (
              <motion.div
                layoutId="active-check"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0f1115] flex items-center justify-center"
              >
                <Check className="w-2 h-2 text-white" />
              </motion.div>
            )}
            
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded-lg bg-[#1a1b23] border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-[10px] text-slate-400 leading-tight">
              {mode.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function ActiveModeBadge({ mode }: { mode: LearningMode }) {
  const config = MODES.find(m => m.id === mode) || MODES[0];
  const Icon = config.icon;
  
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${config.color} border-current/20`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </div>
  );
}
