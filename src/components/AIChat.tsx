import { useState, useEffect, useRef } from 'react';
import { Send, Bot, Sparkles, User, Clock3, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { TranscriptItem } from './Transcript';

interface SourceRef {
  chunkId: string;
  start: number;
  end: number;
  score: number;
}

interface ChatMessage {
  id: number;
  role: 'user' | 'ai';
  text: string;
  sources?: SourceRef[];
}

interface AskResponse {
  answer: string;
  sources: SourceRef[];
}

interface AIChatProps {
  videoId: string;
  sessionId: string;
  transcriptData: TranscriptItem[];
  onSeek: (time: number) => void;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 1,
  role: 'ai',
  text: 'Ask me anything about this lecture. I only answer from the loaded transcript and will cite timestamps.',
};

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

export function AIChat({ videoId, sessionId, transcriptData, onSeek }: AIChatProps) {
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

  const streamAssistantMessage = (messageId: number, fullText: string, sources: SourceRef[]) => {
    let cursor = 0;
    const timer = window.setInterval(() => {
      cursor += Math.max(1, Math.ceil(fullText.length / 90));
      const partial = fullText.slice(0, cursor);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, text: partial, sources: cursor >= fullText.length ? sources : [] } : msg
        )
      );

      if (cursor >= fullText.length) {
        window.clearInterval(timer);
        setIsTyping(false);
      }
    }, 24);
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    if (!videoId || transcriptData.length === 0) {
      setError('Load a lecture transcript first, then ask your question.');
      return;
    }

    setError(null);
    const question = input.trim();
    const newUserMsg: ChatMessage = { id: Date.now(), role: 'user', text: question };
    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          sessionId,
          question,
          transcript: transcriptData,
        }),
      });

      const data = (await res.json()) as AskResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      const assistantId = Date.now() + 1;
      setMessages((prev) => [...prev, { id: assistantId, role: 'ai', text: '' }]);
      streamAssistantMessage(assistantId, data.answer, data.sources ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get AI response.';
      setError(message);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
        id: Date.now() + 1,
        role: 'ai',
          text: 'I could not answer that right now. Please try again in a moment.',
        },
      ]);
    }
  };

  return (
    <div className="glass-panel w-full h-full rounded-2xl flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Learning Assistant</h3>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </p>
          </div>
        </div>
        <button className="text-slate-400 hover:text-white transition-colors">
          <Sparkles className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
        {messages.map((msg) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id} 
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              msg.role === 'user' ? 'bg-slate-700' : 'bg-gradient-to-br from-indigo-500 to-cyan-500'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-slate-700 to-slate-800 text-white rounded-tr-sm border border-slate-600/50' 
                : 'bg-indigo-500/10 border border-indigo-500/20 text-slate-100 rounded-tl-sm'
            }`}>
              {msg.text}
              {msg.role === 'ai' && (msg.sources?.length ?? 0) > 0 && (
                <div className="mt-3 pt-2 border-t border-indigo-500/20 flex flex-wrap gap-2">
                  {msg.sources?.slice(0, 4).map((source) => (
                    <button
                      key={`${msg.id}-${source.chunkId}`}
                      onClick={() => onSeek(source.start)}
                      className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg bg-slate-900/60 hover:bg-slate-800/70 border border-slate-700/70 text-indigo-300 transition-colors"
                      title={`Jump to ${formatTime(source.start)}`}
                    >
                      <Clock3 className="w-3 h-3" />
                      {formatTime(source.start)}
                    </button>
                  ))}
                </div>
              )}
            </div>
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

      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-slate-900/80 border-t border-slate-700/50">
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about the video..." 
            disabled={isTyping}
            className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all text-white placeholder-slate-500"
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
