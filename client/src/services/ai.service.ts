import { apiUrl, parseJsonBody } from '../lib/apiBase';
import type { TranscriptItem } from '../components/Transcript';

export interface SourceRef {
  chunkId: string;
  start: number;
  end: number;
  score: number;
}

export interface AskResponse {
  answer: string;
  sources: SourceRef[];
  error?: string;
}

export interface AskRequestPayload {
  videoId: string;
  sessionId: string;
  question: string;
  transcript: TranscriptItem[];
  mode?: string;
}

export interface SmartSummaryPayload {
  videoId: string;
  text: string;
  type: 'full' | 'last5mins' | 'topic' | 'exam';
}

export interface SmartSummaryResponse {
  sections: Array<{ title: string; content: string }>;
}

export const aiService = {
  /**
   * Send user question and transcript context to the AI API.
   */
  async askQuestionStream(
    authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
    payload: AskRequestPayload,
    onChunk: (text: string) => void,
    onDone: (sources: SourceRef[]) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const res = await authFetch(apiUrl('/api/ask'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await parseJsonBody<{error?: string}>(res).catch(() => ({}));
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      if (!res.body) throw new Error('ReadableStream not supported by browser.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (!dataStr.trim()) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'chunk') {
                onChunk(data.text);
              } else if (data.type === 'done') {
                onDone(data.sources || []);
              }
            } catch (e) {
              // ignore parse errors for partial JSON
            }
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onError(msg);
    }
  },

  async getSmartSummary(
    authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
    payload: SmartSummaryPayload
  ): Promise<SmartSummaryResponse> {
    const res = await authFetch(apiUrl('/api/ai/smart-summarize'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await parseJsonBody<any>(res);
    if (!res.ok) {
      throw new Error(data.error ?? `Server error ${res.status}`);
    }

    return data;
  }
};
