import {
  NIM_API_KEY,
  FALLBACK_ANSWER,
  RETRIEVAL_TOP_K,
  MIN_RELEVANCE_SCORE,
  VISUAL_CONTEXT_TIMEOUT_MS,
} from '../config/env.js';
import { cosineSimilarity } from '../utils/vector.js';
import { isVisualQuestion, hasLexicalOverlap } from '../utils/text.js';
import { generateGroundedAnswer, generateGroundedAnswerStream, embedText } from '../services/nim-api.service.js';
import { maybeResolvePersonFromWeb } from '../services/web-profile.service.js';
import { getModeInstructions } from '../utils/modePromptBuilder.js';
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

  const { videoId, question, transcript, sessionId, mode } = req.body ?? {};
  const modeInstructions = getModeInstructions(mode);

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
    
    console.log(`[ask] Question: "${question.trim()}"`);
    console.log(`[ask] Best similarity score: ${bestScore.toFixed(4)} (Threshold: ${MIN_RELEVANCE_SCORE})`);
    console.log(`[ask] Lexical match: ${lexicalMatch}`);

    const webProfile = await maybeResolvePersonFromWeb(videoId, question.trim());

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Ensure headers are sent immediately

    if (!topChunks.length || (bestScore < MIN_RELEVANCE_SCORE && !lexicalMatch)) {
      if (webProfile) {
        const memory = {
          history: history.slice(-4),
          signals,
        };
        const stream = generateGroundedAnswerStream(
          question.trim(),
          topChunks,
          memory,
          learnerInsights,
          `Video title: ${webProfile.metadata.title}\nChannel: ${webProfile.metadata.channel}\nVideo URL: ${webProfile.metadata.webpageUrl}\nWeb evidence:\n${webProfile.evidence}`,
          modeInstructions
        );
        
        let fullAnswer = '';
        for await (const chunk of stream) {
          fullAnswer += chunk;
          res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
        }
        
        saveSessionTurn(sessionId, videoId, question.trim(), fullAnswer);
        trackQuestionOutcome(sessionId, videoId, question.trim(), fullAnswer, signals);
        res.write(`data: ${JSON.stringify({ type: 'done', sources: [] })}\n\n`);
        return res.end();
      }

      const answer = FALLBACK_ANSWER;
      saveSessionTurn(sessionId, videoId, question.trim(), answer);
      trackQuestionOutcome(sessionId, videoId, question.trim(), answer, signals);
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: answer })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done', sources: [] })}\n\n`);
      return res.end();
    }

    const memory = {
      history: history.slice(-4),
      signals,
    };
    
    const stream = generateGroundedAnswerStream(
      question.trim(),
      topChunks,
      memory,
      learnerInsights,
      webProfile
        ? `Video title: ${webProfile.metadata.title}\nChannel: ${webProfile.metadata.channel}\nVideo URL: ${webProfile.metadata.webpageUrl}\nWeb evidence:\n${webProfile.evidence}`
        : '',
      modeInstructions
    );

    let fullAnswer = '';
    for await (const chunk of stream) {
      fullAnswer += chunk;
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
    }

    saveSessionTurn(sessionId, videoId, question.trim(), fullAnswer);
    trackQuestionOutcome(sessionId, videoId, question.trim(), fullAnswer, signals);
    
    const isFallback = fullAnswer.includes(FALLBACK_ANSWER);
    const sources = isFallback ? [] : topChunks.map((chunk) => ({
      chunkId: chunk.chunkId,
      start: chunk.start,
      end: chunk.end,
      score: Number(chunk.score.toFixed(4)),
    }));

    res.write(`data: ${JSON.stringify({ type: 'done', sources })}\n\n`);
    return res.end();
  } catch (err) {
    const message = err?.message ?? 'Failed to process question.';
    console.error('[ask]', message);
    reportServerError(err, { route: 'POST /api/ask' });
    return res.status(500).json({
      error: message,
    });
  }
}
