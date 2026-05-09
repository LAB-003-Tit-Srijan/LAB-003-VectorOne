import { Target, Activity, Zap, Brain } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';

const RADAR_DATA = [
  { subject: 'Calculus', A: 120, fullMark: 150 },
  { subject: 'Algebra', A: 98, fullMark: 150 },
  { subject: 'Stats', A: 86, fullMark: 150 },
  { subject: 'Logic', A: 99, fullMark: 150 },
  { subject: 'Code', A: 85, fullMark: 150 },
  { subject: 'Theory', A: 65, fullMark: 150 },
];

export function LearningInsights() {
  return (
    <div className="glass-panel w-full h-full rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-2 text-slate-300 pb-2 border-b border-slate-700/50">
        <Activity className="w-4 h-4 text-cyan-400" />
        <h3 className="font-semibold text-sm">Learning Insights</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-medium uppercase tracking-wider">Confusion</span>
          </div>
          <div className="text-xl font-bold text-slate-100">Low</div>
          <div className="text-[10px] text-slate-500">Pace is optimal</div>
        </div>
        
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <Target className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-xs font-medium uppercase tracking-wider">Weak Topic</span>
          </div>
          <div className="text-sm font-bold text-slate-100 truncate">Chain Rule App</div>
          <div className="text-[10px] text-indigo-400 cursor-pointer hover:underline">Review suggested</div>
        </div>
      </div>

      <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700/50 p-2 min-h-[160px] flex flex-col">
        <div className="flex items-center gap-1.5 text-slate-400 mb-2 px-2 pt-1">
          <Brain className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-medium uppercase tracking-wider">Knowledge Map</span>
        </div>
        <div className="flex-1 w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={RADAR_DATA}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Radar name="Student" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
