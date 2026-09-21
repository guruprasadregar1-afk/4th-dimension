import { NextResponse } from 'next/server';
import { applySessionCookies } from '@/lib/auth/session';
import { BffHttpError, jsonWithSession, withServerSession } from '@/lib/auth/server-fetch';
import { API_BASE_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: { id: string } },
) {
  const result = await withServerSession(async (token) => {
    const response = await fetch(
      `${API_BASE_URL.replace(/\/$/, '')}/scenes/${context.params.id}/primitives`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      const message =
        response.status === 404
          ? 'Scene not found'
          : 'Failed to load scene primitives';
      throw new BffHttpError(message, response.status);
    }

    const body = (await response.json()) as { data: unknown };
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
