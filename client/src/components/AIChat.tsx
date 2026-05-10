import { useState, useEffect, useRef, useCallback } from 'react';
import { captureClientException } from '../lib/monitoring';
import { useAuth } from '../context/AuthContext';
import { Send, Bot, Sparkles, User, Clock3, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TranscriptItem } from './Transcript';
import { aiService, type SourceRef } from '../services/ai.service';
import { TimestampChip, formatTime } from './TimestampChip';
import { ModeSelector, ActiveModeBadge, type LearningMode } from './ModeSelector';
import { useLMS } from '../context/LMSContext';

const TIMESTAMP_REGEX = /(\b\d{1,2}:\d{2}(?::\d{2})?\b)/;

function formatMessageWithTimestamps(text: string) {
  if (!text) return null;
  const parts = text.split(TIMESTAMP_REGEX);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          return <TimestampChip key={i} timeString={part} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

interface ChatMessage {
  id: number;
  role: 'user' | 'ai';
  text: string;
  sources?: SourceRef[];
}

interface AIChatProps {
  videoId: string;
  sessionId: string;
  transcriptData: TranscriptItem[];
  onSeek: (time: number) => void;
  pendingQuestion: { token: number; text: string } | null;
  onConsumePendingQuestion: () => void;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 1,
  role: 'ai',
  text: 'Ask me anything about this lecture. I only answer from the loaded transcript and will cite timestamps.',
};

export function AIChat({
  videoId,
  sessionId,
  transcriptData,
  onSeek,
  pendingQuestion,
  onConsumePendingQuestion,
}: AIChatProps) {
  const { authFetch } = useAuth();
  const { learningMode, setLearningMode } = useLMS();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastContextRef = useRef<string>('');
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    const contextKey = `${videoId}:${transcriptData.length}`;
    if (contextKey === lastContextRef.current) return;
    lastContextRef.current = contextKey;

    setMessages([INITIAL_MESSAGE]);
    setError(null);
  }, [videoId, transcriptData.length]);

  const submitQuestion = useCallback(
    async (questionRaw: string) => {
      const question = questionRaw.trim();
      if (!question || isTyping) return;

      if (!videoId || transcriptData.length === 0) {
        setError('Load a lecture transcript first, then ask your question.');
        return;
      }

      setError(null);
      const newUserMsg: ChatMessage = { id: Date.now(), role: 'user', text: question };
      setMessages((prev) => [...prev, newUserMsg]);
      setIsTyping(true);

      const assistantId = Date.now() + 1;
      setMessages((prev) => [...prev, { id: assistantId, role: 'ai', text: '' }]);

      let fullText = '';
      
      await aiService.askQuestionStream(
        authFetch,
        {
          videoId,
          sessionId,
          question,
          transcript: transcriptData,
          mode: learningMode
        },
        (chunk) => {
          fullText += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, text: fullText } : msg
            )
          );
        },
        (sources) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, sources } : msg
            )
          );
          setIsTyping(false);
        },
        (errMessage) => {
          captureClientException(new Error(errMessage), { scope: 'AIChat', videoId, route: '/api/ask' });
          setError(errMessage);
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 2,
              role: 'ai',
              text: 'I could not answer that right now. Please try again in a moment.',
            },
          ]);
        }
      );
    },
    [videoId, sessionId, transcriptData, isTyping, authFetch, learningMode]
  );

  useEffect(() => {
    if (!pendingQuestion || isTyping) return;
    const text = pendingQuestion.text;
    onConsumePendingQuestion();
    void submitQuestion(text);
  }, [pendingQuestion, isTyping, onConsumePendingQuestion, submitQuestion]);

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    if (!videoId || transcriptData.length === 0) {
      setError('Load a lecture transcript first, then ask your question.');
      return;
    }
    const q = input.trim();
    setInput('');
    void submitQuestion(q);
  };

  return (
    <div className="glass-panel w-full h-full rounded-3xl flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Learning Assistant</h3>
            <p className="text-[11px] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
              <span className="opacity-20">|</span>
              <ActiveModeBadge mode={learningMode as LearningMode} />
            </p>
          </div>
        </div>
        <button className="transition-colors" style={{ color: 'var(--text-muted)' }}>
          <Sparkles className="w-5 h-5" />
        </button>
      </div>

      {/* Mode Selector */}
      <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}>
        <ModeSelector 
          activeMode={learningMode as LearningMode} 
          onModeChange={(m) => setLearningMode(m)} 
        />
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
        {messages.map((msg, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: Math.min(idx * 0.025, 0.12), duration: 0.24 }}
            key={msg.id} 
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              msg.role === 'user' ? 'bg-slate-700' : 'bg-gradient-to-br from-indigo-500 to-cyan-500'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            <motion.div
              whileHover={{ y: -1 }}
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-slate-700 to-slate-800 text-white rounded-tr-sm border border-slate-600/50' 
                : 'bg-indigo-500/10 border border-indigo-500/20 text-slate-100 rounded-tl-sm'
            }`}
            >
              {msg.role === 'user' ? msg.text : formatMessageWithTimestamps(msg.text)}
              {msg.role === 'ai' && (msg.sources?.length ?? 0) > 0 && (
                <div className="mt-3 pt-2 border-t border-indigo-500/20 flex flex-wrap gap-2">
                  {msg.sources?.slice(0, 4).map((source) => (
                    <TimestampChip key={`${msg.id}-${source.chunkId}`} seconds={source.start} />
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        ))}
        
        {isTyping && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {isTyping && messages.length <= 2 && (
        <div className="mx-4 mb-2 grid gap-2">
          <div className="h-3 rounded-full bg-indigo-500/20 animate-pulse" />
          <div className="h-3 rounded-full bg-indigo-500/15 animate-pulse w-4/5" />
        </div>
      )}

      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t" style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}>
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about the video..." 
            disabled={isTyping}
            className="w-full border rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none transition-all placeholder-slate-500"
            style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)', color: 'var(--text-main)' }}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
