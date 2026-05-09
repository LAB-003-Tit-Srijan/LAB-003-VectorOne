import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { VideoPlayer } from '../components/VideoPlayer';
import { AIChat } from '../components/AIChat';
import { Transcript } from '../components/Transcript';
import { useLMS } from '../context/LMSContext';

export function LearnPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const seekAppliedRef = useRef<string | null>(null);

  const {
    sessionId,
    inputUrl,
    setInputUrl,
    videoUrl,
    videoId,
    seekRequest,
    transcriptData,
    isTranscriptLoading,
    transcriptError,
    submitLectureUrl,
    loadLectureById,
    handleSeek,
    handleProgress,
    handleSeekHandled,
    pendingChatQuestion,
    consumePendingQuestion,
    currentTime,
  } = useLMS();

  const vParam = searchParams.get('v');
  useEffect(() => {
    if (!vParam) return;
    if (vParam === videoId) return;
    void loadLectureById(vParam);
  }, [vParam, videoId, loadLectureById]);

  useEffect(() => {
    seekAppliedRef.current = null;
  }, [videoId]);

  useEffect(() => {
    const t = searchParams.get('t');
    if (!t || !videoId || transcriptData.length === 0) return;
    const key = `${videoId}:${t}`;
    if (seekAppliedRef.current === key) return;
    const sec = parseFloat(t);
    if (!Number.isFinite(sec)) return;
    seekAppliedRef.current = key;
    handleSeek(sec);
    const next = new URLSearchParams(searchParams);
    next.delete('t');
    setSearchParams(next, { replace: true });
  }, [videoId, transcriptData.length, searchParams, setSearchParams, handleSeek]);

  const onKeyUrl = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') submitLectureUrl();
    },
    [submitLectureUrl]
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 -mt-2">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl border px-3 py-2 sm:px-4 sm:py-2.5"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
      >
        <label className="sr-only" htmlFor="learn-lecture-url">
          Lecture URL
        </label>
        <input
          id="learn-lecture-url"
          type="text"
          placeholder="YouTube URL or video ID — Enter"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={onKeyUrl}
          className="w-full bg-transparent text-sm outline-none placeholder:opacity-60"
          style={{ color: 'var(--text-main)' }}
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        <div className="lg:col-span-7 flex flex-col gap-5">
          <motion.div layout className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--surface-border)' }}>
            <div className="lg:h-[min(52vh,520px)] h-[min(42vh,380px)] min-h-[280px]">
              <VideoPlayer
                url={videoUrl}
                onProgress={handleProgress}
                seekRequest={seekRequest}
                onSeekHandled={handleSeekHandled}
              />
            </div>
          </motion.div>

          <Transcript
            transcriptData={transcriptData}
            currentTime={currentTime}
            onSeek={handleSeek}
            isLoading={isTranscriptLoading}
            error={transcriptError}
          />
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-4">
          <div className="min-h-[min(88vh,760px)] lg:min-h-[calc(100vh-8rem)]">
            <AIChat
              videoId={videoId}
              sessionId={sessionId}
              transcriptData={transcriptData}
              onSeek={handleSeek}
              pendingQuestion={pendingChatQuestion}
              onConsumePendingQuestion={consumePendingQuestion}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
