import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { apiUrl } from '../lib/apiBase';

const ACCESS_KEY = 'lms_access_token';
const REFRESH_KEY = 'lms_refresh_token';
const USER_KEY = 'lms_user_cache';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  initializing: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  loginWithGoogleCredential: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  authFetch: (input: string | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  const head = text.trimStart().toLowerCase();
  if (head.startsWith('<!doctype') || head.startsWith('<html')) return {};
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  });
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem(ACCESS_KEY)
  );
  const refreshTokenRef = useRef<string | null>(localStorage.getItem(REFRESH_KEY));
  const [initializing, setInitializing] = useState(true);

  const persistTokens = useCallback((access: string | null, refresh: string | null) => {
    setAccessToken(access);
    refreshTokenRef.current = refresh;
    if (access) localStorage.setItem(ACCESS_KEY, access);
    else localStorage.removeItem(ACCESS_KEY);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    else localStorage.removeItem(REFRESH_KEY);
  }, []);

  const persistUser = useCallback((u: AuthUser | null) => {
    setUser(u);
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const rt = refreshTokenRef.current;
    if (!rt) return false;
    try {
      const res = await fetch(apiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      const data = await parseJson(res);
      if (!res.ok) return false;
      const at = data.accessToken as string | undefined;
      const newRt = data.refreshToken as string | undefined;
      if (!at || !newRt) return false;
      persistTokens(at, newRt);
      return true;
    } catch {
      return false;
    }
  }, [persistTokens]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const at = localStorage.getItem(ACCESS_KEY);
      refreshTokenRef.current = localStorage.getItem(REFRESH_KEY);

      if (!at) {
        if (!cancelled) setInitializing(false);
        return;
      }

      try {
        const res = await fetch(apiUrl('/api/auth/me'), {
          headers: { Authorization: `Bearer ${at}` },
        });
        if (res.ok) {
          const data = await parseJson(res);
          const u = data.user as AuthUser | undefined;
          if (u && !cancelled) persistUser(u);
        } else if (res.status === 401) {
          const ok = await refreshSession();
          if (ok && !cancelled) {
            const nextAt = localStorage.getItem(ACCESS_KEY);
            const res2 = await fetch(apiUrl('/api/auth/me'), {
              headers: { Authorization: `Bearer ${nextAt}` },
            });
            if (res2.ok) {
              const data = await parseJson(res2);
              const u = data.user as AuthUser | undefined;
              if (u) persistUser(u);
            } else {
              persistTokens(null, null);
              persistUser(null);
            }
          } else if (!cancelled) {
            persistTokens(null, null);
            persistUser(null);
          }
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [persistUser, persistTokens, refreshSession]);

  const authFetch = useCallback(
    async (input: string | URL, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      const token = accessToken ?? localStorage.getItem(ACCESS_KEY);
      if (token) headers.set('Authorization', `Bearer ${token}`);

      const url = typeof input === 'string' ? apiUrl(input) : input;
      let res = await fetch(url, { ...init, headers });

      if (res.status === 401) {
        const refreshed = await refreshSession();
        if (refreshed) {
          const next = localStorage.getItem(ACCESS_KEY);
          const h2 = new Headers(init.headers);
          if (next) h2.set('Authorization', `Bearer ${next}`);
          res = await fetch(url, { ...init, headers: h2 });
        }
      }

      return res;
    },
    [accessToken, refreshSession]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await parseJson(res);
      if (!res.ok) throw new Error((data.error as string) ?? 'Login failed');
      persistTokens(data.accessToken as string, data.refreshToken as string);
      persistUser(data.user as AuthUser);
    },
    [persistTokens, persistUser]
  );

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await parseJson(res);
      if (!res.ok) throw new Error((data.error as string) ?? 'Signup failed');
      persistTokens(data.accessToken as string, data.refreshToken as string);
      persistUser(data.user as AuthUser);
    },
    [persistTokens, persistUser]
  );

  const loginWithGoogleCredential = useCallback(
    async (credential: string) => {
      const res = await fetch(apiUrl('/api/auth/google'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await parseJson(res);
      if (!res.ok) throw new Error((data.error as string) ?? 'Google sign-in failed');
      persistTokens(data.accessToken as string, data.refreshToken as string);
      persistUser(data.user as AuthUser);
    },
    [persistTokens, persistUser]
  );

  const logout = useCallback(async () => {
    const token = accessToken ?? localStorage.getItem(ACCESS_KEY);
    try {
      if (token) {
        await fetch(apiUrl('/api/auth/logout'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      /* offline */
    }
    persistTokens(null, null);
    persistUser(null);
  }, [accessToken, persistTokens, persistUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      accessToken,
      login,
      register,
      loginWithGoogleCredential,
      logout,
      authFetch,
    }),
    [
      user,
      initializing,
      accessToken,
      login,
      register,
      loginWithGoogleCredential,
      logout,
      authFetch,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
