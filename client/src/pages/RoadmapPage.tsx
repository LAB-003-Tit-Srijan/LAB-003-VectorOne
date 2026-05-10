import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Map, Sparkles, CheckCircle2, Circle, Lock, 
  ChevronRight, ArrowRight, Loader2, RefreshCw 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLMS } from '../context/LMSContext';

interface RoadmapNode {
  _id: string;
  title: string;
  description: string;
  type: 'concept' | 'practice' | 'advanced';
  status: 'locked' | 'available' | 'completed';
  order: number;
}

interface RoadmapData {
  nodes: RoadmapNode[];
  totalNodes: number;
  completedNodes: number;
}

export function RoadmapPage() {
  const { authFetch } = useAuth();
  const { videoId } = useLMS();
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchRoadmap = useCallback(async () => {
    try {
      const res = await authFetch('/api/roadmap');
      if (res.ok) {
        const data = await res.json();
        setRoadmap(data);
      }
    } catch (err) {
      console.error('Failed to fetch roadmap:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const generateRoadmap = async () => {
    setGenerating(true);
    try {
      const res = await authFetch('/api/roadmap/generate', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      });
      if (res.ok) {
        const data = await res.json();
        setRoadmap(data);
      }
    } catch (err) {
      alert('Could not generate roadmap. Try studying more topics first.');
    } finally {
      setGenerating(false);
    }
  };

  const completeNode = async (nodeId: string) => {
    setUpdating(nodeId);
    try {
      const res = await authFetch(`/api/roadmap/node/${nodeId}`, { method: 'PATCH' });
      if (res.ok) {
        const data = await res.json();
        setRoadmap(data);
      }
    } catch (err) {
      console.error('Failed to update node:', err);
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const progress = roadmap ? Math.round((roadmap.completedNodes / roadmap.totalNodes) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-widest">AI Journey Planner</span>
          </div>
          <h1 className="text-4xl font-extrabold font-['Manrope'] tracking-tight text-white">
            Your Learning Roadmap
          </h1>
          <p className="text-slate-400 max-w-xl">
            A dynamic progression path synthesized from your lecture interactions and quiz performance.
          </p>
        </div>

        <button 
          onClick={generateRoadmap}
          disabled={generating}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 transition-all disabled:opacity-50"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Regenerate Path
        </button>
      </header>

      {/* Progress Bar */}
      <div className="bg-[#1a1b23]/50 border border-indigo-500/10 p-6 rounded-3xl backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold text-slate-300">Overall Completion</span>
          <span className="text-sm font-bold text-indigo-400">{progress}%</span>
        </div>
        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]" 
          />
        </div>
      </div>

      {!roadmap || roadmap.nodes.length === 0 ? (
        <div className="p-20 rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-center">
          <Map className="w-12 h-12 text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Roadmap Generated</h3>
          <p className="text-sm text-slate-500 max-w-sm mb-6">
            Study some lectures and take a few quizzes to help the AI understand your current level.
          </p>
          <button 
            onClick={generateRoadmap}
            className="px-6 py-3 rounded-xl premium-button text-white font-bold text-sm"
          >
            Generate My First Roadmap
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line connector */}
          <div className="absolute left-[27px] top-10 bottom-10 w-0.5 bg-gradient-to-b from-indigo-500/50 via-slate-800 to-slate-800/20" />

          <div className="space-y-8">
            {roadmap.nodes.sort((a, b) => a.order - b.order).map((node, i) => {
              const isLocked = node.status === 'locked';
              const isDone = node.status === 'completed';
              
              return (
                <motion.div 
                  key={node._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative flex gap-8 group`}
                >
                  {/* Timeline Node Icon */}
                  <div className="relative z-10 shrink-0">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
                      isDone ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' :
                      isLocked ? 'bg-slate-900 border-slate-800 text-slate-600' :
                      'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                    }`}>
                      {isDone ? <CheckCircle2 className="w-7 h-7" /> : 
                       isLocked ? <Lock className="w-6 h-6" /> : 
                       <Circle className="w-6 h-6 fill-current opacity-20" />}
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className={`flex-1 p-6 rounded-3xl border transition-all duration-300 ${
                    isLocked ? 'bg-[#1a1b23]/20 border-slate-900/50 grayscale' :
                    isDone ? 'bg-[#1a1b23]/40 border-emerald-500/10' :
                    'bg-[#1a1b23]/60 border-indigo-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:border-indigo-500/50'
                  }`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${
                            node.type === 'advanced' ? 'text-purple-400' :
                            node.type === 'practice' ? 'text-amber-400' :
                            'text-indigo-400'
                          }`}>
                            {node.type}
                          </span>
                          {isDone && <span className="text-[10px] font-bold text-emerald-400 uppercase">Completed</span>}
                        </div>
                        <h3 className={`text-xl font-bold ${isLocked ? 'text-slate-500' : 'text-white'}`}>
                          {node.title}
                        </h3>
                        <p className={`text-sm leading-relaxed mt-2 ${isLocked ? 'text-slate-600' : 'text-slate-400'}`}>
                          {node.description}
                        </p>
                      </div>

                      {!isDone && !isLocked && (
                        <button
                          onClick={() => completeNode(node._id)}
                          disabled={updating === node._id}
                          className="shrink-0 p-3 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20"
                        >
                          {updating === node._id ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <footer className="pt-10 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/10">
            <Map className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-white font-bold">Dynamic Pathing</h4>
            <p className="text-xs text-slate-500">Your roadmap regenerates as you master new topics.</p>
          </div>
        </div>
        
        <button 
          onClick={() => window.location.href = '/learn'}
          className="flex items-center gap-2 text-indigo-400 font-bold hover:text-indigo-300 transition-colors group"
        >
          Return to Learning Hub
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </footer>
    </div>
  );
}
