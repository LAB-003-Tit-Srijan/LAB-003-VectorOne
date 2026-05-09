import {
  NIM_API_KEY,
  NIM_BASE_URL,
  EMBEDDING_MODEL,
  EMBEDDING_FALLBACK_MODELS,
  GENERATION_MODEL,
  FALLBACK_ANSWER,
  VISION_MODEL,
} from '../config/env.js';
import { embeddingStrategyCache } from '../models/stores.js';
import { parseJsonSafe, extractApiError } from '../utils/http.js';
import { formatTimestamp } from '../utils/time.js';

export async function requestEmbedding(model, payload) {
  const res = await fetch(`${NIM_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NIM_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      ...payload,
    }),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const reason = extractApiError(data, 'NIM embedding request failed.');
    throw new Error(`[model=${model}] (${res.status}) ${reason}`);
  }

  // Debug: log response keys
  console.log(`[embedding-api] Model: ${model}, Response keys: ${Object.keys(data).join(', ')}`);
  if (data?.data) console.log(`[embedding-api] data.length: ${data.data.length}`);

  const vector = data?.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length === 0) {
    console.error(`[embedding-api] Invalid structure:`, JSON.stringify(data).slice(0, 500));
    throw new Error(`[model=${model}] Embedding API returned an empty or invalid vector.`);
  }
  console.log(`[embedding-api] Successfully retrieved vector of length ${vector.length}`);
  return vector;
}

export async function embedText(text, inputType) {
  const models = [EMBEDDING_MODEL, ...EMBEDDING_FALLBACK_MODELS].filter(
    (model, idx, arr) => arr.indexOf(model) === idx
  );
  const payloadVariants = [
    { input: [text], input_type: inputType, encoding_format: 'float' },
    { input: [text], encoding_format: 'float' },
    { input: text, encoding_format: 'float' },
  ];

  const strategyKey = `inputType:${inputType}`;
  const cached = embeddingStrategyCache.get(strategyKey);
  if (cached) {
    try {
      // Reconstruct payload with NEW text but SAME structure that worked before
      const variant = payloadVariants[cached.variantIndex];
      const payload = { ...variant };
      if (Array.isArray(variant.input)) {
        payload.input = [text];
      } else {
        payload.input = text;
      }
      return await requestEmbedding(cached.model, payload);
    } catch {
      embeddingStrategyCache.delete(strategyKey);
    }
  }

  const errors = [];
  for (const model of models) {
    for (let idx = 0; idx < payloadVariants.length; idx += 1) {
      const payload = payloadVariants[idx];
      try {
        const vector = await requestEmbedding(model, payload);
        // Cache the model and which variant index worked, NOT the payload itself
        embeddingStrategyCache.set(strategyKey, { model, variantIndex: idx });
        return vector;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(message);
      }
    }
  }

  throw new Error(`NIM embedding request failed. Attempts: ${errors.join(' | ')}`);
}

export async function describeFrameWithVision(videoId, frame) {
  const prompt =
    `Describe only what is visibly shown in this lecture frame. ` +
    `Focus on diagrams, code, formulas, slides, and labels. Keep it under 40 words.`;

  const imageUrl = `data:image/jpeg;base64,${frame.imageBase64}`;
  const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NIM_API_KEY}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 120,
    }),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const reason = extractApiError(data, 'NIM vision request failed.');
    throw new Error(`NIM vision request failed (${res.status}): ${reason}`);
  }

  const text = data?.choices?.[0]?.message?.content?.trim() ?? '';
  return {
    chunkId: `visual-${videoId}-${Math.round(frame.timestamp)}`,
    start: frame.timestamp,
    end: frame.timestamp + 2,
    text: `Visual context around ${formatTimestamp(frame.timestamp)}: ${text || 'No clear visual details.'}`,
    sourceType: 'visual',
  };
}

export async function generateGroundedAnswer(
  question,
  topChunks,
  memory,
  learnerInsights,
  externalProfileContext = ''
) {
  const context = topChunks
    .map(
      (chunk, idx) =>
        `[${idx + 1}] (${chunk.sourceType ?? 'transcript'}) ${chunk.start.toFixed(2)}s-${chunk.end.toFixed(2)}s\n${chunk.text}`
    )
    .join('\n\n');

  const historyBlock =
    memory.history.length === 0
      ? 'No prior chat turns in this session.'
      : memory.history
          .map(
            (turn, index) =>
              `${index + 1}. User: ${turn.question}\n   Assistant: ${turn.answer}`
          )
          .join('\n');

  const prompt = `You are an AI lecture companion for a single lecture transcript.
Strict Rules:
- Answer ONLY using the transcript context provided below.
- Do NOT use external knowledge, assumptions, or generic explanations.
- If the answer is missing or unclear in context, respond exactly: "${FALLBACK_ANSWER}"
- Reject unrelated/general questions by responding exactly: "${FALLBACK_ANSWER}"
- Keep the answer concise and instructional.
- When possible, include lecture timestamps from context in the answer (example: "around 12:43").
- Use recent session memory to personalize guidance and acknowledge learning struggles when relevant.
- If this appears repeated/confusing, briefly acknowledge it (example: "You previously asked about recursion.").
- Use visual context lines when the user asks about diagrams, on-screen text, or what is shown.
- For person-identity questions, you may use "External profile context" if provided.
- If no relevant evidence exists, respond exactly: "${FALLBACK_ANSWER}".

Question:
${question}

Recent session memory:
${historyBlock}

Memory hints:
- repeated_question: ${memory.signals.repeated ? 'yes' : 'no'}
- confusing_followup: ${memory.signals.confusing ? 'yes' : 'no'}
- previous_similar_question: ${memory.signals.repeatedQuestion || 'none'}

Learner behavior summary:
- confusion_level: ${learnerInsights.summary.confusionLevel}
- repeated_questions: ${learnerInsights.summary.repeatedQuestions}
- quiz_mistakes: ${learnerInsights.summary.quizMistakes}
- weak_topics: ${learnerInsights.weakTopics.map((item) => item.topic).join(', ') || 'none'}
- replay_hotspots: ${
    learnerInsights.replayHotspots.map((item) => formatTimestamp(item.timestamp)).join(', ') || 'none'
  }

External profile context:
${externalProfileContext || 'none'}

Transcript context:
${context}
`;

  const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NIM_API_KEY}`,
    },
    body: JSON.stringify({
      model: GENERATION_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 260,
    }),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const reason = extractApiError(data, 'NIM chat request failed.');
    throw new Error(`NIM chat request failed (${res.status}): ${reason}`);
  }

  const answer = data?.choices?.[0]?.message?.content?.trim();
  console.log(`[grounded-answer] LLM responded with: "${answer?.slice(0, 50)}..."`);
  
  if (!answer) {
    return FALLBACK_ANSWER;
  }
  return answer;
}
