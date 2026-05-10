import { motion } from 'framer-motion';
import { Clock3 } from 'lucide-react';
import { useVideoPlayer } from '../context/VideoPlayerContext';

interface TimestampChipProps {
  timeString?: string;
  seconds?: number;
}

function parseTimeStringToSeconds(timeString: string): number {
  const parts = timeString.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

export function TimestampChip({ timeString, seconds }: TimestampChipProps) {
  const { seekTo } = useVideoPlayer();
  
  const targetSeconds = seconds ?? (timeString ? parseTimeStringToSeconds(timeString) : 0);
  const displayTime = timeString ?? formatTime(targetSeconds);

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => seekTo(targetSeconds)}
      className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2 py-0.5 rounded-md bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 text-indigo-300 transition-colors align-middle mx-0.5"
      title={`Jump to ${displayTime}`}
    >
      <Clock3 className="w-3 h-3" />
      {displayTime}
    </motion.button>
  );
}
