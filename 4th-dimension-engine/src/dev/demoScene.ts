import { defaultCovariance4D } from '../math/gaussian4d';
import type { GaussianPrimitive4D, ScenePayload } from '../types/GaussianPrimitive';

/** Animated demo scene with 4D Gaussians moving through time. */
export function createDemoScene(): ScenePayload {
  const colors: [number, number, number, number][] = [
    [0.2, 0.6, 1.0, 1],
    [1.0, 0.4, 0.3, 1],
    [0.3, 1.0, 0.5, 1],
    [0.9, 0.7, 0.2, 1],
    [0.8, 0.3, 0.9, 1],
  ];

  const primitives: GaussianPrimitive4D[] = [];

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const cov = defaultCovariance4D(0.04, 0.15);
    cov[3] = 0.01;
    cov[7] = 0.005;
    cov[11] = 0.005;

    primitives.push({
      mean: [
        Math.cos(angle) * 1.2,
        Math.sin(angle * 0.5) * 0.5,
        Math.sin(angle) * 1.2,
        i * 0.8,
      ],
      covariance: cov,
      color: colors[i],
      alpha: 0.85,
    });
  }

  return {
    id: 'demo',
    title: '4D Gaussian Demo',
    duration: 5,
    primitives,
  };
}
