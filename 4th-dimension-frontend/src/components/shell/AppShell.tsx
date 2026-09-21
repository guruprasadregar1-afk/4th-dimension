'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isLoading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <Sidebar />
        <main className="flex min-h-0 flex-1 flex-col overflow-auto p-4 lg:p-6">
          {isLoading ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <LoadingSpinner label="Initializing session…" />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
