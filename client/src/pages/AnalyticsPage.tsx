import { LearningInsights } from '../components/LearningInsights';
import { useLMS } from '../context/LMSContext';

export function AnalyticsPage() {
  const { insights, learningDataLoading, learningDataError, videoId } = useLMS();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold font-['Manrope'] tracking-tight">Analytics</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Replay density, confusion, retention — for your active lecture session.
        </p>
      </header>

      {!videoId && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Load a lecture from the dashboard or Learn to populate charts.
        </p>
      )}

      <div className="min-h-[560px]">
        <LearningInsights insights={insights} isLoading={learningDataLoading} error={learningDataError} />
      </div>
    </div>
  );
}
