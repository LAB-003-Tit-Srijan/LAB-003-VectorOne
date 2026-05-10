import { NIM_API_KEY, NIM_BASE_URL, GENERATION_MODEL } from '../config/env.js';
import { parseJsonSafe, extractApiError } from '../utils/http.js';
import { QuizModel } from '../models/Quiz.model.js';

/**
 * Generates 8 MCQ quiz questions from a raw transcript string and
 * upserts them into MongoDB.
 *
 * Each question has:
 *   question      – the question stem
 *   options       – exactly 4 answer choices (A–D)
 *   correctIndex  – 0-based index of the correct option
 *   explanation   – 1–2 sentence rationale for the correct answer
 *   difficulty    – 'easy' | 'medium' | 'hard'
 *   topic         – short topic/category label
 *
 * Mirrors the retry + JSON-extraction pattern from flashcards.service.js.
 */
export async function generateQuizFromTranscript(videoId, rawText, retryCount = 0) {
    if (!NIM_API_KEY) throw new Error('NIM_API_KEY is not configured.');

    const text = rawText.length > 9000 ? rawText.slice(0, 9000) : rawText;

    const prompt = `You are an expert educator creating a multiple-choice quiz from the lecture transcript below.

Generate exactly 8 quiz questions. For each question follow ALL of these rules:
- Ground every question strictly in the transcript — no external knowledge.
- Provide exactly 4 answer options (index 0–3). Only one is correct.
- Include a 1–2 sentence explanation of why the correct answer is right.
- Tag each question with a short topic label (e.g. "Kinematics", "Cell Biology", "SQL Joins").
- Vary difficulty: at least 2 easy, 4 medium, 2 hard.

Respond ONLY with a single valid JSON object — no markdown fences, no extra text:
{
  "questions": [
    {
      "question": "Question stem here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why option A is correct …",
      "difficulty": "easy",
      "topic": "Topic Label"
    }
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
            temperature: 0.3,
            max_tokens: 3000,
        }),
    });

    const data = await parseJsonSafe(res);

    // Exponential back-off on rate limiting (max 3 retries)
    if (res.status === 429 && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1500 + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
        return generateQuizFromTranscript(videoId, rawText, retryCount + 1);
    }

    if (!res.ok) {
        throw new Error(
            `Quiz generation failed: ${extractApiError(data, 'NIM API Error')}`
        );
    }

    const raw = data?.choices?.[0]?.message?.content?.trim() || '';

    // Extract JSON robustly — strip markdown fences if the model disobeyed
    let parsed;
    try {
        const start = raw.indexOf('{');
        const end   = raw.lastIndexOf('}');
        if (start !== -1 && end > start) {
            parsed = JSON.parse(raw.slice(start, end + 1));
        } else {
            parsed = JSON.parse(raw);
        }
    } catch {
        throw new Error('Quiz model returned invalid JSON.');
    }

    if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
        throw new Error('Quiz response missing "questions" array.');
    }

    const VALID_DIFF = new Set(['easy', 'medium', 'hard']);

    const questions = parsed.questions
        .map(q => ({
            question:     String(q.question    ?? '').trim(),
            options:      Array.isArray(q.options)
                            ? q.options.slice(0, 4).map(o => String(o).trim())
                            : [],
            correctIndex: typeof q.correctIndex === 'number'
                            ? Math.max(0, Math.min(3, Math.round(q.correctIndex)))
                            : 0,
            explanation:  String(q.explanation ?? '').trim(),
            difficulty:   VALID_DIFF.has(q.difficulty) ? q.difficulty : 'medium',
            topic:        String(q.topic ?? '').trim(),
        }))
        // Must have a valid question stem and at least 2 options
        .filter(q => q.question && q.options.length >= 2);

    const saved = await QuizModel.findOneAndUpdate(
        { videoId },
        { questions, updatedAt: new Date() },
        { upsert: true, new: true }
    );

    return saved;
}

export async function getQuiz(videoId) {
    return QuizModel.findOne({ videoId });
}
