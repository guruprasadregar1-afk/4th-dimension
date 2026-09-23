import type { Metadata } from 'next';
import Link from 'next/link';
import { DashboardStats } from '@/components/dashboard/DashboardStats';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DashboardPage() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Overview of your 4D scenes and quick navigation.
        </p>
      </div>
      <DashboardStats />
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/escape"
          className="group relative overflow-hidden rounded-xl border border-accent/40 bg-gradient-to-br from-accent/15 via-surface-raised to-surface-raised p-4 transition hover:border-accent hover:shadow-lg hover:shadow-accent/5"
        >
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              Start Here
            </span>
          </div>
          <h2 className="mt-2 text-sm font-semibold text-foreground group-hover:text-accent">
            🎮 The Impossible Escape
          </h2>
          <p className="mt-1 text-xs text-muted">
            Interactive puzzle: fail in 2D & 3D, escape using the 4th dimension!
          </p>
        </Link>
        <Link
          href="/scenes"
          className="rounded-xl border border-surface-border bg-surface-raised p-4 transition hover:border-accent/40"
        >
          <h2 className="text-sm font-medium text-foreground">Scene Library</h2>
          <p className="mt-1 text-xs text-muted">
            Search, filter, and export scenes
          </p>
        </Link>
        <Link
          href="/viewer"
          className="rounded-xl border border-surface-border bg-surface-raised p-4 transition hover:border-accent/40"
        >
          <h2 className="text-sm font-medium text-foreground">4D Viewer</h2>
          <p className="mt-1 text-xs text-muted">
            Render Gaussians with time and hyperplane controls
          </p>
        </Link>
      </div>
    </div>
  );
}
