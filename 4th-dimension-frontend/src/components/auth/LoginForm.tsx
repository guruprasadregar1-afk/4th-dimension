'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/AuthContext';
import { loginSchema, type LoginFormValues } from '@/lib/auth/schemas';

export function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await login(values.email, values.password);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Login failed',
      );
    }
  });

  const nextPath = searchParams.get('next');

  return (
    <div className="w-full max-w-md rounded-xl border border-surface-border bg-surface-raised p-6 shadow-lg">
      <h1 className="text-xl font-semibold text-foreground">Sign in</h1>
      <p className="mt-2 text-sm text-muted">
        Access your 4D scenes and imports.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-xs text-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-accent focus:ring-1"
            {...register('email')}
          />
          {errors.email ? (
            <p className="mt-1 text-xs text-hyperplane-x">{errors.email.message}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-xs text-muted">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-accent focus:ring-1"
            {...register('password')}
          />
          {errors.password ? (
            <p className="mt-1 text-xs text-hyperplane-x">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        {submitError ? (
          <p className="text-sm text-hyperplane-x">{submitError}</p>
        ) : null}

        {nextPath ? (
          <p className="text-xs text-muted">You will return to {nextPath} after login.</p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg border border-accent bg-accent/15 py-2.5 text-sm font-medium text-accent transition hover:bg-accent/25 disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        No account?{' '}
        <Link href="/register" className="text-accent hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
