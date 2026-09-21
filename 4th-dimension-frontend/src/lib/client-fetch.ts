let inflightRefreshPromise: Promise<Response> | null = null;

/** Browser fetch that always sends httpOnly session cookies to BFF routes. */
export function clientFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: 'same-origin',
  });
}

/**
 * Fetch a BFF route; on 401, refresh session once (deduplicated) and retry.
 * Only if refresh fails is the user redirected to /login.
 */
export async function fetchBff(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let response = await clientFetch(input, init);

  if (response.status === 401) {
    if (!inflightRefreshPromise) {
      inflightRefreshPromise = clientFetch('/api/auth/session', {
        cache: 'no-store',
      }).finally(() => {
        inflightRefreshPromise = null;
      });
    }

    try {
      const refreshRes = await inflightRefreshPromise;
      if (refreshRes.ok) {
        response = await clientFetch(input, init);
      } else if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login')
      ) {
        window.location.href = '/login';
      }
    } catch {
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login')
      ) {
        window.location.href = '/login';
      }
    }
  }

  return response;
}
