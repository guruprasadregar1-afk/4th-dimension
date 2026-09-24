export { Engine4D } from './engine/Engine4D';
export type { LoadSceneFromApiOptions } from './engine/Engine4D';
export {
  SceneApiClient,
  SceneApiError,
  normalizeScenePayload,
  MAX_PRIMITIVES_PER_SCENE,
} from './api/sceneApi';
export type { SceneApiClientOptions } from './api/sceneApi';
export type { ApiEnvelope, LoginResponse, SceneListItem } from './api/types';
export { WebGLContext, WebGLContextError } from './core/WebGLContext';
export { GaussianRenderer } from './renderer/GaussianRenderer';
export { OrbitCameraController } from './interaction/OrbitCameraController';
export { applyRenderBudget, QUALITY_MAX_SPLATS, splatImportance } from './renderer/lod';
