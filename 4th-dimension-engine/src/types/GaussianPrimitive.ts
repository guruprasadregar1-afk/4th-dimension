/** Segmentation layer for filtering primitives in the viewer. */

export type PrimitiveLayer = 'static' | 'dynamic' | 'transient';



/** Color or camera-depth visualization mode. */

export type RenderMode = 'color' | 'depth';



/** Adaptive render quality preset (Sprint 6 LOD budget). */

export type QualityPreset = 'high' | 'balanced' | 'performance';



export interface RenderStats {

  totalPrimitives: number;

  projectedSplats: number;

  renderedSplats: number;

  lastFrameMs: number;

  qualityPreset: QualityPreset;

}



export interface LayerVisibility {

  static: boolean;

  dynamic: boolean;

  transient: boolean;

}



/** A single 4D Gaussian primitive (mean + covariance in 4D space). */

export interface GaussianPrimitive4D {

  /** Position in 4D: (x, y, z, t) */

  mean: [number, number, number, number];

  /** 4x4 covariance matrix stored row-major (16 floats) */

  covariance: Float32Array | number[];

  /** RGBA color */

  color: [number, number, number, number];

  /** Opacity */

  alpha: number;

}



/** Scene payload returned by the backend API. */

export interface ScenePayload {

  id: string;

  title: string;

  duration: number;

  primitives: GaussianPrimitive4D[];

}


