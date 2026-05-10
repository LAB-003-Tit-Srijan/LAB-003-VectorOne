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
  async askQuestion(
    authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
    payload: AskRequestPayload
  ): Promise<AskResponse> {
    const res = await authFetch(apiUrl('/api/ask'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await parseJsonBody<AskResponse>(res);
    if (!res.ok) {
      throw new Error(data.error ?? `Server error ${res.status}`);
    }

    return data;
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
