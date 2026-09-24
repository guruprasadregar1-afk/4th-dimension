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
