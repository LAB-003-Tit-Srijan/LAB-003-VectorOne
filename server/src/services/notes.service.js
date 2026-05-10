import { NIM_API_KEY, NIM_BASE_URL, GENERATION_MODEL } from '../config/env.js';
import { parseJsonSafe, extractApiError } from '../utils/http.js';
import { NotesModel } from '../models/Notes.model.js';

export async function generateNotesFromTranscript(videoId, rawText, retryCount = 0) {
    if (!NIM_API_KEY) throw new Error('NIM_API_KEY is not configured.');

    // Limit text length to avoid token limits
    const text = rawText.length > 9000 ? rawText.slice(0, 9000) : rawText;

    const prompt = `Generate structured revision-friendly notes from this transcript.
Include topic headings, bullet points, key concepts, exam-focused explanations, and formulas if applicable.
Notes should be concise, avoid unnecessary paragraphs, and be optimized for quick revision.

Provide your response strictly as a JSON object with this exact structure:
{
  "sections": [
    {
      "title": "Topic Heading",
      "content": "Bulleted points or concise explanation...",
      "keyConcepts": ["Concept 1", "Concept 2"],
      "formulas": ["Formula 1", "Formula 2"]
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
            temperature: 0.2,
            max_tokens: 2000,
        }),
    });

    const data = await parseJsonSafe(res);

    if (res.status === 429 && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1500 + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
        return generateNotesFromTranscript(videoId, rawText, retryCount + 1);
    }

    if (!res.ok) {
        throw new Error(`Notes generation failed: ${extractApiError(data, 'NIM API Error')}`);
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
    } catch(e) {
        throw new Error('Invalid JSON response from model');
    }

    if (!parsed.sections || !Array.isArray(parsed.sections)) {
        throw new Error('Invalid response structure: missing "sections" array');
    }

    const savedNotes = await NotesModel.findOneAndUpdate(
        { videoId },
        { sections: parsed.sections, updatedAt: new Date() },
        { upsert: true, new: true }
    );

    return savedNotes;
}

export async function getNotes(videoId) {
    return NotesModel.findOne({ videoId });
}
