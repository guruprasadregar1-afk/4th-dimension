'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { APP_NAME } from '@/lib/config';

export function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-surface-border bg-surface-raised px-4 lg:px-6">
      <Link href={isAuthenticated ? '/dashboard' : '/login'} className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-hyperplane-x shadow-glow-x" />
        <span className="text-sm font-semibold tracking-wide text-foreground">
          {APP_NAME}
        </span>
      </Link>

      <nav className="flex items-center gap-3 text-sm">
        <Link
          href="/escape"
          className="rounded-md px-3 py-1.5 text-xs font-semibold text-accent border border-accent/30 bg-accent/10 transition hover:bg-accent/20"
        >
          🎮 4D Puzzle
        </Link>
        {isLoading ? (
          <span className="text-xs text-muted">Loading session…</span>
        ) : isAuthenticated ? (
          <>
            <Link
              href="/dashboard"
              className="rounded-md border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-accent hover:bg-surface-raised"
            >
              Dashboard
            </Link>
            <span className="hidden text-muted sm:inline">{user?.email}</span>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-md border border-surface-border bg-surface px-3 py-1.5 text-foreground transition hover:border-accent hover:bg-surface-raised"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-muted transition hover:text-foreground"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-accent transition hover:bg-accent/20"
            >
              Register
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
