import { useState, useEffect } from 'react';
import { Play, Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  onProgress: (state: { playedSeconds: number }) => void;
  playerRef: React.RefObject<any>;
}

export function VideoPlayer({ url, onProgress, playerRef }: VideoPlayerProps) {
  const [PlayerComponent, setPlayerComponent] = useState<any>(null);

  // Dynamically load react-player ONLY in the browser to bypass Vite & React 19 bugs
  useEffect(() => {
    import('react-player')
      .then((module) => {
        // Safely extract the component whether it's an ESM or CommonJS export
        setPlayerComponent(() => module.default || module);
      })
      .catch((err) => console.error("Failed to load ReactPlayer", err));
  }, []);

  return (
    <div className="glass-panel w-full h-full rounded-2xl overflow-hidden relative bg-slate-900 flex items-center justify-center">

      {/* State 1: No URL provided yet */}
      {!url && (
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shadow-lg">
            <Play className="w-6 h-6 text-slate-500 ml-1" />
          </div>
          <p className="text-slate-400 text-sm font-medium">Paste a YouTube URL to begin</p>
        </div>
      )}

      {/* State 2: URL exists, but Player is still downloading */}
      {url && !PlayerComponent && (
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading video engine...</p>
        </div>
      )}

      {/* State 3: URL exists and Player is ready */}
      {url && PlayerComponent && (
        <div className="absolute inset-0">
          <PlayerComponent
            ref={playerRef}
            url={url}
            width="100%"
            height="100%"
            controls={true}
            playing={true} // Auto-play the video
            onProgress={onProgress}
            progressInterval={500}
            config={{
              youtube: {
                playerVars: { modestbranding: 1, rel: 0, origin: window.location.origin },
              },
            }}
          />
        </div>
      )}
    </div>
  );
}