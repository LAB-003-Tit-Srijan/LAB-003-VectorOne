export async function parseJsonSafe(response) {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

export function extractApiError(data, fallback) {
  if (typeof data?.error?.message === 'string') return data.error.message;
  if (typeof data?.message === 'string') return data.message;
  if (typeof data?.detail === 'string') return data.detail;
  if (typeof data?.raw === 'string') return data.raw.slice(0, 400);
  if (data && typeof data === 'object') return JSON.stringify(data).slice(0, 500);
  return fallback;
}
