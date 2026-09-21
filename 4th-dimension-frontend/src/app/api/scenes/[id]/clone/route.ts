import { NextResponse } from 'next/server';
import { applySessionCookies } from '@/lib/auth/session';
import { BffHttpError, jsonWithSession, withServerSession } from '@/lib/auth/server-fetch';
import { API_BASE_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: { id: string } },
) {
  const payload = (await request.json().catch(() => ({}))) as {
    title?: string;
  };

  const result = await withServerSession(async (token) => {
    const response = await fetch(
      `${API_BASE_URL.replace(/\/$/, '')}/scenes/${context.params.id}/clone`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      const message =
        response.status === 404
          ? 'Scene not found'
          : response.status === 403
            ? 'You do not have access to this scene'
            : 'Failed to clone scene';
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
