import { decodeJwt } from 'jose';
import type { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  applyAuthCookiesToResponse,
  clearAuthCookiesFromResponse,
} from './cookies';
import {
  backendGetProfile,
  backendRefresh,
  BackendAuthError,
  type AuthTokens,
  type AuthUser,
} from './backend';

export interface SessionResult {
  user: AuthUser | null;
  accessToken: string | null;
  /** New tokens to persist on the HTTP response (refresh rotation). */
  rotatedTokens?: AuthTokens;
  /** Clear stale auth cookies on the HTTP response. */
  clearCookies?: boolean;
}

/** Prevent parallel refresh calls from invalidating each other's tokens. */
let inflightRefresh: {
  refreshToken: string;
  promise: Promise<AuthTokens>;
} | null = null;

function isAccessTokenExpired(token: string): boolean {
  try {
    const payload = decodeJwt(token);
    if (!payload.exp) return false;
    return payload.exp * 1000 <= Date.now() + 5_000;
  } catch {
    return true;
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  if (inflightRefresh?.refreshToken === refreshToken) {
    return inflightRefresh.promise;
  }

  const promise = backendRefresh(refreshToken).finally(() => {
    if (inflightRefresh?.refreshToken === refreshToken) {
      inflightRefresh = null;
    }
  });

  inflightRefresh = { refreshToken, promise };
  return promise;
}

export async function resolveSessionUser(): Promise<SessionResult> {
  const jar = cookies();
  let accessToken = jar.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  const refreshToken = jar.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
  let rotatedTokens: AuthTokens | undefined;

  if (accessToken && isAccessTokenExpired(accessToken)) {
    accessToken = null;
  }

  if (!accessToken && refreshToken) {
    try {
      rotatedTokens = await refreshAccessToken(refreshToken);
      accessToken = rotatedTokens.accessToken;
    } catch (err) {
      if (err instanceof BackendAuthError && err.status === 401) {
        return { user: null, accessToken: null, clearCookies: true };
      }
      return { user: null, accessToken: null };
    }
  }

  if (!accessToken) {
    return { user: null, accessToken: null };
  }

  try {
    const user = await backendGetProfile(accessToken);
    return { user, accessToken, rotatedTokens };
  } catch {
    if (refreshToken) {
      try {
        rotatedTokens = await refreshAccessToken(refreshToken);
        accessToken = rotatedTokens.accessToken;
        const user = await backendGetProfile(accessToken);
        return { user, accessToken, rotatedTokens };
      } catch (err) {
        if (err instanceof BackendAuthError && err.status === 401) {
          return { user: null, accessToken: null, clearCookies: true };
        }
        return { user: null, accessToken: null };
      }
    }
    return { user: null, accessToken: null };
  }
}

/** Sync rotated or cleared auth cookies onto a Route Handler response. */
export function applySessionCookies(
  response: NextResponse,
  session: SessionResult,
): NextResponse {
  if (session.rotatedTokens) {
    applyAuthCookiesToResponse(
      response,
      session.rotatedTokens.accessToken,
      session.rotatedTokens.refreshToken,
    );
  } else if (session.clearCookies) {
    clearAuthCookiesFromResponse(response);
  }
  return response;
}
