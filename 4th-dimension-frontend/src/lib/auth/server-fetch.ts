import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  applySessionCookies,
  refreshAccessToken,
  resolveSessionUser,
  type SessionResult,
} from './session';
import { REFRESH_TOKEN_COOKIE } from './cookies';

export class BffHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'BffHttpError';
  }
}

export async function getServerAccessToken(): Promise<string | null> {
  const session = await resolveSessionUser();
  return session.accessToken;
}

export function jsonWithSession<T>(
  data: T,
  session: SessionResult,
  init?: ResponseInit,
): NextResponse {
  const response = NextResponse.json(data, init);
  return applySessionCookies(response, session);
}

export async function withServerSession<T>(
  handler: (accessToken: string) => Promise<T>,
): Promise<
  | { ok: true; data: T; session: SessionResult }
  | { ok: false; status: number; error: string; session: SessionResult }
> {
  let session = await resolveSessionUser();
  if (!session.accessToken) {
    return {
      ok: false,
      status: 401,
      error: 'Unauthorized',
      session,
    };
  }

  try {
    const data = await handler(session.accessToken);
    return { ok: true, data, session };
  } catch (error) {
    if (error instanceof BffHttpError && error.status === 401) {
      const jar = cookies();
      const refreshToken = jar.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
      if (refreshToken) {
        try {
          const rotatedTokens = await refreshAccessToken(refreshToken);
          const updatedSession: SessionResult = {
            ...session,
            accessToken: rotatedTokens.accessToken,
            rotatedTokens,
          };
          const data = await handler(rotatedTokens.accessToken);
          return { ok: true, data, session: updatedSession };
        } catch {
          return {
            ok: false,
            status: 401,
            error: error.message,
            session: { user: null, accessToken: null, clearCookies: true },
          };
        }
      }
    }

    if (error instanceof BffHttpError) {
      return {
        ok: false,
        status: error.status,
        error: error.message,
        session,
      };
    }
    return {
      ok: false,
      status: 500,
      error: 'Request failed',
      session,
    };
  }
}

export async function backendAuthedFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getServerAccessToken();
  if (!token) {
    throw new Error('Unauthorized');
  }

  const { API_BASE_URL } = await import('@/lib/config');
  const url = `${API_BASE_URL.replace(/\/$/, '')}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const body = (await response.json()) as { success: boolean; data: T };
  return body.data;
}
