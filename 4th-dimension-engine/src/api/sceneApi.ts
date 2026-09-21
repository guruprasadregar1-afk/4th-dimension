import type { GaussianPrimitive4D, ScenePayload } from '../types/GaussianPrimitive';
import type {
  ApiEnvelope,
  LoginResponse,
  PaginatedScenes,
  SceneListItem,
  ScenePrimitivesResponse,
} from './types';

/** Product boundary: max Gaussian primitives per scene (Project Boundaries doc). */
export const MAX_PRIMITIVES_PER_SCENE = 500_000;

export class SceneApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'SceneApiError';
  }
}

export interface SceneApiClientOptions {
  baseUrl: string;
  accessToken?: string;
}

/** HTTP client for the 4D Representation Platform scene API. */
export class SceneApiClient {
  private accessToken?: string;

  constructor(private readonly options: SceneApiClientOptions) {
    this.accessToken = options.accessToken;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  async login(email: string, password: string): Promise<string> {
    const response = await this.request<ApiEnvelope<LoginResponse>>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        auth: false,
      },
    );

    this.accessToken = response.data.accessToken;
    return response.data.accessToken;
  }

  async listScenes(options?: {
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<PaginatedScenes<SceneListItem>> {
    const params = new URLSearchParams();
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    if (options?.offset !== undefined) {
      params.set('offset', String(options.offset));
    }
    if (options?.search) params.set('search', options.search);

    const query = params.toString();
    const path = query ? `/scenes?${query}` : '/scenes';

    const response = await this.request<
      ApiEnvelope<PaginatedScenes<SceneListItem>>
    >(path);
    return response.data;
  }

  async fetchScenePayload(sceneId: string): Promise<ScenePayload> {
    const response = await this.request<
      ApiEnvelope<ScenePrimitivesResponse>
    >(`/scenes/${sceneId}/primitives`);

    return normalizeScenePayload(response.data);
  }

  async saveSnapshot(sceneId: string, snapshotData: any): Promise<any> {
    const response = await this.request<ApiEnvelope<any>>(
      `/scenes/${sceneId}/snapshot`,
      {
        method: 'POST',
        body: JSON.stringify(snapshotData),
      },
    );
    return response.data;
  }

  private async request<T>(
    path: string,
    init: RequestInit & { auth?: boolean } = {},
  ): Promise<T> {
    const { auth = true, ...fetchInit } = init;
    const headers = new Headers(fetchInit.headers);

    headers.set('Content-Type', 'application/json');

    if (auth) {
      if (!this.accessToken) {
        throw new SceneApiError('Authentication required. Log in first.');
      }
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    const url = `${this.options.baseUrl.replace(/\/$/, '')}${path}`;
    const response = await fetch(url, { ...fetchInit, headers });

    if (!response.ok) {
      let message = response.statusText;
      try {
        const body = (await response.json()) as { error?: unknown };
        if (typeof body.error === 'string') {
          message = body.error;
        } else if (body.error && typeof body.error === 'object') {
          message = JSON.stringify(body.error);
        }
      } catch {
        // use statusText
      }
      throw new SceneApiError(message, response.status);
    }

    return response.json() as Promise<T>;
  }
}

/** Parse backend primitive data into engine-ready 4D Gaussian format. */
export function normalizeScenePayload(raw: ScenePayload): ScenePayload {
  if (raw.primitives.length > MAX_PRIMITIVES_PER_SCENE) {
    console.warn(
      `[4D Engine] Scene exceeds product limit of ${MAX_PRIMITIVES_PER_SCENE} primitives. Rendering may degrade.`,
    );
  }

  return {
    id: raw.id,
    title: raw.title,
    duration: raw.duration,
    primitives: raw.primitives.map(normalizePrimitive),
  };
}

function normalizePrimitive(
  primitive: GaussianPrimitive4D,
): GaussianPrimitive4D {
  return {
    mean: primitive.mean,
    covariance:
      primitive.covariance instanceof Float32Array
        ? primitive.covariance
        : new Float32Array(primitive.covariance),
    color: primitive.color,
    alpha: primitive.alpha,
  };
}
