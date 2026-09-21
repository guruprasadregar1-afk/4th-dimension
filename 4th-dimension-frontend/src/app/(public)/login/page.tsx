import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Login',
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md rounded-xl border border-surface-border bg-surface-raised p-6 text-sm text-muted">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
