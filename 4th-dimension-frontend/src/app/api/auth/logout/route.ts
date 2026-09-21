import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { backendLogout } from '@/lib/auth/backend';
import { REFRESH_TOKEN_COOKIE, clearAuthCookiesFromResponse } from '@/lib/auth/cookies';

export const dynamic = 'force-dynamic';

export async function POST() {
  const refreshToken = cookies().get(REFRESH_TOKEN_COOKIE)?.value;

  if (refreshToken) {
    try {
      await backendLogout(refreshToken);
    } catch {
      // Clear local session even if backend revoke fails.
    }
  }

  const response = NextResponse.json({ success: true });
  clearAuthCookiesFromResponse(response);
  return response;
}
