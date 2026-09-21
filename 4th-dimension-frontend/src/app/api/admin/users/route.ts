import { NextResponse } from 'next/server';
import { applySessionCookies } from '@/lib/auth/session';
import { BffHttpError, jsonWithSession, withServerSession } from '@/lib/auth/server-fetch';
import { API_BASE_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '20';

  const result = await withServerSession(async (token) => {
    const response = await fetch(
      `${API_BASE_URL.replace(/\/$/, '')}/admin/users?page=${page}&limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      throw new BffHttpError('Failed to list admin users', response.status);
    }

    const body = await response.json();
    return body.data ?? body;
  });

  if (!result.ok) {
    const response = NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
    return applySessionCookies(response, result.session);
  }

  return jsonWithSession(result.data, result.session);
}
