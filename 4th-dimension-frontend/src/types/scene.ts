export interface SceneListItem {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  tags: string[];
  metadata: Record<string, unknown> & { duration?: number };
  storageType: 'embedded' | 'gridfs';
  primitiveCount: number;
  storageSizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScenesPagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ScenesResponse {
  items: SceneListItem[];
  pagination: ScenesPagination;
}

export interface SceneQueryParams {
  limit?: number;
  offset?: number;
  search?: string;
  minPrimitiveCount?: number;
  maxPrimitiveCount?: number;
  minDuration?: number;
  maxDuration?: number;
}

export function buildSceneQuery(params: SceneQueryParams): string {
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.minPrimitiveCount !== undefined) {
    query.set('minPrimitiveCount', String(params.minPrimitiveCount));
  }
  if (params.maxPrimitiveCount !== undefined) {
    query.set('maxPrimitiveCount', String(params.maxPrimitiveCount));
  }
  if (params.minDuration !== undefined) {
    query.set('minDuration', String(params.minDuration));
  }
  if (params.maxDuration !== undefined) {
    query.set('maxDuration', String(params.maxDuration));
  }
  return query.toString();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function is4dScene(scene: SceneListItem): boolean {
  if (typeof scene.metadata?.isTimeVarying === 'boolean') {
    return scene.metadata.isTimeVarying;
  }
  if (typeof scene.metadata?.timestepCount === 'number') {
    return scene.metadata.timestepCount > 1;
  }
  return false;
}

export function sceneTimestepCount(scene: SceneListItem): number {
  const count = scene.metadata?.timestepCount;
  if (typeof count === 'number') return count;
  return is4dScene(scene) ? 12 : 1;
}

export function sceneDuration(scene: SceneListItem): number {
  if (!is4dScene(scene)) return 0;
  const d = scene.metadata?.duration;
  return typeof d === 'number' ? d : 0;
}
