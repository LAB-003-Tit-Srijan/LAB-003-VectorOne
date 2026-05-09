/**
 * Extracts a YouTube video ID from a URL or returns the string as-is if
 * it's already just an ID (11 chars, alphanumeric + _ -).
 */
export function extractVideoId(input) {
  try {
    const url = new URL(input);
    if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1).split('?')[0];
    }
    const v = url.searchParams.get('v');
    if (v) return v;
    const parts = url.pathname.split('/').filter(Boolean);
    if (['embed', 'shorts', 'v'].includes(parts[0]) && parts[1]) return parts[1];
  } catch {
    // Not a URL — could be a bare video ID
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) {
    return input.trim();
  }
  return null;
}
