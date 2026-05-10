import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles, Loader2, BookOpen, Clock, List, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { aiService } from '../services/ai.service';
import type { TranscriptItem } from './Transcript';

type SummaryType = 'full' | 'last5mins' | 'topic' | 'exam';

interface SmartSummariesProps {
  videoId: string;
  transcriptData: TranscriptItem[];
  currentTime: number;
}

export function SmartSummaries({ videoId, transcriptData, currentTime }: SmartSummariesProps) {
  const { authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState<SummaryType>('full');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, Array<{ title: string; content: string }>>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const currentTimeRef = useRef(currentTime);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const loadingRef = useRef(false);

  useEffect(() => {
    if (summaries[activeTab] || transcriptData.length === 0 || loadingRef.current) return;

    let isMounted = true;
    const fetchSummary = async () => {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      let textToAnalyze = '';
      if (activeTab === 'last5mins') {
        const currentT = currentTimeRef.current;
        const fiveMinsAgo = Math.max(0, currentT - 300);
        // Include up to current time (plus small buffer)
        const recentItems = transcriptData.filter(item => item.offset >= fiveMinsAgo && item.offset <= currentT + 30);
        textToAnalyze = recentItems.map(item => item.text).join(' ');
        if (!textToAnalyze.trim()) {
          textToAnalyze = transcriptData.map(item => item.text).join(' ').slice(-3000);
        }
      } else {
        textToAnalyze = transcriptData.map(item => item.text).join(' ');
      }

      try {
        const result = await aiService.getSmartSummary(authFetch, {
          videoId,
          text: textToAnalyze,
          type: activeTab
        });
        if (isMounted) {
          setSummaries(prev => ({ ...prev, [activeTab]: result.sections }));
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to generate summary');
        }
      } finally {
        loadingRef.current = false;
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchSummary();

    return () => { isMounted = false; };
  }, [activeTab, transcriptData, summaries, authFetch, videoId]);

  const tabs = [
    { id: 'full', label: 'Full', icon: BookOpen },
    { id: 'last5mins', label: 'Last 5m', icon: Clock },
    { id: 'topic', label: 'Topics', icon: List },
    { id: 'exam', label: 'Exam', icon: GraduationCap },
  ];

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#1a1c29] to-[#0f111a] border border-indigo-500/10 relative mt-5">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500"></div>
      
      <div className="p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-fuchsia-400" />
          <h2 className="text-lg font-bold text-white tracking-wide">Smart Summaries</h2>
        </div>

        {/* Custom Tabs */}
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SummaryType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all duration-300 font-medium text-sm ${
                  isActive 
                  ? 'bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.1)]' 
                  : 'bg-white/5 text-slate-400 border border-transparent hover:bg-white/10'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-fuchsia-400' : 'text-slate-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="min-h-[200px] relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1c29]/50 rounded-xl z-10 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 text-fuchsia-500 animate-spin mb-3" />
              <p className="text-sm text-fuchsia-200 font-medium">Analyzing content...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && transcriptData.length === 0 && (
            <div className="flex items-center justify-center h-[200px] text-slate-500 text-sm">
              Load a lecture to see smart summaries.
            </div>
          )}

          {!loading && !error && summaries[activeTab] && (
            <div className="flex flex-col gap-3">
              <AnimatePresence>
                {summaries[activeTab].map((section, idx) => {
                  const sectionId = `${activeTab}-${idx}`;
                  const isExpanded = expandedSections[sectionId] ?? true; // default expanded

                  return (
                    <motion.div
                      key={sectionId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white/5 rounded-xl border border-white/5 overflow-hidden hover:border-white/10 transition-colors"
                    >
                      <button
                        onClick={() => toggleSection(sectionId)}
                        className="w-full px-4 py-3 flex items-center justify-between text-left focus:outline-none"
                      >
                        <h3 className="font-semibold text-slate-200 text-sm tracking-wide">{section.title}</h3>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        </motion.div>
                      </button>
                      
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-3">
                              {section.content}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
