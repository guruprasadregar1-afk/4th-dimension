import { NextResponse } from 'next/server';
import { BackendAuthError, backendRegister } from '@/lib/auth/backend';
import { applyAuthCookiesToResponse } from '@/lib/auth/cookies';
import { registerSchema } from '@/lib/auth/schemas';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;
    const auth = await backendRegister(email, password);
    const response = NextResponse.json({ user: auth.user });
    applyAuthCookiesToResponse(
      response,
      auth.accessToken,
      auth.refreshToken,
    );

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Registration failed';
    const status = error instanceof BackendAuthError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
