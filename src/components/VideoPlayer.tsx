import { useEffect, useRef, useState } from 'react';
import { Loader2, Play } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  onProgress: (state: { playedSeconds: number }) => void;
  seekRequest: number | null;
  onSeekHandled: () => void;
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function extractVideoId(input: string): string | null {
  try {
    const parsedUrl = new URL(input);
    if (parsedUrl.hostname === 'youtu.be') {
      return parsedUrl.pathname.slice(1).split('?')[0] || null;
    }
    const v = parsedUrl.searchParams.get('v');
    if (v) return v;
    const parts = parsedUrl.pathname.split('/').filter(Boolean);
    if (['embed', 'shorts', 'v'].includes(parts[0]) && parts[1]) return parts[1];
  } catch {
    // Not a valid URL.
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim();
  return null;
}

export function VideoPlayer({ url, onProgress, seekRequest, onSeekHandled }: VideoPlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const onProgressRef = useRef(onProgress);
  const [isApiReady, setIsApiReady] = useState(Boolean(window.YT?.Player));
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    if (window.YT?.Player) {
      setIsApiReady(true);
      return;
    }

    const scriptExists = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (!scriptExists) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(script);
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      setIsApiReady(true);
    };

    return () => {
      window.onYouTubeIframeAPIReady = previousReady;
    };
  }, []);

  useEffect(() => {
    if (!window.YT?.Player || !hostRef.current || !url) return;

    const videoId = extractVideoId(url);
    if (!videoId) return;

    playerRef.current?.destroy?.();
    playerRef.current = new window.YT.Player(hostRef.current, {
      width: '100%',
      height: '100%',
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          playerRef.current?.playVideo?.();
        },
        onStateChange: (event: { data: number }) => {
          const ytState = window.YT?.PlayerState;
          if (!ytState) return;
          setIsPlaying(event.data === ytState.PLAYING);
        },
      },
    });

    return () => {
      playerRef.current?.destroy?.();
      playerRef.current = null;
      setIsPlaying(false);
    };
  }, [url]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!playerRef.current) return;
      if (!isPlaying) return;

      const current = playerRef.current.getCurrentTime?.();
      if (typeof current === 'number' && Number.isFinite(current)) {
        onProgressRef.current({ playedSeconds: current });
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (seekRequest === null) return;
    playerRef.current?.seekTo?.(seekRequest, true);
    onProgressRef.current({ playedSeconds: seekRequest });
    onSeekHandled();
  }, [seekRequest, onSeekHandled]);

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

      {/* State 2: URL exists, but YouTube iframe API is still loading */}
      {url && !isApiReady && (
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading video engine...</p>
        </div>
      )}

      {/* State 3: URL exists and YouTube iframe API is ready */}
      {url && isApiReady && <div ref={hostRef} className="absolute inset-0" />}
    </div>
  );
}