'use client';

import useSWR from 'swr';
import { fetchBff } from '@/lib/client-fetch';
import type { ImportsResponse } from '@/types/import';

async function fetchImports(url: string): Promise<ImportsResponse> {
  const response = await fetchBff(url);
  if (!response.ok) {
    throw new Error('Failed to load imports');
  }
  return response.json() as Promise<ImportsResponse>;
}

export function useImports(limit = 5) {
  const key = `/api/imports?limit=${limit}&offset=0`;

  return useSWR<ImportsResponse>(key, fetchImports, {
    revalidateOnFocus: false,
    refreshInterval: (data) => {
      const hasActive = data?.items.some(
        (job) => job.status === 'pending' || job.status === 'processing',
      );
      return hasActive ? 2000 : 0;
    },
  });
}
