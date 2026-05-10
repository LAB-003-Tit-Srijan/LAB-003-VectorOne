import { motion } from 'framer-motion';
import { 
  AlertTriangle, ArrowRight, BookOpen, 
  Lightbulb, CheckCircle, Zap 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Insight {
  topic: string;
  struggleCount: number;
  severity: 'Critical' | 'Moderate' | 'Low';
  recommendation: string;
  actionType: string;
  accuracy: number;
}

interface WeakTopicInsightsProps {
  insights: Insight[];
  masteryScore: number;
}

export function WeakTopicInsights({ insights, masteryScore }: WeakTopicInsightsProps) {
  const navigate = useNavigate();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'Moderate': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  const getIcon = (actionType: string) => {
    switch (actionType) {
      case 'notes': return <BookOpen className="w-4 h-4" />;
      case 'flashcards': return <Zap className="w-4 h-4" />;
      case 'quiz': return <CheckCircle className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-indigo-400" />
            Learning Insights
          </h2>
          <p className="text-sm text-slate-400 mt-1">AI-driven analysis of your academic performance</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Mastery Score</p>
          <p className="text-3xl font-black text-indigo-400">{masteryScore}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {insights.map((insight, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-6 rounded-3xl border bg-[#1a1b23]/40 backdrop-blur-md flex flex-col justify-between group hover:border-indigo-500/40 transition-all duration-300"
            style={{ borderColor: 'var(--surface-border)' }}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-tighter ${getSeverityColor(insight.severity)}`}>
                  {insight.severity} Priority
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Accuracy</p>
                  <p className="text-lg font-bold text-white">{insight.accuracy}%</p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">{insight.topic}</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed italic">
                  "{insight.recommendation}"
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/revision')}
              className="mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold hover:bg-indigo-500 hover:text-white transition-all duration-300 group/btn"
            >
              {getIcon(insight.actionType)}
              Review Topic
              <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        ))}

        {insights.length === 0 && (
          <div className="col-span-full p-12 rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-center opacity-60">
            <CheckCircle className="w-12 h-12 text-emerald-500 mb-4" />
            <h3 className="text-lg font-bold text-white">All Clear!</h3>
            <p className="text-sm text-slate-400 max-w-sm mt-1">
              You haven't hit any significant roadblocks yet. Keep up the great work and complete more quizzes to see detailed insights.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
