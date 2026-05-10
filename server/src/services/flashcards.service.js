import { NIM_API_KEY, NIM_BASE_URL, GENERATION_MODEL } from '../config/env.js';
import { parseJsonSafe, extractApiError } from '../utils/http.js';
import { FlashcardModel } from '../models/Flashcard.model.js';

/**
 * Generates 10 structured flashcards from a raw transcript string and
 * persists/upserts them into MongoDB. Each card has:
 *   { question, answer, difficulty: 'easy'|'medium'|'hard' }
 *
 * Mirrors the retry + JSON-extraction pattern from notes.service.js.
 */
export async function generateFlashcardsFromTranscript(videoId, rawText, retryCount = 0) {
    if (!NIM_API_KEY) throw new Error('NIM_API_KEY is not configured.');

    // Cap transcript to avoid token-limit errors (same ceiling as notes)
    const text = rawText.length > 9000 ? rawText.slice(0, 9000) : rawText;

    const prompt = `You are an expert educator. Create exactly 10 flashcards for spaced-repetition study from the lecture transcript below.

Rules:
- Each flashcard must be directly grounded in the transcript.
- Vary difficulty: at least 3 easy, 4 medium, 3 hard cards.
- Questions should be clear and testable (definitions, comparisons, applications).
- Answers should be concise (1–3 sentences max).
- Do NOT include questions about the video or speaker identity.

Respond ONLY with a valid JSON object in this exact schema (no markdown fences, no explanation):
{
  "cards": [
    {
      "question": "Question text here",
      "answer": "Answer text here",
      "difficulty": "easy"
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
            max_tokens: 2500,
        }),
    });

    const data = await parseJsonSafe(res);

    // Exponential back-off on rate limiting (max 3 retries)
    if (res.status === 429 && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1500 + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
        return generateFlashcardsFromTranscript(videoId, rawText, retryCount + 1);
    }

    if (!res.ok) {
        throw new Error(
            `Flashcard generation failed: ${extractApiError(data, 'NIM API Error')}`
        );
    }

    const answer = data?.choices?.[0]?.message?.content?.trim() || '';

    // Extract JSON robustly — strip markdown fences if the model disobeyed
    let parsed;
    try {
        const start = answer.indexOf('{');
        const end   = answer.lastIndexOf('}');
        if (start !== -1 && end > start) {
            parsed = JSON.parse(answer.slice(start, end + 1));
        } else {
            parsed = JSON.parse(answer);
        }
    } catch {
        throw new Error('Flashcard model returned invalid JSON.');
    }

    if (!Array.isArray(parsed?.cards) || parsed.cards.length === 0) {
        throw new Error('Flashcard response missing "cards" array.');
    }

    // Sanitise each card — coerce difficulty to the allowed enum values
    const VALID_DIFF = new Set(['easy', 'medium', 'hard']);
    const cards = parsed.cards.map((c) => ({
        question:   String(c.question  ?? '').trim(),
        answer:     String(c.answer    ?? '').trim(),
        difficulty: VALID_DIFF.has(c.difficulty) ? c.difficulty : 'medium',
    })).filter(c => c.question && c.answer);

    const saved = await FlashcardModel.findOneAndUpdate(
        { videoId },
        { cards, updatedAt: new Date() },
        { upsert: true, new: true }
    );

    return saved;
}

export async function getFlashcards(videoId) {
    return FlashcardModel.findOne({ videoId });
}
