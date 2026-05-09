import { useCallback, useEffect, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { VideoPlayer } from '../components/VideoPlayer';
import { AIChat } from '../components/AIChat';
import { Transcript } from '../components/Transcript';
import { LearningInsights } from '../components/LearningInsights';
import { LearningCommandCenter } from '../components/LearningCommandCenter';
import { Controls } from '../components/Controls';
import { useLMS } from '../context/LMSContext';
import { GraduationCap, Sparkles, Sun, Moon, LayoutDashboard, X } from 'lucide-react';

export function LearnPage() {
  const [searchParams] = useSearchParams();
  const {
    sessionId,
    theme,
    setTheme,
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
    insights,
    timeline,
    learningDataLoading,
    learningDataError,
    learningMode,
    setLearningMode,
    currentTime,
    pendingChatQuestion,
    queueQuickAction,
    consumePendingQuestion,
    commandCenterOpen,
    setCommandCenterOpen,
  } = useLMS();

  const vParam = searchParams.get('v');
  useEffect(() => {
    if (!vParam) return;
    if (vParam === videoId) return;
    void loadLectureById(vParam);
  }, [vParam, videoId, loadLectureById]);

  const onKeyUrl = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') submitLectureUrl();
    },
    [submitLectureUrl]
  );

  return (
    <div className="flex flex-col gap-6 -m-4 md:-m-6 lg:-m-8 md:mx-0 max-w-[1720px] mx-auto">
      <div className="flex gap-4 lg:gap-6">
        <aside className="hidden xl:flex w-[min(100%,380px)] shrink-0 glass-panel rounded-3xl p-4 flex-col sticky top-6 h-[calc(100vh-3rem)] min-h-0 shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
          <LearningCommandCenter
            videoId={videoId}
            transcriptData={transcriptData}
            insights={insights}
            timeline={timeline}
            dataLoading={learningDataLoading}
            learningMode={learningMode}
            setLearningMode={setLearningMode}
            currentTime={currentTime}
            onSeek={handleSeek}
            onQuickAction={queueQuickAction}
          />
        </aside>

        <div className="flex-1 min-w-0">
          <header className="glass-panel sticky top-3 z-30 px-5 py-4 rounded-3xl mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl premium-button flex items-center justify-center shrink-0">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0 hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight font-['Manrope']">
                  Learn<span className="text-gradient">AI</span>
                </h1>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Lecture workspace
                </p>
              </div>
            </div>

            <div className="flex-1 max-w-2xl hidden md:block">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Paste YouTube URL and press Enter..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  onKeyDown={onKeyUrl}
                  className="w-full rounded-2xl py-3 px-5 pl-11 text-sm outline-none border"
                  style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><polygon points="10 15 15 12 10 9 10 15"/></svg>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCommandCenterOpen(true)}
                className="xl:hidden w-10 h-10 rounded-xl flex items-center justify-center border"
                style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
                aria-label="Open learning command center"
              >
                <LayoutDashboard className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                className="w-10 h-10 rounded-xl flex items-center justify-center border"
                style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}>
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-medium">AI Active</span>
              </div>
            </div>
          </header>

          <div className="md:hidden mb-4">
            <input
              type="text"
              placeholder="YouTube URL…"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={onKeyUrl}
              className="w-full rounded-2xl py-3 px-4 text-sm outline-none border"
              style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto">
            <div className="lg:col-span-8 flex flex-col gap-6">
              <motion.div layout className="flex-none lg:h-[52vh] h-[420px] min-h-[320px]">
                <VideoPlayer
                  url={videoUrl}
                  onProgress={handleProgress}
                  seekRequest={seekRequest}
                  onSeekHandled={handleSeekHandled}
                />
              </motion.div>

              <div className="flex-none">
                <Controls learningMode={learningMode} setLearningMode={setLearningMode} />
              </div>

              <Transcript
                transcriptData={transcriptData}
                currentTime={currentTime}
                onSeek={handleSeek}
                isLoading={isTranscriptLoading}
                error={transcriptError}
              />
            </div>

            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="flex-1 min-h-[520px]">
                <AIChat
                  videoId={videoId}
                  sessionId={sessionId}
                  transcriptData={transcriptData}
                  onSeek={handleSeek}
                  pendingQuestion={pendingChatQuestion}
                  onConsumePendingQuestion={consumePendingQuestion}
                />
              </div>
              <div className="flex-none h-[430px] lg:min-h-[330px]">
                <LearningInsights
                  insights={insights}
                  isLoading={learningDataLoading}
                  error={learningDataError}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {commandCenterOpen && (
          <motion.div
            className="xl:hidden fixed inset-0 z-[100] flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.button
              type="button"
              aria-label="Close command center"
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCommandCenterOpen(false)}
            />
            <motion.aside
              className="relative w-[min(100vw-1rem,400px)] max-w-[100vw] h-full ml-2 my-2 rounded-3xl glass-panel shadow-2xl flex flex-col min-h-0 p-4 border"
              style={{ borderColor: 'var(--surface-border)' }}
              initial={{ x: -28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -28, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            >
              <div className="flex justify-end shrink-0 mb-2">
                <button
                  type="button"
                  onClick={() => setCommandCenterOpen(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center border"
                  style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <LearningCommandCenter
                  videoId={videoId}
                  transcriptData={transcriptData}
                  insights={insights}
                  timeline={timeline}
                  dataLoading={learningDataLoading}
                  learningMode={learningMode}
                  setLearningMode={setLearningMode}
                  currentTime={currentTime}
                  onSeek={(t) => {
                    handleSeek(t);
                    setCommandCenterOpen(false);
                  }}
                  onQuickAction={queueQuickAction}
                />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
