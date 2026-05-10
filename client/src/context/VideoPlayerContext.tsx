import { createContext, useContext, ReactNode } from 'react';

interface VideoPlayerContextType {
  seekTo: (time: number) => void;
  currentTime: number;
}

const VideoPlayerContext = createContext<VideoPlayerContextType | null>(null);

interface VideoPlayerProviderProps {
  children: ReactNode;
  seekTo: (time: number) => void;
  currentTime: number;
}

export function VideoPlayerProvider({ children, seekTo, currentTime }: VideoPlayerProviderProps) {
  return (
    <VideoPlayerContext.Provider value={{ seekTo, currentTime }}>
      {children}
    </VideoPlayerContext.Provider>
  );
}

export function useVideoPlayer() {
  const ctx = useContext(VideoPlayerContext);
  if (!ctx) {
    throw new Error('useVideoPlayer must be used within a VideoPlayerProvider');
  }
  return ctx;
}
