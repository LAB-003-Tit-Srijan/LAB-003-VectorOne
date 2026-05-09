import { useState, useEffect, useRef } from 'react';
import { Send, Bot, Sparkles, User } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_CHAT = [
  { id: 1, role: 'ai', text: 'Hi! I noticed you are learning about Backpropagation. Do you want me to summarize how the chain rule applies here?' },
  { id: 2, role: 'user', text: 'Yes please. I\'m a bit confused about the partial derivatives.' },
  { id: 3, role: 'ai', text: 'No problem! The chain rule helps us calculate how a small change in a weight affects the final error. Think of it like a chain reaction: Weight -> Activation -> Output -> Error.' },
];

export function AIChat() {
  const [messages, setMessages] = useState(MOCK_CHAT);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const newUserMsg = { id: Date.now(), role: 'user', text: input };
    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ai',
        text: 'That\'s a great question! Let me break that down for you based on what we just covered in the video...'
      }]);
    }, 2000);
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
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
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
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === 'user' 
                ? 'bg-slate-700/80 text-white rounded-tr-sm' 
                : 'bg-indigo-500/10 border border-indigo-500/20 text-slate-100 rounded-tl-sm'
            }`}>
              {msg.text}
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
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-900/80 border-t border-slate-700/50">
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about the video..." 
            className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white placeholder-slate-500"
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
