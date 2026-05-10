import { processTranscriptPipeline } from '../services/aiPipeline.service.js';

/**
 * Triggers the automated AI processing pipeline for a given transcript.
 * This function should be called asynchronously (fire-and-forget) to avoid blocking the main thread.
 * 
 * @param {string} videoId 
 * @param {Array<{ text: string, start: number, duration: number }>} transcriptArray 
 */
export function handleTranscriptGenerated(videoId, transcriptArray) {
  if (!videoId || !Array.isArray(transcriptArray) || transcriptArray.length === 0) {
    console.warn('[transcript-processing] Invalid videoId or transcript data provided. Pipeline aborted.');
    return;
  }

  // Combine the text parts into a single raw transcript string
  const rawText = transcriptArray.map(t => t.text).join(' ');

  // Fire and forget the pipeline
  processTranscriptPipeline(videoId, rawText).catch(err => {
    console.error(`[transcript-processing] Uncaught error in pipeline execution:`, err);
  });
}
