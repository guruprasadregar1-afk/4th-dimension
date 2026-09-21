import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@/lib/auth/cookies';

const AUTHENTICATED_PREFIXES = ['/dashboard', '/viewer', '/scenes'];
const PUBLIC_AUTH_PATHS = ['/login', '/register'];

function isAuthenticated(request: NextRequest): boolean {
  return (
    Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value) ||
    Boolean(request.cookies.get(REFRESH_TOKEN_COOKIE)?.value)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loggedIn = isAuthenticated(request);

  const isProtected = AUTHENTICATED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !loggedIn) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    loggedIn &&
    PUBLIC_AUTH_PATHS.some((path) => pathname === path)
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/viewer/:path*',
    '/scenes/:path*',
    '/login',
    '/register',
  ],
};
