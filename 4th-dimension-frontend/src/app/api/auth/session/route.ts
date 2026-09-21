import { NextResponse } from 'next/server';
import { applySessionCookies, resolveSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await resolveSessionUser();
  const response = NextResponse.json({ user: session.user });
  return applySessionCookies(response, session);
}
