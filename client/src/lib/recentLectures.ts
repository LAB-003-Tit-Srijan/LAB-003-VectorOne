const STORAGE_KEY = 'lms-recent-lectures';
const MAX = 16;

export interface RecentLecture {
  videoId: string;
  url: string;
  title: string;
  lastOpenedAt: number;
}

export function readRecentLectures(): RecentLecture[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(
      (x): x is RecentLecture =>
        x &&
        typeof x === 'object' &&
        typeof (x as RecentLecture).videoId === 'string' &&
        typeof (x as RecentLecture).url === 'string'
    );
  } catch {
    return [];
  }
}

export function recordRecentLecture(entry: {
  videoId: string;
  url: string;
  title?: string;
}): RecentLecture[] {
  const list = readRecentLectures();
  const item: RecentLecture = {
    videoId: entry.videoId,
    url: entry.url,
    title: entry.title ?? `Lecture · ${entry.videoId}`,
    lastOpenedAt: Date.now(),
  };
  const rest = list.filter((x) => x.videoId !== item.videoId);
  const next = [item, ...rest].slice(0, MAX);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
