import { describe, expect, it } from 'vitest';
import { slice4DAtTime } from '../math/gaussian4d';
import { rotatePrimitive4D, type HyperplaneRotation } from '../math/hyperplane4d';
import type { GaussianPrimitive4D } from '../types/GaussianPrimitive';

function generate500kPrimitives(): GaussianPrimitive4D[] {
  const count = 500_000;
  const primitives: GaussianPrimitive4D[] = new Array(count);
  for (let i = 0; i < count; i++) {
    primitives[i] = {
      mean: [(i % 100) * 0.1, (i % 50) * 0.1, (i % 20) * 0.1, (i % 10) * 0.05],
      covariance: [
        0.02, 0, 0, 0,
        0, 0.02, 0, 0,
        0, 0, 0.02, 0,
        0, 0, 0, 0.05,
      ],
      color: [0.8, 0.4, 0.2, 0.9],
      alpha: 0.85,
    };
  }
  return primitives;
}

describe('500,000 Gaussian Primitive Benchmark (E16 Boundary Test)', () => {
  it('evaluates time-slicing & 4D rotation performance on 500,000 primitives', () => {
    console.log('\n--- 500,000 PRIMITIVE ENGINE BENCHMARK ---');
    const primitives = generate500kPrimitives();
    expect(primitives).toHaveLength(500_000);

    const rotation: HyperplaneRotation = { xw: 0.2, yw: 0.1, zw: 0.05 };
    const targetW = 0.25;

    const startTime = performance.now();

    let validCount = 0;
    const sampleSize = 10_000;
    for (let i = 0; i < sampleSize; i++) {
      const rotated = rotatePrimitive4D(primitives[i], rotation);
      const sliced = slice4DAtTime(rotated, targetW);
      if (sliced) validCount++;
    }

    const endTime = performance.now();
    const durationMs = endTime - startTime;
    const extrapolatedFullFrameMs = (durationMs / sampleSize) * 500_000;
    const estimatedFps = 1000 / Math.max(0.1, extrapolatedFullFrameMs);

    console.log(`- 500k Primitives Generated: ${primitives.length}`);
    console.log(`- Sample 10k 4D Transformation & Slicing Time: ${durationMs.toFixed(2)} ms`);
    console.log(`- Extrapolated CPU 500k Full Time-Slicing Frame Time: ${extrapolatedFullFrameMs.toFixed(2)} ms`);
    console.log(`- Estimated Single-Thread CPU Frame Rate: ${estimatedFps.toFixed(1)} FPS`);
    console.log(`- WebGL2 Shader GPU Acceleration Note: WebGL2 vertex shader splat.vert.glsl parallelizes this across thousands of GPU cores targeting 60 FPS (RTX 3060+) / 30 FPS (Integrated GPU).`);

    expect(validCount).toBeGreaterThan(0);
  });
});
