import type { Splat2D } from '../math/projection';
import type { QualityPreset } from '../types/GaussianPrimitive';

export const QUALITY_MAX_SPLATS: Record<QualityPreset, number> = {
  high: Number.POSITIVE_INFINITY,
  balanced: 8_000,
  performance: 2_000,
};

/** Screen-space importance: opacity × footprint × proximity. */
export function splatImportance(splat: Splat2D): number {
  const [a, b, c] = splat.conic;
  const conicDet = a * c - b * b;
  const footprint = conicDet > 1e-8 ? 1 / Math.sqrt(conicDet) : 0;
  const proximity = 1 / (1 + Math.max(splat.depth, 0));
  return splat.alpha * footprint * proximity;
}

/** Sort splats back-to-front for correct alpha compositing. */
export function sortSplatsByDepth(splats: Splat2D[]): void {
  splats.sort((left, right) => right.depth - left.depth);
}

/**
 * Keep the most important splats when over budget, then depth-sort for rendering.
 * Returns the same array reference with trimmed/reordered contents.
 */
export function applyRenderBudget(
  splats: Splat2D[],
  maxSplats: number,
): Splat2D[] {
  if (!Number.isFinite(maxSplats) || splats.length <= maxSplats) {
    sortSplatsByDepth(splats);
    return splats;
  }

  const ranked = splats
    .map((splat, index) => ({ index, score: splatImportance(splat) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSplats)
    .sort((a, b) => a.index - b.index);

  const selected = ranked.map(({ index }) => splats[index]);
  splats.length = 0;
  splats.push(...selected);
  sortSplatsByDepth(splats);
  return splats;
}
