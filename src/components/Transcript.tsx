import { FileText, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_TRANSCRIPT = [
  { time: '12:30', text: 'So when we look at the loss landscape, we see these deep ravines.', active: false },
  { time: '12:34', text: 'This is where backpropagation comes in. By calculating the partial derivative...', active: true },
  { time: '12:42', text: '...we can determine the direction of steepest descent.', active: false },
  { time: '12:50', text: 'And if we update our weights in the opposite direction, we minimize the error.', active: false },
  { time: '13:05', text: 'Let\'s write down the chain rule formula for this specific layer.', active: false },
];

export function Transcript() {
  return (
    <div className="glass-panel w-full h-full rounded-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-900/50">
        <div className="flex items-center gap-2 text-slate-300">
          <FileText className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Interactive Transcript</h3>
        </div>
        <div className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
          Auto-scroll enabled
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
        {MOCK_TRANSCRIPT.map((item, idx) => (
          <motion.div 
            whileHover={{ x: 4 }}
            key={idx} 
            className={`flex gap-4 p-3 rounded-xl cursor-pointer transition-colors duration-200 ${
              item.active 
                ? 'bg-indigo-500/10 border border-indigo-500/20' 
                : 'hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <div className={`flex items-center gap-1.5 text-xs font-mono font-medium mt-0.5 ${
              item.active ? 'text-indigo-400' : 'text-slate-500'
            }`}>
              {item.active && <Clock className="w-3 h-3" />}
              {item.time}
            </div>
            <div className={`text-sm leading-relaxed ${
              item.active ? 'text-slate-100 font-medium' : 'text-slate-400'
            }`}>
              {item.text}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
