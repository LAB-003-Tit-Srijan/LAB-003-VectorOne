import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

export function LoginPage() {
  const { login, loginWithGoogleCredential, user, initializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!initializing && user) {
      navigate(from, { replace: true });
    }
  }, [initializing, user, navigate, from]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = useCallback(
    async (credential: string) => {
      setError(null);
      setBusy(true);
      try {
        await loginWithGoogleCredential(credential);
        navigate(from, { replace: true });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Google sign-in failed');
      } finally {
        setBusy(false);
      }
    },
    [from, loginWithGoogleCredential, navigate]
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12" style={{ color: 'var(--text-main)' }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px] space-y-8"
      >
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 justify-center font-semibold font-['Manrope']">
            <span className="w-9 h-9 rounded-lg premium-button flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </span>
            Learn<span className="text-gradient">AI</span>
          </Link>
          <h1 className="text-xl font-semibold pt-2">Sign in</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Continue to your workspace.
          </p>
        </div>

        <div
          className="rounded-2xl border p-6 space-y-5 shadow-sm"
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}
        >
          <GoogleSignInButton onCredential={onGoogle} />

          <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            <span className="h-px flex-1 bg-current opacity-20" />
            or email
            <span className="h-px flex-1 bg-current opacity-20" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none bg-transparent"
                style={{ borderColor: 'var(--surface-border)' }}
              />
            </div>
            <div>
              <label htmlFor="login-password" className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none bg-transparent"
                style={{ borderColor: 'var(--surface-border)' }}
              />
            </div>

            {error && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-xl text-sm font-semibold premium-button text-white disabled:opacity-50"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No account?{' '}
            <Link to="/signup" className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
