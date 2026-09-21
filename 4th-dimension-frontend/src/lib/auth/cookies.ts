import type { NextResponse } from 'next/server';

export const ACCESS_TOKEN_COOKIE = '4d_access_token';
export const REFRESH_TOKEN_COOKIE = '4d_refresh_token';

/** 1 hour — matches default backend JWT access expiry. */
export const ACCESS_TOKEN_MAX_AGE = 1 * 60 * 60;

/** 7 days — matches default backend refresh expiry. */
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

export function buildAuthCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

/** Attach auth tokens to an outgoing Route Handler response. */
export function applyAuthCookiesToResponse(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
): void {
  response.cookies.set(
    ACCESS_TOKEN_COOKIE,
    accessToken,
    buildAuthCookieOptions(ACCESS_TOKEN_MAX_AGE),
  );
  response.cookies.set(
    REFRESH_TOKEN_COOKIE,
    refreshToken,
    buildAuthCookieOptions(REFRESH_TOKEN_MAX_AGE),
  );
}

/** Remove auth cookies from an outgoing Route Handler response. */
export function clearAuthCookiesFromResponse(response: NextResponse): void {
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
}
