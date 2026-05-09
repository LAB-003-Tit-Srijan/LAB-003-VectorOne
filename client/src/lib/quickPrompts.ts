/** Short prompts for dashboard → Learn (queued into AI chat). */

export function dashboardQuickPrompts(learningMode: string): { id: string; label: string; prompt: string }[] {
  return [
    {
      id: 'quiz',
      label: 'Quiz',
      prompt: `Study mode: ${learningMode}. Generate 5 quiz questions about this lecture only, with brief answers.`,
    },
    {
      id: 'notes',
      label: 'Notes',
      prompt: `Study mode: ${learningMode}. Create structured study notes: key ideas, definitions, and a recap section. Lecture only.`,
    },
    {
      id: 'summarize',
      label: 'Summary',
      prompt: `Study mode: ${learningMode}. Summarize the full lecture in clear sections. Lecture only.`,
    },
    {
      id: 'simpler',
      label: 'Simpler',
      prompt: `Study mode: ${learningMode}. Explain the main ideas in simpler language with one analogy. Lecture only.`,
    },
    {
      id: 'interview',
      label: 'Interview',
      prompt: `Study mode: ${learningMode}. List 5 interview questions this lecture helps with, with concise grounded answers.`,
    },
  ];
}
