import { NextResponse } from 'next/server';
import { BackendAuthError, backendLogin } from '@/lib/auth/backend';
import { applyAuthCookiesToResponse } from '@/lib/auth/cookies';
import { loginSchema } from '@/lib/auth/schemas';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const auth = await backendLogin(parsed.data.email, parsed.data.password);
    const response = NextResponse.json({ user: auth.user });
    applyAuthCookiesToResponse(
      response,
      auth.accessToken,
      auth.refreshToken,
    );

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Login failed';
    const status = error instanceof BackendAuthError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
