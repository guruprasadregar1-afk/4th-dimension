import { describe, expect, it } from 'vitest';
import { createOrbitCamera, projectSplats } from './projection';
import type { Gaussian3D } from './gaussian4d';

describe('projection', () => {
  it('createOrbitCamera returns view and projection matrices', () => {
    const camera = createOrbitCamera(0.5, 0.3, 4, 16 / 9);

    expect(camera.viewMatrix.length).toBe(16);
    expect(camera.projectionMatrix.length).toBe(16);
    expect(camera.viewport).toEqual([960, 540]);
  });

  it('projectSplats returns screen-space splats for visible gaussians', () => {
    const splats: Gaussian3D[] = [
      {
        mean: [0, 0, 0],
        covariance: new Float32Array([0.1, 0, 0, 0, 0.1, 0, 0, 0, 0.1]),
        color: [1, 0, 0, 1],
        alpha: 0.8,
        temporalWeight: 1,
      },
    ];

    const camera = createOrbitCamera(0.5, 0.3, 4, 1);
    camera.viewport = [800, 600];

    const projected = projectSplats(splats, camera);

    expect(projected.length).toBe(1);
    expect(projected[0].conic.length).toBe(3);
    expect(projected[0].alpha).toBeGreaterThan(0);
  });

  it('projectSplats excludes splats outside the view frustum', () => {
    const splats: Gaussian3D[] = [
      {
        mean: [100, 100, 100],
        covariance: new Float32Array([0.1, 0, 0, 0, 0.1, 0, 0, 0, 0.1]),
        color: [1, 0, 0, 1],
        alpha: 0.8,
        temporalWeight: 1,
      },
    ];

    const camera = createOrbitCamera(0, 0, 4, 1);
    const projected = projectSplats(splats, camera);

    expect(projected.length).toBe(0);
  });

  it('supports custom FOV in createOrbitCamera', () => {
    const narrow = createOrbitCamera(0, 0, 4, 1, Math.PI / 6); // 30 deg FOV
    const wide = createOrbitCamera(0, 0, 4, 1, Math.PI / 2); // 90 deg FOV

    // Diagonal/scaling terms in projection matrix should differ based on FOV
    expect(narrow.projectionMatrix[0]).toBeGreaterThan(wide.projectionMatrix[0]);
    expect(narrow.projectionMatrix[5]).toBeGreaterThan(wide.projectionMatrix[5]);
  });

  it('supports orthographic projection mode in createOrbitCamera', () => {
    const perspectiveCam = createOrbitCamera(0, 0, 4, 1, Math.PI / 4, false);
    const orthoCam = createOrbitCamera(0, 0, 4, 1, Math.PI / 4, true);

    // Perspective projection has [11] = -1 for w division, orthographic has 0
    expect(perspectiveCam.projectionMatrix[11]).toBe(-1);
    expect(orthoCam.projectionMatrix[11]).toBe(0);
  });
});

