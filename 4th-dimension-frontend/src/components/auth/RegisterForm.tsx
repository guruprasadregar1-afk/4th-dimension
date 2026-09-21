'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/AuthContext';
import { registerSchema, type RegisterFormValues } from '@/lib/auth/schemas';

export function RegisterForm() {
  const { register: registerUser } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await registerUser(values.email, values.password);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Registration failed',
      );
    }
  });

  return (
    <div className="w-full max-w-md rounded-xl border border-surface-border bg-surface-raised p-6 shadow-lg">
      <h1 className="text-xl font-semibold text-foreground">Create account</h1>
      <p className="mt-2 text-sm text-muted">
        Register to save and import 4D Gaussian scenes.
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
            autoComplete="new-password"
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-accent focus:ring-1"
            {...register('password')}
          />
          {errors.password ? (
            <p className="mt-1 text-xs text-hyperplane-x">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1 block text-xs text-muted"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-accent focus:ring-1"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword ? (
            <p className="mt-1 text-xs text-hyperplane-x">
              {errors.confirmPassword.message}
            </p>
          ) : null}
        </div>

        {submitError ? (
          <p className="text-sm text-hyperplane-x">{submitError}</p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg border border-accent bg-accent/15 py-2.5 text-sm font-medium text-accent transition hover:bg-accent/25 disabled:opacity-60"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
