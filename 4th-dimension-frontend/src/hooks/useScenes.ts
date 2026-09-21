'use client';

import useSWR from 'swr';
import { fetchBff } from '@/lib/client-fetch';
import {
  buildSceneQuery,
  type SceneQueryParams,
  type ScenesResponse,
} from '@/types/scene';

async function fetchScenes(url: string): Promise<ScenesResponse> {
  const response = await fetchBff(url);
  if (!response.ok) {
    throw new Error('Failed to load scenes — is the backend running?');
  }
  return response.json() as Promise<ScenesResponse>;
}

export function useScenes(params: SceneQueryParams) {
  const query = buildSceneQuery(params);
  const key = `/api/scenes?${query}`;

  return useSWR<ScenesResponse>(key, fetchScenes, {
    revalidateOnFocus: false,
  });
}
