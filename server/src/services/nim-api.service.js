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

export async function requestEmbedding(model, payload, retryCount = 0) {
  const maxRetries = 4;
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

  if (res.status === 429 && retryCount < maxRetries) {
    const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 500;
    console.warn(`[embedding-api] Rate limited (429). Retrying in ${Math.round(delay)}ms (Attempt ${retryCount + 1}/${maxRetries})...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return requestEmbedding(model, payload, retryCount + 1);
  }

  if (!res.ok) {
    const reason = extractApiError(data, 'NIM embedding request failed.');
    throw new Error(`[model=${model}] (${res.status}) ${reason}`);
  }

  // Debug: log response keys
  console.log(`[embedding-api] Model: ${model}, Response keys: ${Object.keys(data).join(', ')}`);
  if (data?.data) console.log(`[embedding-api] data.length: ${data.data.length}`);

  const results = data?.data;
  if (!Array.isArray(results) || results.length === 0) {
    console.error(`[embedding-api] Invalid structure:`, JSON.stringify(data).slice(0, 500));
    throw new Error(`[model=${model}] Embedding API returned an empty or invalid response.`);
  }

  // Handle single or multiple inputs
  if (Array.isArray(payload.input)) {
    return results.map(item => item.embedding);
  }
  return results[0]?.embedding;
}

export async function embedText(text, inputType) {
  const results = await embedTextBatch([text], inputType);
  return results[0];
}

export async function embedTextBatch(texts, inputType) {
  if (!Array.isArray(texts) || texts.length === 0) return [];

  const models = [EMBEDDING_MODEL, ...EMBEDDING_FALLBACK_MODELS].filter(
    (model, idx, arr) => arr.indexOf(model) === idx
  );

  const strategyKey = `inputType:${inputType}`;
  const cached = embeddingStrategyCache.get(strategyKey);

  if (cached) {
    try {
      const payload = { 
        input: texts, 
        encoding_format: 'float',
        ...(inputType ? { input_type: inputType } : {})
      };
      return await requestEmbedding(cached.model, payload);
    } catch {
      embeddingStrategyCache.delete(strategyKey);
    }
  }

  const errors = [];
  const payloadVariants = [
    { input: texts, input_type: inputType, encoding_format: 'float' },
    { input: texts, encoding_format: 'float' },
  ];

  for (const model of models) {
    for (let idx = 0; idx < payloadVariants.length; idx += 1) {
      const payload = payloadVariants[idx];
      try {
        const result = await requestEmbedding(model, payload);
        embeddingStrategyCache.set(strategyKey, { model, variantIndex: idx });
        return result;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
  }

  throw new Error(`NIM batch embedding failed. Attempts: ${errors.join(' | ')}`);
}

export async function describeFrameWithVision(videoId, frame, retryCount = 0) {
  const maxRetries = 3;
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

  if (res.status === 429 && retryCount < maxRetries) {
    const delay = Math.pow(2, retryCount) * 1500 + Math.random() * 500;
    console.warn(`[vision-api] Rate limited (429). Retrying in ${Math.round(delay)}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return describeFrameWithVision(videoId, frame, retryCount + 1);
  }

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
  externalProfileContext = '',
  retryCount = 0
) {
  const maxRetries = 2;
  const MAX_CONTEXT_CHARS = 10000; // Proxy for token limit (approx 2500-3000 tokens)
  let context = '';
  let activeChunks = [...topChunks];

  while (activeChunks.length > 0) {
    context = activeChunks
      .map(
        (chunk, idx) =>
          `[${idx + 1}] (${chunk.sourceType ?? 'transcript'}) ${chunk.start.toFixed(2)}s-${chunk.end.toFixed(2)}s\n${chunk.text}`
      )
      .join('\n\n');

    if (context.length <= MAX_CONTEXT_CHARS || activeChunks.length === 1) {
      break;
    }
    activeChunks.pop(); // Remove the least relevant chunk
  }

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
- Answer using the transcript context provided below.
- If the context doesn't contain the answer, you can use session memory to clarify or ask for more detail.
- If the answer is completely missing and unrelated to the lecture, respond with: "${FALLBACK_ANSWER}"
- You can respond to greetings (like "hi" or "hello") naturally before addressing the lecture content.
- Keep the answer concise and instructional.
- When possible, include lecture timestamps from context in the answer (example: "around 12:43").
- Use recent session memory to personalize guidance and acknowledge learning struggles when relevant.
- Use visual context lines when the user asks about diagrams, on-screen text, or what is shown.
- For person-identity questions, use the "External profile context" if provided.
- If the user asks for a summary, provide a brief overview based on the provided chunks, noting that it is a partial summary.

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

  if (res.status === 429 && retryCount < maxRetries) {
    const delay = Math.pow(2, retryCount) * 2000 + Math.random() * 500;
    console.warn(`[chat-api] Rate limited (429). Retrying in ${Math.round(delay)}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return generateGroundedAnswer(question, topChunks, memory, learnerInsights, externalProfileContext, retryCount + 1);
  }

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

export async function generateSmartSummaryNIM(rawText, type) {
  if (!NIM_API_KEY) throw new Error('NIM_API_KEY is not configured.');

  // The model configured (google/gemma-2-2b-it) only supports up to 4096 tokens total.
  // We slice aggressively to ~9000 chars (~2500 tokens) to ensure the request succeeds.
  const text = rawText.length > 9000 ? rawText.slice(0, 9000) : rawText;

  let instruction = '';
  switch (type) {
    case 'full':
      instruction = `Analyze the transcript and provide a structured summary. Include an overview, key takeaways, and a conclusion.`;
      break;
    case 'last5mins':
      instruction = `Analyze this recently covered transcript segment. Provide recent context and highlight key actions or points.`;
      break;
    case 'topic':
      instruction = `Divide the transcript into main topics and explain each topic clearly.`;
      break;
    case 'exam':
      instruction = `Extract exam preparation material from the transcript. Include core concepts to memorize and a few flashcard Q&As.`;
      break;
    default:
      throw new Error('Invalid summary type');
  }

  const prompt = `${instruction}

Provide your response strictly as a JSON object with this exact structure:
{
  "sections": [
    { "title": "Section Title", "content": "Detailed content..." }
  ]
}

TRANSCRIPT:
"""
${text}
"""`;

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
      max_tokens: 1500,
    }),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const reason = extractApiError(data, 'NIM chat request failed.');
    throw new Error(`NIM summarization request failed (${res.status}): ${reason}`);
  }

  const answer = data?.choices?.[0]?.message?.content?.trim() || '';
  
  let parsed;
  try {
    const start = answer.indexOf('{');
    const end = answer.lastIndexOf('}');
    if (start !== -1 && end > start) {
      parsed = JSON.parse(answer.slice(start, end + 1));
    } else {
      parsed = JSON.parse(answer);
    }
  } catch (e) {
    throw new Error('Model response was not valid JSON');
  }

  if (!parsed.sections || !Array.isArray(parsed.sections)) {
    throw new Error('Invalid response: missing "sections" array');
  }

  return {
    sections: parsed.sections.map(s => ({
      title: String(s.title || '').trim(),
      content: String(s.content || '').trim()
    }))
  };
}
