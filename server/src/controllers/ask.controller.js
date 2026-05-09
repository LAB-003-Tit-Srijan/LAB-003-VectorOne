import {
  NIM_API_KEY,
  FALLBACK_ANSWER,
  RETRIEVAL_TOP_K,
  MIN_RELEVANCE_SCORE,
  VISUAL_CONTEXT_TIMEOUT_MS,
} from '../config/env.js';
import { cosineSimilarity } from '../utils/vector.js';
import { isVisualQuestion, hasLexicalOverlap } from '../utils/text.js';
import { generateGroundedAnswer, embedText } from '../services/nim-api.service.js';
import { maybeResolvePersonFromWeb } from '../services/web-profile.service.js';
import { buildOrGetRagIndex, ensureVisualContext } from '../services/rag.service.js';
import {
  getSessionMemory,
  computeLearnerInsights,
  saveSessionTurn,
  trackQuestionOutcome,
  detectMemorySignals,
} from '../services/analytics.service.js';
import { reportServerError } from '../middleware/sentry.js';

export async function postAsk(req, res) {
  if (!NIM_API_KEY) {
    return res.status(500).json({
      error: 'NIM_API_KEY (or NVIDIA_NIM_API_KEY) is missing on the server.',
    });
  }

  const { videoId, question, transcript, sessionId } = req.body ?? {};

  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({ error: 'videoId is required.' });
  }
  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'question is required.' });
  }
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId is required.' });
  }
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return res.status(400).json({ error: 'transcript is required.' });
  }

  try {
    const visualQuestion = isVisualQuestion(question);
    if (visualQuestion) {
      await Promise.race([
        ensureVisualContext(videoId),
        new Promise((resolve) => setTimeout(resolve, VISUAL_CONTEXT_TIMEOUT_MS)),
      ]);
    } else {
      ensureVisualContext(videoId).catch(() => {});
    }

    const history = getSessionMemory(sessionId, videoId);
    const signals = detectMemorySignals(question.trim(), history);
    const learnerInsights = computeLearnerInsights(sessionId, videoId);
    const index = await buildOrGetRagIndex(videoId, transcript);
    const questionEmbedding = await embedText(question.trim(), 'query');

    const ranked = index.chunks
      .map((chunk) => ({
        ...chunk,
        score: cosineSimilarity(questionEmbedding, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score);

    const topChunks = ranked.slice(0, RETRIEVAL_TOP_K);
    const bestScore = topChunks[0]?.score ?? 0;
    const lexicalMatch = hasLexicalOverlap(question.trim(), topChunks);
    const webProfile = await maybeResolvePersonFromWeb(videoId, question.trim());
    if (!topChunks.length || (bestScore < MIN_RELEVANCE_SCORE && !lexicalMatch)) {
      if (webProfile) {
        const memory = {
          history: history.slice(-4),
          signals,
        };
        const answerFromWeb = await generateGroundedAnswer(
          question.trim(),
          topChunks,
          memory,
          learnerInsights,
          `Video title: ${webProfile.metadata.title}
Channel: ${webProfile.metadata.channel}
Video URL: ${webProfile.metadata.webpageUrl}
Web evidence:
${webProfile.evidence}`
        );
        saveSessionTurn(sessionId, videoId, question.trim(), answerFromWeb);
        trackQuestionOutcome(sessionId, videoId, question.trim(), answerFromWeb, signals);
        return res.json({ answer: answerFromWeb, sources: [] });
      }

      const answer = FALLBACK_ANSWER;
      saveSessionTurn(sessionId, videoId, question.trim(), answer);
      trackQuestionOutcome(sessionId, videoId, question.trim(), answer, signals);
      return res.json({
        answer: FALLBACK_ANSWER,
        sources: [],
      });
    }

    const memory = {
      history: history.slice(-4),
      signals,
    };
    const answer = await generateGroundedAnswer(
      question.trim(),
      topChunks,
      memory,
      learnerInsights,
      webProfile
        ? `Video title: ${webProfile.metadata.title}
Channel: ${webProfile.metadata.channel}
Video URL: ${webProfile.metadata.webpageUrl}
Web evidence:
${webProfile.evidence}`
        : ''
    );
    saveSessionTurn(sessionId, videoId, question.trim(), answer);
    trackQuestionOutcome(sessionId, videoId, question.trim(), answer, signals);
    const sources = topChunks.map((chunk) => ({
      chunkId: chunk.chunkId,
      start: chunk.start,
      end: chunk.end,
      score: Number(chunk.score.toFixed(4)),
    }));

    return res.json({ answer, sources });
  } catch (err) {
    const message = err?.message ?? 'Failed to process question.';
    console.error('[ask]', message);
    reportServerError(err, { route: 'POST /api/ask' });
    return res.status(500).json({
      error: message,
    });
  }
}
