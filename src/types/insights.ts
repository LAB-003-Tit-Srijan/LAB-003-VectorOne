export interface InsightsResponse {
  weakTopics: Array<{ topic: string; mentions: number; struggleRate: number }>;
  replayHotspots: Array<{ timestamp: number; count: number }>;
  confusionHeatmap: Array<{ timestamp: number; intensity: number }>;
  mostAskedConcepts: Array<{ concept: string; mentions: number; struggleRate: number }>;
  summary: {
    totalQuestions: number;
    repeatedQuestions: number;
    confusionSignals: number;
    fallbackAnswers: number;
    quizMistakes: number;
    confusionLevel: 'Low' | 'Medium' | 'High';
    confusionScore: number;
    retentionScore: number;
    fallbackRate: number;
  };
  learningPatterns: {
    frequentlyRevisitedTopics: string[];
    replayedSegments: number[];
  };
}

export interface TimelineItem {
  type: 'question' | 'replay';
  label: string;
  at: number;
  second?: number;
}
