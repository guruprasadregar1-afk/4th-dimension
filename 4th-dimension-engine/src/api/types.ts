import type { ScenePayload } from '../types/GaussianPrimitive';

/** Standard backend response envelope (NestJS ResponseInterceptor). */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export interface SceneListItem {
  id: string;
  title: string;
  primitiveCount: number;
  storageType: 'embedded' | 'gridfs';
  metadata: Record<string, unknown>;
}

export interface PaginatedScenes<T> {
  items: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export type ScenePrimitivesResponse = ScenePayload;
