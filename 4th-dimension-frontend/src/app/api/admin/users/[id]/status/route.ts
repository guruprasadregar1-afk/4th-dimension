import { NextResponse } from 'next/server';
import { applySessionCookies } from '@/lib/auth/session';
import { BffHttpError, jsonWithSession, withServerSession } from '@/lib/auth/server-fetch';
import { API_BASE_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const json = await request.json();

  const result = await withServerSession(async (token) => {
    const response = await fetch(
      `${API_BASE_URL.replace(/\/$/, '')}/admin/users/${params.id}/status`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(json),
      },
    );

    if (!response.ok) {
      throw new BffHttpError('Failed to update user status', response.status);
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
