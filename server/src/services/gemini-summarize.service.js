import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_SUMMARIZE_MAX_INPUT_CHARS,
} from '../config/env.js';

const SYSTEM_INSTRUCTION = `You transform study material into structured learning aids.
Always reply with ONLY valid JSON — no markdown fences, no commentary before or after the JSON object.`;

/**
 * Attempt to parse model output as JSON; tolerate accidental markdown wrappers.
 * @param {string} raw
 */
export function parseModelJson(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) throw new Error('Empty model response');

  try {
    return JSON.parse(trimmed);
  } catch {
    /* ignore */
  }

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* ignore */
    }
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }

  throw new Error('Model response was not valid JSON');
}

/**
 * @param {string} rawText
 * @returns {Promise<{
 *   summary: string,
 *   importantPoints: string[],
 *   simplifiedExplanation: string,
 *   quizQuestions: Array<{ question: string; answer: string }>
 * }>}
 */
export async function summarizeStudyMaterial(rawText) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const text =
    rawText.length > GEMINI_SUMMARIZE_MAX_INPUT_CHARS
      ? rawText.slice(0, GEMINI_SUMMARIZE_MAX_INPUT_CHARS)
      : rawText;

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.35,
      responseMimeType: 'application/json',
    },
  });

  const prompt = `Analyze the following study material and produce a JSON object with EXACTLY these keys:

1. "summary" — string: a concise summary (2–4 sentences).
2. "importantPoints" — array of strings: 5–10 key takeaways (short phrases or single sentences each).
3. "simplifiedExplanation" — string: explain the core ideas in simple language for someone new to the topic.
4. "quizQuestions" — array of exactly 5 objects, each with "question" (string) and "answer" (string). Answers should be brief but correct based only on the material.

STUDY MATERIAL:
"""
${text}
"""`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const outText = response.text();
  const parsed = parseModelJson(outText);

  if (typeof parsed.summary !== 'string') {
    throw new Error('Invalid response: missing string "summary"');
  }
  if (!Array.isArray(parsed.importantPoints)) {
    throw new Error('Invalid response: "importantPoints" must be an array');
  }
  if (typeof parsed.simplifiedExplanation !== 'string') {
    throw new Error('Invalid response: missing string "simplifiedExplanation"');
  }
  if (!Array.isArray(parsed.quizQuestions) || parsed.quizQuestions.length < 5) {
    throw new Error('Invalid response: "quizQuestions" must contain at least 5 items');
  }

  const quizQuestions = parsed.quizQuestions.slice(0, 5);

  for (const q of quizQuestions) {
    if (!q || typeof q.question !== 'string' || typeof q.answer !== 'string') {
      throw new Error('Invalid response: each quiz item needs question and answer strings');
    }
  }

  return {
    summary: parsed.summary.trim(),
    importantPoints: parsed.importantPoints.map((p) => String(p).trim()).filter(Boolean),
    simplifiedExplanation: parsed.simplifiedExplanation.trim(),
    quizQuestions: quizQuestions.map((q) => ({
      question: q.question.trim(),
      answer: q.answer.trim(),
    })),
  };
}
