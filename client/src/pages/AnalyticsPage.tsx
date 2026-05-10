import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { 
  TrendingUp, Award, Target, BookOpen, Flame, 
  Activity, AlertTriangle, CheckCircle, Loader2
} from 'lucide-react';
import { LearningInsights } from '../components/LearningInsights';
import { WeakTopicInsights } from '../components/WeakTopicInsights';
import { useLMS } from '../context/LMSContext';
import { useAuth } from '../context/AuthContext';

// --- Types ---

interface GlobalAnalytics {
  totalLecturesAnalyzed: number;
  currentStreak: number;
  longestStreak: number;
  quizAccuracy: number;
  revisionCount: number;
  weakConcepts: { topic: string; count: number }[];
  consistencyData: { date: string; actions: number }[];
}

// --- Components ---

const StatCard = ({ title, value, icon: Icon, color, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="p-5 rounded-2xl border bg-[#1a1b23]/50 backdrop-blur-xl flex items-center gap-4 group hover:border-indigo-500/50 transition-all duration-300"
    style={{ borderColor: 'var(--surface-border)' }}
  >
    <div className={`p-3 rounded-xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
      <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
    </div>
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-bold text-white mt-0.5">{value}</h3>
    </div>
  </motion.div>
);

export function AnalyticsPage() {
  const { insights, learningDataLoading, learningDataError, videoId } = useLMS();
  const { authFetch } = useAuth();
  
  const [globalData, setGlobalData] = useState<GlobalAnalytics | null>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchGlobalStats = useCallback(async () => {
    try {
      const [statsRes, recsRes] = await Promise.all([
        authFetch('/api/analytics/global'),
        authFetch('/api/analytics/recommendations')
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setGlobalData(data);
      }
      
      if (recsRes.ok) {
        const data = await recsRes.json();
        setRecommendations(data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchGlobalStats();
  }, [fetchGlobalStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
            <Activity className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-widest">Performance Dashboard</span>
          </div>
          <h1 className="text-4xl font-extrabold font-['Manrope'] tracking-tight text-white">
            Learning Analytics
          </h1>
          <p className="text-slate-400 max-w-xl">
            Real-time visualization of your cognitive load, retention patterns, and overall academic consistency.
          </p>
        </div>
        
        {globalData && (
          <div className="bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl flex items-center gap-3">
            <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
            <div className="text-sm">
              <span className="text-slate-400">Study Streak:</span>
              <span className="text-white font-bold ml-1">{globalData.currentStreak} Days</span>
            </div>
          </div>
        )}
      </header>

      {/* High-level Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Lectures Analyzed" 
          value={globalData?.totalLecturesAnalyzed ?? 0} 
          icon={BookOpen} 
          color="bg-blue-500" 
          delay={0.1}
        />
        <StatCard 
          title="Quiz Accuracy" 
          value={`${globalData?.quizAccuracy ?? 0}%`} 
          icon={Target} 
          color="bg-emerald-500" 
          delay={0.2}
        />
        <StatCard 
          title="Longest Streak" 
          value={`${globalData?.longestStreak ?? 0} Days`} 
          icon={Award} 
          color="bg-orange-500" 
          delay={0.3}
        />
        <StatCard 
          title="Revision Count" 
          value={globalData?.revisionCount ?? 0} 
          icon={TrendingUp} 
          color="bg-purple-500" 
          delay={0.4}
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Consistency Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 p-6 rounded-3xl border bg-[#1a1b23]/30 backdrop-blur-sm"
          style={{ borderColor: 'var(--surface-border)' }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-white">Learning Consistency</h3>
              <p className="text-xs text-slate-400">Daily study actions over the last 14 days</p>
            </div>
            <Activity className="w-5 h-5 text-slate-500" />
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={globalData?.consistencyData ?? []}>
                <defs>
                  <linearGradient id="colorActions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2d2e3b" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1b23', 
                    borderColor: '#2d2e3b',
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                  itemStyle={{ color: '#6366f1' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="actions" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorActions)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Weak Concepts / Struggle Areas */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="p-6 rounded-3xl border bg-[#1a1b23]/30 backdrop-blur-sm"
          style={{ borderColor: 'var(--surface-border)' }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-white">Struggle Areas</h3>
              <p className="text-xs text-slate-400">Concepts requiring more attention</p>
            </div>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>

          {globalData && globalData.weakConcepts.length > 0 ? (
            <div className="space-y-6">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={globalData.weakConcepts}>
                    <XAxis dataKey="topic" hide />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ 
                        backgroundColor: '#1a1b23', 
                        borderColor: '#2d2e3b',
                        borderRadius: '12px'
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {globalData.weakConcepts.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#f43f5e' : '#fbbf24'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-3">
                {globalData.weakConcepts.map((concept, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-sm font-medium text-slate-300">{concept.topic}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-12 rounded-full bg-slate-700 overflow-hidden">
                        <div 
                          className="h-full bg-amber-500" 
                          style={{ width: `${Math.min(100, (concept.count / (globalData.weakConcepts[0].count || 1)) * 100)}%` }} 
                        />
                      </div>
                      <span className="text-xs font-bold text-amber-400">{concept.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-emerald-500/20" />
              <p className="text-sm text-slate-500">No weak concepts identified yet.<br/>Complete quizzes to see data.</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Weak Topic Insights & Recommendations */}
      {recommendations && (
        <WeakTopicInsights 
          insights={recommendations.insights} 
          masteryScore={recommendations.masteryScore} 
        />
      )}

      {/* Per-Session Detail Section */}
      <div className="pt-10 border-t border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white">Active Session Insights</h2>
            <p className="text-sm text-slate-400">Detailed analytics for your currently loaded lecture.</p>
          </div>
          {!videoId && (
            <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700">
              No Active Video
            </span>
          )}
        </div>

        {!videoId ? (
          <div className="p-20 rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-center">
            <div className="p-4 rounded-full bg-indigo-500/10 mb-4">
              <BookOpen className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Select a Lecture to Begin</h3>
            <p className="text-sm text-slate-500 max-w-xs">
              Go to the dashboard or learn page to load a video and see granular session analytics here.
            </p>
          </div>
        ) : (
          <div className="min-h-[560px]">
            <LearningInsights insights={insights} isLoading={learningDataLoading} error={learningDataError} />
          </div>
        )}
      </div>
    </div>
  );
}
