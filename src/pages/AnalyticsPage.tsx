import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { LearningInsights } from '../components/LearningInsights';
import { useLMS } from '../context/LMSContext';

export function AnalyticsPage() {
  const { insights, learningDataLoading, learningDataError, videoId } = useLMS();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-xs font-medium mb-3 hover:text-indigo-400 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold font-['Manrope'] tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-cyan-400" />
            Analytics
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Confusion heatmap, replay density, retention, and concept frequency — tied to your active lecture.
          </p>
        </div>
        {!videoId && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border px-4 py-3 text-sm"
            style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}
          >
            <Link to="/learn" className="font-semibold text-indigo-400 hover:underline">
              Load a lecture
            </Link>{' '}
            to populate analytics for this session.
          </motion.div>
        )}
      </div>

      <div className="min-h-[640px]">
        <LearningInsights insights={insights} isLoading={learningDataLoading} error={learningDataError} />
      </div>
    </div>
  );
}
