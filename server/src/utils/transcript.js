export function normalizeTranscriptUnits(items) {
  if (!Array.isArray(items) || items.length === 0) return [];

  const sample = items.slice(0, 8);
  const looksLikeMilliseconds = sample.some((item) => {
    const duration = Number(item?.duration ?? 0);
    const offset = Number(item?.offset ?? item?.start ?? 0);
    return duration > 30 || offset > 300;
  });

  const factor = looksLikeMilliseconds ? 1 / 1000 : 1;

  return items.map((item) => {
    const startRaw = Number(item?.offset ?? item?.start ?? 0);
    const durationRaw = Number(item?.duration ?? 0);
    const start = Number.isFinite(startRaw) ? startRaw * factor : 0;
    const duration = Number.isFinite(durationRaw) ? durationRaw * factor : 0;

    return {
      text: item?.text ?? '',
      start,
      duration,
      offset: start,
    };
  });
}

function buildChunk(lines, index) {
  const start = Number(lines[0]?.offset ?? lines[0]?.start ?? 0);
  const last = lines[lines.length - 1];
  const lastOffset = Number(last?.offset ?? last?.start ?? 0);
  const lastDuration = Number(last?.duration ?? 0);
  const end = Math.max(start, lastOffset + lastDuration);

  return {
    chunkId: `chunk-${index}`,
    start,
    end,
    text: lines.map((line) => line.text).join(' ').replace(/\s+/g, ' ').trim(),
  };
}

export function chunkTranscript(items, maxChars = 800) {
  const chunks = [];
  let buffer = [];
  let currentChars = 0;

  for (const item of items) {
    const text = (item.text ?? '').trim();
    if (!text) continue;

    const segmentSize = text.length + 1;
    if (buffer.length > 0 && currentChars + segmentSize > maxChars) {
      chunks.push(buildChunk(buffer, chunks.length));
      buffer = [];
      currentChars = 0;
    }

    buffer.push(item);
    currentChars += segmentSize;
  }

  if (buffer.length > 0) {
    chunks.push(buildChunk(buffer, chunks.length));
  }

  return chunks;
}
