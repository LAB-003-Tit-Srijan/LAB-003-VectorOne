import ReactPlayer from 'react-player';
import { Play } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  onProgress: (state: { playedSeconds: number }) => void;
  playerRef: React.RefObject<any>;
}

export function VideoPlayer({ url, onProgress, playerRef }: VideoPlayerProps) {
  const Player = ReactPlayer as any;

  return (
    <div className="glass-panel w-full h-full rounded-2xl overflow-hidden relative bg-slate-900 flex items-center justify-center">

      {/* Placeholder — shown when no video is loaded */}
      {!url && (
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
            <Play className="w-6 h-6 text-slate-500 ml-1" />
          </div>
          <p className="text-slate-400 text-sm font-medium">Paste a YouTube URL to begin</p>
        </div>
      )}

      {/* Player — absolutely fills the card once a URL is set */}
      {url && (
        <div className="absolute inset-0">
          <Player
            ref={playerRef}
            url={url}
            width="100%"
            height="100%"
            controls
            onProgress={onProgress}
            progressInterval={500}
            config={{
              youtube: {
                playerVars: { modestbranding: 1, rel: 0 },
              },
            }}
          />
        </div>
      )}
    </div>
  );
}

