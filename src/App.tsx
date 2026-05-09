import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LMSProvider } from './context/LMSContext';
import { AppLayout } from './layouts/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { LearnPage } from './pages/LearnPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { RevisionPage } from './pages/RevisionPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
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
