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
export { slice4DAtTime, sliceSceneAtTime, defaultCovariance4D } from './math/gaussian4d';
export type { SliceOptions } from './math/gaussian4d';
export {
  rotatePrimitive4D,
  DEFAULT_HYPERPLANE,
} from './math/hyperplane4d';
export type { HyperplaneRotation } from './math/hyperplane4d';
export { projectSplats, createOrbitCamera } from './math/projection';
export type { Gaussian3D } from './math/gaussian4d';
export type { Splat2D, CameraParams } from './math/projection';
export { applyRenderBudget, QUALITY_MAX_SPLATS, splatImportance } from './renderer/lod';
export { PhysicsWorld } from './physics/PhysicsWorld';
export { XpbdSolver, buildProximityConstraints } from './physics/xpbd';
export type { PhysicsConfig, PhysicsStats } from './physics/types';
export { DEFAULT_PHYSICS_CONFIG } from './physics/types';
export type {
  GaussianPrimitive4D,
  LayerVisibility,
  PrimitiveLayer,
  QualityPreset,
  RenderMode,
  RenderStats,
  ScenePayload,
} from './types/GaussianPrimitive';export {
  generateTesseractGeometry,
  generateSimplex5Geometry,
  generateOrthoplex16Geometry,
  generateCube3DGeometry,
} from './math/polytopeGeometry';
export type { PolytopeGeometry4D, PolytopeGeometry3D, PolytopeCell4D } from './math/polytopeGeometry';
export {
  signDistance4D,
  intersectEdgeHyperplane,
  slicePolytopeHyperplane,
  classifyCrossSectionShape,
  verifyFaceCoplanarity,
  verifyMeshConvexity,
  verifyMeshCongruence,
} from './math/hyperplaneSlicer';
export type {
  Hyperplane4D,
  EdgeIntersectionResult,
  CrossSectionMesh3D,
} from './math/hyperplaneSlicer';
export * from './math/escapePuzzle';

