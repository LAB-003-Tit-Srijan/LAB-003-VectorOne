/**
 * modePromptBuilder.js
 * Generates specific system instructions based on the selected learning mode.
 */

export const LEARNING_MODES = {
  BEGINNER: 'beginner',
  EXAM_PREP: 'exam-prep',
  INTERVIEW: 'interview',
  FAST_RECAP: 'fast-recap'
};

export function getModeInstructions(mode) {
  switch (mode) {
    case LEARNING_MODES.BEGINNER:
      return `
MODE: BEGINNER
- Use simple language and avoid technical jargon where possible.
- Use relatable analogies to explain complex concepts.
- Provide step-by-step explanations.
- Be encouraging and patient in your tone.
`;
    case LEARNING_MODES.EXAM_PREP:
      return `
MODE: EXAM PREP
- Focus on high-yield information likely to appear in exams.
- Provide concise notes, definitions, and formulas.
- Highlight "important concepts" clearly.
- Structure answers to be easily memorizable (bullet points, clear headings).
`;
    case LEARNING_MODES.INTERVIEW:
      return `
MODE: INTERVIEW
- Provide deep conceptual explanations that demonstrate technical mastery.
- Focus on practical applications and "real-world" scenarios.
- Anticipate and suggest 1-2 relevant follow-up questions at the end.
- Use professional, precise terminology.
`;
    case LEARNING_MODES.FAST_RECAP:
      return `
MODE: FAST RECAP
- Be ultra-concise.
- Use short bullet points only.
- Focus exclusively on the most critical key points.
- No conversational filler or long introductions.
`;
    default:
      return `
MODE: STANDARD
- Provide a balanced, accurate answer based on the provided context.
- Be helpful and professional.
`;
  }
}
