import { fetchBff } from '@/lib/client-fetch';
import type { SceneListItem } from '@/types/scene';

export interface NativeSceneExport {
  format: '4d-native';
  title: string;
  description?: string;
  tags?: string[];
  duration: number;
  primitives: unknown[];
  exportedAt: string;
  sourceSceneId?: string;
}

export async function exportSceneJson(scene: SceneListItem): Promise<void> {
  const response = await fetchBff(`/api/scenes/${scene.id}/export`);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? 'Failed to export scene');
  }

  const exportData = (await response.json()) as NativeSceneExport;
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${exportData.title.replace(/[^\w.-]+/g, '_') || 'scene'}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function cloneScene(
  sceneId: string,
  title?: string,
): Promise<SceneListItem> {
  const response = await fetchBff(`/api/scenes/${sceneId}/clone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(title ? { title } : {}),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? 'Failed to clone scene');
  }

  return response.json() as Promise<SceneListItem>;
}
