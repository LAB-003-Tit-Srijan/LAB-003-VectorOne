import { useState, type CSSProperties } from 'react';
import { Link, NavLink, useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  BookMarked,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Moon,
  PlayCircle,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { useLMS } from '../context/LMSContext';
import { useAuth } from '../context/AuthContext';

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
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200',
    active ? 'font-medium' : 'font-normal',
  ].join(' ');
}

function navStyle(active: boolean): CSSProperties {
  if (active) {
    return {
      color: 'var(--text-main)',
      background: 'color-mix(in srgb, var(--text-main) 6%, transparent)',
    };
  }
  return { color: 'var(--text-muted)' };
}

export function AppLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useLMS();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ color: 'var(--text-main)' }}>
      <div className="flex min-h-screen">
        <aside
          className="hidden lg:flex w-[220px] shrink-0 flex-col border-r py-6 px-3 gap-8 sticky top-0 h-screen"
          style={{
            borderColor: 'var(--surface-border)',
            background: 'var(--surface-bg)',
          }}
        >
          <NavLink to="/dashboard" className="flex items-center gap-2.5 px-2 min-w-0">
            <div className="w-9 h-9 rounded-lg premium-button flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm font-['Manrope'] tracking-tight truncate">
              Learn<span className="text-gradient">AI</span>
            </span>
          </NavLink>

          <nav className="flex flex-col gap-0.5 flex-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => navClass(isActive)}
                style={({ isActive }) => navStyle(isActive)}
              >
                <Icon className="w-4 h-4 shrink-0 opacity-80" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--surface-border)' }}>
            {user && (
              <div className="px-3 py-2 rounded-lg text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                {user.email}
              </div>
            )}
            <Link
              to="/"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            <button
              type="button"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:opacity-80 text-left"
              style={{ color: 'var(--text-muted)' }}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header
            className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-3 border-b backdrop-blur-md"
            style={{
              borderColor: 'var(--surface-border)',
              background: theme === 'dark' ? 'rgba(15,23,42,0.88)' : 'rgba(255,252,248,0.92)',
            }}
          >
            <NavLink to="/dashboard" className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg premium-button flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm font-['Manrope'] truncate">
                Learn<span className="text-gradient">AI</span>
              </span>
            </NavLink>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="w-10 h-10 rounded-lg flex items-center justify-center border"
              style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </header>

          <main className="flex-1 px-4 py-8 md:px-8 md:py-10 max-w-[1600px] w-full mx-auto">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="min-h-[50vh]"
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
              className="absolute inset-0 bg-black/40"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="absolute right-0 top-0 h-full w-[min(100vw-2.5rem,280px)] border-l flex flex-col py-5 px-3 gap-4 shadow-xl"
              style={{
                borderColor: 'var(--surface-border)',
                background: 'var(--surface-bg)',
              }}
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            >
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Menu
                </span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-0.5">
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
                  className={`${navClass(false)} w-full text-left`}
                  style={navStyle(false)}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
                  Theme
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    void logout();
                  }}
                  className={`${navClass(false)} w-full text-left`}
                  style={navStyle(false)}
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  Sign out
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
