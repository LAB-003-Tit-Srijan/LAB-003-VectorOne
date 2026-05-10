/** When set, relative `/api/*` requests go here (use when the UI is not served behind the Vite proxy). */
export function apiUrl(path: string): string {
  if (!path.startsWith('/api')) return path;
  const base = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') ?? '';
  return base ? `${base}${path}` : path;
}

/**
 * Read JSON from a fetch Response; fail clearly when the server returned HTML (SPA fallback, proxy error page).
 */
export async function parseJsonBody<T>(res: Response): Promise<T> {
  const text = await res.text();
  const head = text.trimStart().toLowerCase();
  if (head.startsWith('<!doctype') || head.startsWith('<html') || head.startsWith('<!')) {
    if (res.status === 413) {
      throw new Error(`The transcript or request payload is too large for the server (413). I've increased the server limit, please try again.`);
    }
    throw new Error(
      `Expected JSON but got HTML (${res.status}) from ${res.url}. ` +
        `Fix: run the API (npm run dev:server on port 3001), run the UI with Vite (npm run dev), open the app on the Vite port (not :3001). ` +
        `Unset VITE_API_BASE_URL for normal dev so /api is proxied. Only set VITE_API_BASE_URL if you must call the API host directly.`
    );
  }
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      text.length > 180 ? `${text.slice(0, 180)}…` : text || 'Invalid JSON from server.'
    );
  }
}
