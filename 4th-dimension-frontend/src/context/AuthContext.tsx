'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { clientFetch } from '@/lib/client-fetch';

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function readSession(): Promise<AuthUser | null> {
  const response = await clientFetch('/api/auth/session', {
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { user: AuthUser | null };
  return body.user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const sessionUser = await readSession();
    setUser(sessionUser);
  }, []);

  useEffect(() => {
    void refreshSession().finally(() => setIsLoading(false));
  }, [refreshSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await clientFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const body = (await response.json()) as {
        user?: AuthUser;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          typeof body.error === 'string' ? body.error : 'Login failed',
        );
      }

      setUser(body.user ?? null);
      router.push('/dashboard');
      router.refresh();
    },
    [router],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const response = await clientFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, confirmPassword: password }),
      });

      const body = (await response.json()) as {
        user?: AuthUser;
        error?: string | Record<string, string[]>;
      };

      if (!response.ok) {
        if (typeof body.error === 'string') {
          throw new Error(body.error);
        }
        throw new Error('Registration failed');
      }

      setUser(body.user ?? null);
      router.push('/dashboard');
      router.refresh();
    },
    [router],
  );

  const logout = useCallback(async () => {
    await clientFetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
      refreshSession,
    }),
    [user, isLoading, login, register, logout, refreshSession],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
