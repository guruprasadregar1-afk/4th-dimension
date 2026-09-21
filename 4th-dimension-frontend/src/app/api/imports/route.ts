import { NextResponse } from 'next/server';
import { applySessionCookies } from '@/lib/auth/session';
import { BffHttpError, jsonWithSession, withServerSession } from '@/lib/auth/server-fetch';
import { API_BASE_URL } from '@/lib/config';
import type { ImportJob, ImportsResponse } from '@/types/import';

export const dynamic = 'force-dynamic';

async function parseBackendError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: { message?: string | string[] };
      message?: string;
    };
    const message = body.error?.message ?? body.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  } catch {
    // ignore
  }
  return response.statusText || 'Import request failed';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = new URLSearchParams();
  query.set('limit', searchParams.get('limit') ?? '10');
  query.set('offset', searchParams.get('offset') ?? '0');

  const result = await withServerSession(async (token) => {
    const response = await fetch(
      `${API_BASE_URL.replace(/\/$/, '')}/imports?${query.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      throw new BffHttpError(
        await parseBackendError(response),
        response.status,
      );
    }

    const body = (await response.json()) as { data: ImportsResponse };
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

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const result = await withServerSession(async (token) => {
    const backendForm = new FormData();
    backendForm.append('file', file, file.name);

    for (const key of ['title', 'description', 'tags', 'duration'] as const) {
      const value = formData.get(key);
      if (value !== null && value !== '') {
        backendForm.append(key, String(value));
      }
    }

    const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/imports`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: backendForm,
    });

    if (!response.ok) {
      throw new BffHttpError(
        await parseBackendError(response),
        response.status,
      );
    }

    const body = (await response.json()) as { data: ImportJob };
    return body.data;
  });

  if (!result.ok) {
    const response = NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
    return applySessionCookies(response, result.session);
  }

  return jsonWithSession(result.data, result.session, { status: 201 });
}
