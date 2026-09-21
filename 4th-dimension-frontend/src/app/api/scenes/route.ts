import { NextResponse } from 'next/server';
import { applySessionCookies } from '@/lib/auth/session';
import { BffHttpError, jsonWithSession, withServerSession } from '@/lib/auth/server-fetch';
import { API_BASE_URL } from '@/lib/config';
import type { ScenesResponse } from '@/types/scene';

export const dynamic = 'force-dynamic';

const FORWARD_PARAMS = [
  'limit',
  'offset',
  'search',
  'minPrimitiveCount',
  'maxPrimitiveCount',
  'minDuration',
  'maxDuration',
  'createdAfter',
  'createdBefore',
] as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = new URLSearchParams();

  for (const key of FORWARD_PARAMS) {
    const value = searchParams.get(key);
    if (value !== null && value !== '') {
      query.set(key, value);
    }
  }

  if (!query.has('limit')) query.set('limit', '20');
  if (!query.has('offset')) query.set('offset', '0');

  const result = await withServerSession(async (token) => {
    const response = await fetch(
      `${API_BASE_URL.replace(/\/$/, '')}/scenes?${query.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      throw new BffHttpError('Failed to load scenes', response.status);
    }

    const body = (await response.json()) as { data: ScenesResponse };
    return body.data;
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
