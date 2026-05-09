export interface AiPreferences {
  responseStyle: 'concise' | 'balanced' | 'thorough';
  citeTimestamps: boolean;
  showSourceHints: boolean;
}

export const DEFAULT_AI_PREFERENCES: AiPreferences = {
  responseStyle: 'balanced',
  citeTimestamps: true,
  showSourceHints: true,
};
