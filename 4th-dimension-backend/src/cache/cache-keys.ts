export const CacheKeys = {
  scene: (ownerId: string, sceneId: string) => `scene:${ownerId}:${sceneId}`,
  primitives: (ownerId: string, sceneId: string) =>
    `primitives:${ownerId}:${sceneId}`,
};
