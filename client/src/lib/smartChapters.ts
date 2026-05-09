import type { TranscriptItem } from '../components/Transcript';

export interface SmartChapter {
  title: string;
  start: number;
  preview: string;
}

export function buildSmartChapters(items: TranscriptItem[], gapSec = 6, maxCharsPerChapter = 420): SmartChapter[] {
  if (!items.length) return [];

  const chapters: SmartChapter[] = [];
  let bucket: TranscriptItem[] = [];

  const flush = () => {
    if (bucket.length === 0) return;
    const start = bucket[0].offset;
    const text = bucket.map((b) => b.text).join(' ').replace(/\s+/g, ' ').trim();
    const words = text.split(/\s+/).filter(Boolean);
    const title =
      words.length <= 10 ? words.join(' ') || 'Section' : `${words.slice(0, 9).join(' ')}…`;
    chapters.push({
      title,
      start,
      preview: text.slice(0, 140) + (text.length > 140 ? '…' : ''),
    });
    bucket = [];
  };

  for (let i = 0; i < items.length; i += 1) {
    const line = items[i];
    if (bucket.length === 0) {
      bucket.push(line);
      continue;
    }
    const prev = bucket[bucket.length - 1];
    const prevEnd = prev.offset + prev.duration;
    const gap = line.offset - prevEnd;
    const joinedLen = bucket.map((b) => b.text).join(' ').length;

    if (gap > gapSec || joinedLen > maxCharsPerChapter) {
      flush();
    }
    bucket.push(line);
  }
  flush();

  return chapters.slice(0, 14);
}
