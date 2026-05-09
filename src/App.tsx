import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Sentry } from './instrument';
import { LMSProvider } from './context/LMSContext';
import { AppLayout } from './layouts/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { LearnPage } from './pages/LearnPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { RevisionPage } from './pages/RevisionPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { SettingsPage } from './pages/SettingsPage';

function AppRoutes() {
  return (
    <BrowserRouter>
      <LMSProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/learn" element={<LearnPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/revision" element={<RevisionPage />} />
            <Route path="/roadmap" element={<RoadmapPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </LMSProvider>
    </BrowserRouter>
  );
}

function ErrorFallback() {
  return (
    <div
      className="min-h-[50vh] flex flex-col items-center justify-center px-6 text-center"
      style={{ color: 'var(--text-main)' }}
    >
      <p className="text-sm font-medium mb-1">Something went wrong</p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Refresh the page or try again in a moment.
      </p>
    </div>
  );
}

export default function App() {
  if (import.meta.env.VITE_SENTRY_DSN) {
    return (
      <Sentry.ErrorBoundary fallback={<ErrorFallback />} showDialog={false}>
        <AppRoutes />
      </Sentry.ErrorBoundary>
    );
  }
  return <AppRoutes />;
}
