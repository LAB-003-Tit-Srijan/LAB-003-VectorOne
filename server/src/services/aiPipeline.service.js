import { NIM_API_KEY, NIM_BASE_URL, GENERATION_MODEL } from '../config/env.js';
import { parseJsonSafe, extractApiError } from '../utils/http.js';
import { PipelineResult } from '../models/PipelineResult.model.js';
import { generateNotesFromTranscript } from './notes.service.js';

export async function processTranscriptPipeline(videoId, rawText) {
  try {
    console.log(`[ai-pipeline] Starting automated processing for ${videoId}...`);
    
    // Initialize or update pipeline status
    await PipelineResult.findOneAndUpdate(
      { videoId },
      { status: 'processing', updatedAt: new Date() },
      { upsert: true, new: true }
    );

    // Limit text length to avoid token limits for simultaneous large generations
    const text = rawText.length > 9000 ? rawText.slice(0, 9000) : rawText;

    // Run generations in parallel
    const [studyNotesDoc, flashcards, quizzes, revisionSummaries] = await Promise.all([
      generateNotesFromTranscript(videoId, text),
      runPipelineTask(text, 'flashcards'),
      runPipelineTask(text, 'quizzes'),
      runPipelineTask(text, 'revision_summaries'),
    ]);

    // Save final generated components to MongoDB
    await PipelineResult.findOneAndUpdate(
      { videoId },
      { 
        studyNotes: studyNotesDoc ? studyNotesDoc.sections : null, 
        flashcards, 
        quizzes, 
        revisionSummaries, 
        status: 'completed',
        updatedAt: new Date()
      }
    );

    console.log(`[ai-pipeline] Successfully finished and saved pipeline data for ${videoId}`);
  } catch (err) {
    console.error(`[ai-pipeline] Failed for ${videoId}:`, err.message);
    await PipelineResult.findOneAndUpdate(
      { videoId },
      { status: 'failed', updatedAt: new Date() }
    ).catch(() => {});
  }
}

async function runPipelineTask(text, type, retryCount = 0) {
  if (!NIM_API_KEY) throw new Error('NIM_API_KEY is not configured for pipeline.');

  let instruction = '';
  switch(type) {
    case 'flashcards':
      instruction = 'Create 5 distinct flashcards based on the transcript. Include the question and the detailed answer.';
      break;
    case 'quizzes':
      instruction = 'Create a 3-question multiple choice quiz based on this transcript. Provide the question, options, and correct answer.';
      break;
    case 'revision_summaries':
      instruction = 'Provide a brief, high-yield revision summary of the main points.';
      break;
  }

  const prompt = `${instruction}

Provide your response strictly as a JSON object with this exact structure:
{
  "data": [
    { "title": "Main topic, Flashcard question, or Quiz question", "content": "Detailed content, answer, or options..." }
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

  if (res.status === 429 && retryCount < 3) {
    const delay = Math.pow(2, retryCount) * 1500 + Math.random() * 500;
    console.warn(`[ai-pipeline] Rate limited for task ${type}. Retrying in ${Math.round(delay)}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return runPipelineTask(text, type, retryCount + 1);
  }

  if (!res.ok) {
    throw new Error(`Pipeline task '${type}' failed: ${extractApiError(data, 'NIM API Error')}`);
  }

  const answer = data?.choices?.[0]?.message?.content?.trim() || '';
  
  try {
    const start = answer.indexOf('{');
    const end = answer.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(answer.slice(start, end + 1));
    }
    return JSON.parse(answer);
  } catch(e) {
    console.error(`[ai-pipeline] JSON parsing failed for task ${type}`);
    return { error: 'Invalid JSON response from model', raw: answer };
  }
}
