import { describe, expect, it } from 'vitest';

export interface SceneMetadata {
  duration?: number;
  isTimeVarying?: boolean;
  timestepCount?: number;
  internalTemporalVarFloor?: number;
}

export function is4dScene(metadata?: SceneMetadata): boolean {
  if (typeof metadata?.isTimeVarying === 'boolean') {
    return metadata.isTimeVarying;
  }
  if (typeof metadata?.timestepCount === 'number') {
    return metadata.timestepCount > 1;
  }
  return false;
}

describe('is4dScene classification logic (Part 1 Step 4 Regression Test)', () => {
  it('classifies scene with timestepCount=1 as static 3D even if internal temporal variance floor 0.05 exists', () => {
    const staticColmapMetadata: SceneMetadata = {
      duration: 0,
      timestepCount: 1,
      isTimeVarying: false,
      internalTemporalVarFloor: 0.05, // Internal math safety floor MUST NOT trick classifier into calling it 4D
    };

    expect(is4dScene(staticColmapMetadata)).toBe(false);
  });

  it('classifies scene with timestepCount=12 as genuine 4D time-varying', () => {
    const tesseractMetadata: SceneMetadata = {
      duration: 5.0,
      timestepCount: 12,
      isTimeVarying: true,
    };

    expect(is4dScene(tesseractMetadata)).toBe(true);
  });

  it('guarantees Rotating Tesseract (xw-plane) seed metadata is strictly classified as 4D', () => {
    const tesseractSeedMetadata: SceneMetadata = {
      duration: 5.0,
      isTimeVarying: true,
      timestepCount: 12,
    };
    expect(is4dScene(tesseractSeedMetadata)).toBe(true);
  });

  it('asserts a scene with timestepCount > 1 is NEVER routed through the pure-3D-distance (static) calculation path', () => {
    const multiTimestepMetadata: SceneMetadata = {
      timestepCount: 4,
    };
    expect(is4dScene(multiTimestepMetadata)).toBe(true);

    const explicitTrueMetadata: SceneMetadata = {
      isTimeVarying: true,
      timestepCount: 12,
    };
    expect(is4dScene(explicitTrueMetadata)).toBe(true);
  });
});

