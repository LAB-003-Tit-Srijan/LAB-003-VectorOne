import { useState } from 'react';
import { VideoPlayer } from './components/VideoPlayer';
import { AIChat } from './components/AIChat';
import { Transcript } from './components/Transcript';
import { LearningInsights } from './components/LearningInsights';
import { Controls } from './components/Controls';
import { GraduationCap, Sparkles } from 'lucide-react';


function App() {
  const [learningMode, setLearningMode] = useState('Beginner');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 overflow-x-hidden relative selection:bg-indigo-500/30">
      {/* Background glowing orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />
      
      {/* Navbar */}
      <header className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Learn<span className="text-gradient">AI</span></h1>
            <p className="text-xs text-slate-400 font-medium">Adaptive Companion</p>
          </div>
        </div>
        
        <div className="flex-1 max-w-xl mx-8 hidden sm:block">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Paste YouTube URL here..." 
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-full py-2.5 px-5 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all group-hover:border-slate-600"
              defaultValue="https://youtube.com/watch?v=mock-video-id"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><polygon points="10 15 15 12 10 9 10 15"/></svg>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-indigo-400">AI Active</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-8 h-8 rounded-full" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 lg:h-[calc(100vh-80px)] min-h-[calc(100vh-80px)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-full max-w-[1600px] mx-auto">
          
          {/* Left Column - Video & Transcript */}
          <div className="lg:col-span-8 flex flex-col gap-6 lg:h-full">
            <div className="flex-none lg:h-[50vh] h-[400px] min-h-[300px]">
              <VideoPlayer />
            </div>
            
            <div className="flex-none">
              <Controls learningMode={learningMode} setLearningMode={setLearningMode} />
            </div>

            <div className="flex-1 min-h-[300px] lg:min-h-0">
              <Transcript />
            </div>
          </div>

          {/* Right Column - Chat & Insights */}
          <div className="lg:col-span-4 flex flex-col gap-6 lg:h-full">
            <div className="flex-1 min-h-[500px] lg:min-h-0">
              <AIChat />
            </div>
            
            <div className="flex-none h-[400px] lg:h-[40%] lg:min-h-[300px]">
              <LearningInsights />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;
