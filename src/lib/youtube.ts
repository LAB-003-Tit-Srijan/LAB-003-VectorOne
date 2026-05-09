import type { TranscriptItem } from '../components/Transcript';

export function extractVideoId(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('?')[0];
    const v = url.searchParams.get('v');
    if (v) return v;
    const parts = url.pathname.split('/').filter(Boolean);
    if (['embed', 'shorts', 'v'].includes(parts[0]) && parts[1]) return parts[1];
  } catch {
    /* not a URL */
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim();
  return null;
}

export function parseTimestamp(input: string): number | undefined {
  try {
    const url = new URL(input);
    const t = url.searchParams.get('t') || url.searchParams.get('start');
    if (!t) return undefined;
    
    let seconds = 0;
    if (/^\d+$/.test(t)) {
      seconds = parseInt(t, 10);
    } else {
      const hMatch = t.match(/(\d+)h/);
      const mMatch = t.match(/(\d+)m/);
      const sMatch = t.match(/(\d+)s/);
      if (hMatch) seconds += parseInt(hMatch[1], 10) * 3600;
      if (mMatch) seconds += parseInt(mMatch[1], 10) * 60;
      if (sMatch) seconds += parseInt(sMatch[1], 10);
    }
    return seconds > 0 ? seconds : undefined;
  } catch {
    return undefined;
  }
}

export function normalizeTranscriptUnits(
  items: Array<{ text: string; start: number; duration: number; offset?: number }>
): TranscriptItem[] {
  if (!items.length) return [];

  const sample = items.slice(0, 8);
  const looksLikeMilliseconds = sample.some((item) => {
    const duration = Number(item.duration ?? 0);
    const offset = Number(item.offset ?? item.start ?? 0);
    return duration > 30 || offset > 300;
  });

  const factor = looksLikeMilliseconds ? 1 / 1000 : 1;

  return items.map((item) => {
    const startRaw = Number(item.offset ?? item.start ?? 0);
    const durationRaw = Number(item.duration ?? 0);

    return {
      text: item.text,
      offset: Number.isFinite(startRaw) ? startRaw * factor : 0,
      duration: Number.isFinite(durationRaw) ? durationRaw * factor : 0,
    };
  });
}
