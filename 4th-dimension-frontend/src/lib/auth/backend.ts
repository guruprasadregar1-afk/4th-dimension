import { API_BASE_URL } from '@/lib/config';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

interface ApiErrorBody {
  success?: boolean;
  error?: { message?: string | string[] };
}

export class BackendAuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'BackendAuthError';
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    const message = body.error?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  } catch {
    // ignore
  }
  return response.statusText || 'Request failed';
}

async function backendFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new BackendAuthError(
      await parseErrorMessage(response),
      response.status,
    );
  }

  const body = (await response.json()) as ApiEnvelope<T>;
  return body.data;
}

export async function backendLogin(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return backendFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function backendRegister(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return backendFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function backendLogout(refreshToken: string): Promise<void> {
  await backendFetch<{ message: string }>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export async function backendRefresh(
  refreshToken: string,
): Promise<AuthTokens> {
  return backendFetch<AuthTokens>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export async function backendGetProfile(
  accessToken: string,
): Promise<AuthUser> {
  return backendFetch<AuthUser>('/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
