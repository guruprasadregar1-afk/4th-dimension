import type { GaussianPrimitive4D } from '../types/GaussianPrimitive';

/** Deep-copy primitives so physics can mutate spatial means independently. */
export function clonePrimitives(
  primitives: GaussianPrimitive4D[],
): GaussianPrimitive4D[] {
  return primitives.map((primitive) => ({
    mean: [...primitive.mean] as [number, number, number, number],
    covariance:
      primitive.covariance instanceof Float32Array
        ? new Float32Array(primitive.covariance)
        : [...primitive.covariance],
    color: [...primitive.color] as [number, number, number, number],
    alpha: primitive.alpha,
  }));
}

export function restoreSpatialMeans(
  target: GaussianPrimitive4D[],
  source: GaussianPrimitive4D[],
): void {
  const count = Math.min(target.length, source.length);
  for (let i = 0; i < count; i += 1) {
    target[i].mean[0] = source[i].mean[0];
    target[i].mean[1] = source[i].mean[1];
    target[i].mean[2] = source[i].mean[2];
  }
}
