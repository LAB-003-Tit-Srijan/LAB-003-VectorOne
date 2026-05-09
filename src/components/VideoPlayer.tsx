import { Play, Maximize, Volume2, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export function VideoPlayer() {
  return (
    <div className="glass-panel w-full h-full rounded-2xl overflow-hidden relative group">
      {/* Video Placeholder Image */}
      <div className="absolute inset-0 bg-slate-800">
        <img 
          src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2000&auto=format&fit=crop" 
          alt="Video Thumbnail" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
      </div>

      {/* Play Button Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:bg-slate-900/20 transition-all duration-300">
        <motion.div 
          whileHover={{ scale: 1.1 }}
          className="w-16 h-16 rounded-full bg-indigo-500/90 backdrop-blur-sm flex items-center justify-center shadow-xl shadow-indigo-500/20 cursor-pointer pointer-events-auto"
        >
          <Play className="w-8 h-8 text-white ml-1" />
        </motion.div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
        <div className="flex flex-col gap-2">
          {/* Progress Bar */}
          <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden cursor-pointer">
            <div className="h-full bg-indigo-500 w-[45%]" />
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-between text-slate-300 pt-2">
            <div className="flex items-center gap-4">
              <Play className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
              <Volume2 className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
              <span className="text-xs font-medium">12:34 / 28:05</span>
            </div>
            
            <div className="flex items-center gap-4">
              <Settings className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
              <Maximize className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Top badges */}
      <div className="absolute top-4 left-4 flex gap-2">
        <span className="px-2 py-1 rounded bg-slate-900/80 backdrop-blur-md text-[10px] font-bold tracking-wider uppercase text-white">
          Chapter 3
        </span>
        <span className="px-2 py-1 rounded bg-indigo-500/80 backdrop-blur-md text-[10px] font-bold tracking-wider uppercase text-white">
          Neural Networks
        </span>
      </div>
    </div>
  );
}
