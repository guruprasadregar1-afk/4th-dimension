// Standalone Pure 4D Math & Computational Geometry Public API Surface
// Zero DOM, Canvas, or WebGL context dependencies.

export {
  generateTesseractGeometry,
  generateSimplex5Geometry,
  generateAsymmetricSimplex5Geometry,
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
  computeCanonicalHyperplaneBasis,
} from './math/hyperplaneSlicer';
export type {
  Hyperplane4D,
  EdgeIntersectionResult,
  CrossSectionMesh3D,
} from './math/hyperplaneSlicer';

export { slice4DAtTime, sliceSceneAtTime, defaultCovariance4D } from './math/gaussian4d';
export type { SliceOptions, Gaussian3D } from './math/gaussian4d';

export { rotatePrimitive4D, DEFAULT_HYPERPLANE } from './math/hyperplane4d';
export type { HyperplaneRotation } from './math/hyperplane4d';

export { projectSplats, createOrbitCamera } from './math/projection';
export type { Splat2D, CameraParams } from './math/projection';


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
} from './types/GaussianPrimitive';

export * from './math/escapePuzzle';
export type { Point2D, Point3D, Point4D } from './math/escapePuzzle';
