import { useState, type CSSProperties } from 'react';
import { Link, NavLink, useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  BookMarked,
  GraduationCap,
  Home,
  LayoutDashboard,
  Map,
  Menu,
  Moon,
  PlayCircle,
  Settings,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { useLMS } from '../context/LMSContext';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/learn', label: 'Learn', icon: PlayCircle },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/revision', label: 'Revision', icon: BookMarked },
  { to: '/roadmap', label: 'Roadmap', icon: Map },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

function navClass(active: boolean) {
  return [
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
    active
      ? 'text-white shadow-lg shadow-indigo-500/15'
      : 'hover:bg-white/5',
  ].join(' ');
}

function navStyle(active: boolean): CSSProperties {
  return active
    ? {
        background: 'linear-gradient(105deg, rgba(99,102,241,0.35), rgba(6,182,212,0.22))',
        border: '1px solid rgba(99,102,241,0.35)',
      }
    : { color: 'var(--text-muted)' };
}

export function AppLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useLMS();

  return (
    <div
      className="min-h-screen overflow-x-hidden selection:bg-indigo-500/20"
      style={{ color: 'var(--text-main)' }}
    >
      <div className="flex min-h-screen">
        <aside
          className="hidden lg:flex w-[260px] shrink-0 flex-col border-r p-4 gap-6 sticky top-0 h-screen"
          style={{
            borderColor: 'var(--surface-border)',
            background: 'var(--surface-muted)',
          }}
        >
          <NavLink to="/dashboard" className="flex items-center gap-3 px-1 min-w-0">
            <div className="w-10 h-10 rounded-xl premium-button flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm font-['Manrope'] tracking-tight truncate">
                Learn<span className="text-gradient">AI</span>
              </div>
              <div className="text-[10px] flex items-center gap-1 truncate" style={{ color: 'var(--text-muted)' }}>
                <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                Learning cloud
              </div>
            </div>
          </NavLink>

          <nav className="flex flex-col gap-1 flex-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => navClass(isActive)} style={({ isActive }) => navStyle(isActive)}>
                <Icon className="w-4 h-4 shrink-0 opacity-90" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="space-y-2">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5"
              style={{ color: 'var(--text-muted)' }}
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            <button
              type="button"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium border transition-colors hover:bg-white/5"
              style={{ borderColor: 'var(--surface-border)', color: 'var(--text-muted)' }}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              Theme
            </button>
            <div
              className="rounded-2xl p-3 text-[11px] border"
              style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}
            >
              <div className="font-semibold mb-1" style={{ color: 'var(--text-main)' }}>
                Session
              </div>
              <p style={{ color: 'var(--text-muted)' }}>Insights sync every few seconds while you study.</p>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header
            className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-3 border-b backdrop-blur-md"
            style={{
              borderColor: 'var(--surface-border)',
              background: theme === 'dark' ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)',
            }}
          >
            <NavLink to="/dashboard" className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-lg premium-button flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm font-['Manrope'] truncate">
                Learn<span className="text-gradient">AI</span>
              </span>
            </NavLink>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1720px] w-full mx-auto">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="min-h-[60vh]"
              >
                {outlet}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 z-[120]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="absolute right-0 top-0 h-full w-[min(100vw-3rem,320px)] border-l flex flex-col p-4 gap-4 shadow-2xl"
              style={{
                borderColor: 'var(--surface-border)',
                background: 'var(--surface-bg)',
              }}
              initial={{ x: 48, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 48, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Navigate</span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center border"
                  style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className={navClass(false)}
                  style={navStyle(false)}
                >
                  <Home className="w-4 h-4 shrink-0" />
                  Home
                </Link>
                <button
                  type="button"
                  onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                  className={navClass(false)}
                  style={navStyle(false)}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
                  Theme
                </button>
                {nav.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => navClass(isActive)}
                    style={({ isActive }) => navStyle(isActive)}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </nav>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
