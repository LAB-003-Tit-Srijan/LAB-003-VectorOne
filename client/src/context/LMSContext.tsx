import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { TranscriptItem } from '../components/Transcript';
import { useLearningData } from '../hooks/useLearningData';
import { extractVideoId, normalizeTranscriptUnits } from '../lib/youtube';
import { readRecentLectures, recordRecentLecture, type RecentLecture } from '../lib/recentLectures';
import type { InsightsResponse, TimelineItem } from '../types/insights';
import { DEFAULT_AI_PREFERENCES, type AiPreferences } from '../types/lms';
import { captureClientException } from '../lib/monitoring';
import { useAuth } from './AuthContext';

type Theme = 'light' | 'dark';

interface LMSContextValue {
  sessionId: string;
  theme: Theme;
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
  learningMode: string;
  setLearningMode: React.Dispatch<React.SetStateAction<string>>;
  aiPreferences: AiPreferences;
  setAiPreferences: React.Dispatch<React.SetStateAction<AiPreferences>>;
  inputUrl: string;
  setInputUrl: React.Dispatch<React.SetStateAction<string>>;
  videoUrl: string;
  videoId: string;
  currentTime: number;
  seekRequest: number | null;
  transcriptData: TranscriptItem[];
  isTranscriptLoading: boolean;
  transcriptError: string | null;
  submitLectureUrl: () => void;
  loadLectureById: (idOrUrl: string) => Promise<void>;
  handleSeek: (time: number) => void;
  handleProgress: (state: { playedSeconds: number }) => void;
  handleSeekHandled: () => void;
  insights: InsightsResponse | null;
  timeline: TimelineItem[];
  learningDataLoading: boolean;
  learningDataError: string | null;
  pendingChatQuestion: { token: number; text: string } | null;
  queueQuickAction: (text: string) => void;
  consumePendingQuestion: () => void;
  recentLectures: RecentLecture[];
}

const LMSContext = createContext<LMSContextValue | null>(null);

function loadAiPrefs(): AiPreferences {
  try {
    const raw = localStorage.getItem('lms-ai-prefs');
    if (!raw) return DEFAULT_AI_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<AiPreferences>;
    return { ...DEFAULT_AI_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_AI_PREFERENCES;
  }
}

export function LMSProvider({ children }: { children: ReactNode }) {
  const { authFetch } = useAuth();

  const [sessionId] = useState(() => {
    if (typeof window === 'undefined') return `session-${Date.now()}`;
    const existing = window.sessionStorage.getItem('lms-ai-session-id');
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `session-${Date.now()}`;
    window.sessionStorage.setItem('lms-ai-session-id', generated);
    return generated;
  });

  const [learningMode, setLearningMode] = useState('Beginner');
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = window.localStorage.getItem('lms-theme');
    return stored === 'light' ? 'light' : 'dark';
  });

  const [aiPreferences, setAiPreferences] = useState<AiPreferences>(() => loadAiPrefs());

  const [inputUrl, setInputUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [seekRequest, setSeekRequest] = useState<number | null>(null);
  const [transcriptData, setTranscriptData] = useState<TranscriptItem[]>([]);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [recentLectures, setRecentLectures] = useState<RecentLecture[]>(() => readRecentLectures());

  const { insights, timeline, isLoading: learningDataLoading, error: learningDataError } =
    useLearningData(sessionId, videoId);

  const [pendingChatQuestion, setPendingChatQuestion] = useState<{
    token: number;
    text: string;
  } | null>(null);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('lms-theme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem('lms-ai-prefs', JSON.stringify(aiPreferences));
  }, [aiPreferences]);

  const fetchTranscript = useCallback(async (vid: string) => {
    setIsTranscriptLoading(true);
    setTranscriptError(null);
    setTranscriptData([]);

    try {
      const res = await authFetch(`/api/transcript?videoId=${encodeURIComponent(vid)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      const normalised = normalizeTranscriptUnits(data.transcript ?? []);
      setTranscriptData(normalised);
      const url = `https://www.youtube.com/watch?v=${vid}`;
      setRecentLectures(
        recordRecentLecture({
          videoId: vid,
          url,
          title: `YouTube · ${vid}`,
        })
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[fetchTranscript]', message);
      captureClientException(err, { scope: 'fetchTranscript', videoId: vid });
      setTranscriptError(message);
    } finally {
      setIsTranscriptLoading(false);
    }
  }, [authFetch]);

  const loadLectureById = useCallback(
    async (idOrUrl: string) => {
      const raw = idOrUrl.trim();
      if (!raw) return;
      const id = extractVideoId(raw) ?? (/^[a-zA-Z0-9_-]{11}$/.test(raw) ? raw : null);
      if (!id) {
        setTranscriptError('Invalid YouTube URL — could not extract a video ID.');
        setVideoUrl('');
        setVideoId('');
        return;
      }

      const normalizedVideoUrl = `https://www.youtube.com/watch?v=${id}`;
      setVideoUrl(normalizedVideoUrl);
      setVideoId(id);
      setInputUrl(raw.includes('http') ? raw : `https://youtu.be/${id}`);
      setTranscriptError(null);
      await fetchTranscript(id);
    },
    [fetchTranscript]
  );

  const submitLectureUrl = useCallback(() => {
    const rawInput = inputUrl.trim();
    if (!rawInput) return;
    void loadLectureById(rawInput);
  }, [inputUrl, loadLectureById]);

  const handleSeek = useCallback(
    (time: number) => {
      setSeekRequest(time);
      if (!videoId) return;
      authFetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          videoId,
          eventType: 'replay',
          timestamp: time,
        }),
      }).catch(() => {});
    },
    [sessionId, videoId, authFetch]
  );

  const handleProgress = useCallback((state: { playedSeconds: number }) => {
    setCurrentTime(state.playedSeconds);
  }, []);

  const handleSeekHandled = useCallback(() => {
    setSeekRequest(null);
  }, []);

  const consumePendingQuestion = useCallback(() => {
    setPendingChatQuestion(null);
  }, []);

  const queueQuickAction = useCallback((text: string) => {
    setPendingChatQuestion({ token: Date.now(), text });
  }, []);

  const value = useMemo<LMSContextValue>(
    () => ({
      sessionId,
      theme,
      setTheme,
      learningMode,
      setLearningMode,
      aiPreferences,
      setAiPreferences,
      inputUrl,
      setInputUrl,
      videoUrl,
      videoId,
      currentTime,
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
      pendingChatQuestion,
      queueQuickAction,
      consumePendingQuestion,
      recentLectures,
    }),
    [
      sessionId,
      theme,
      learningMode,
      aiPreferences,
      inputUrl,
      videoUrl,
      videoId,
      currentTime,
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
      pendingChatQuestion,
      queueQuickAction,
      consumePendingQuestion,
      recentLectures,
    ]
  );

  return <LMSContext.Provider value={value}>{children}</LMSContext.Provider>;
}

export function useLMS() {
  const ctx = useContext(LMSContext);
  if (!ctx) throw new Error('useLMS must be used within LMSProvider');
  return ctx;
}
