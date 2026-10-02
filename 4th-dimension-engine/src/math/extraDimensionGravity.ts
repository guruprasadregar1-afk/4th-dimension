/**
 * Extra Dimension Gravitational Force Law (3+n Spatial Dimensions on Compact Torus).
 *
 * CONVENTIONS:
 * - R: Compactification radius of the n-torus T^n.
 * - Torus Circumference: L = 2 * pi * R.
 * - KK Mass Modes: Kaluza-Klein excitation modes have effective masses m_p = |p| / R for p in Z^n.
 *
 * DUAL FORMULATIONS:
 * 1. Image Sum (Direct spatial sum over lattice images in R^3 x T^n)
 *    f_image(r) = N(R,n) * r * sum_{|k|<=K} (r^2 + (2*pi*R*|k|)^2)^(-(n+1)/2) + Tail_Correction
 *
 * 2. Kaluza-Klein (KK) Mode Sum (Momentum dual sum over Fourier modes)
 *    f_kk(r) = sum_{|p|<=P} exp(-|p| * r / R)
 *
 * 3. Exact Closed-Form for n=1:
 *    f(r) = coth(r / (2R))
 *    Derived via Poisson summation identity:
 *      sum_{k in Z} 1 / (r^2 + (2*pi*R*k)^2) = (1 / (2*r*R)) * coth(r / (2R))
 *
 * CONTINUUM TAIL ESTIMATOR CORRECTION DOCUMENTATION:
 * - Measured behavior:
 *   The earlier estimator returned exactly half the correct tail at r/R=1 for n=2,3 and K=10..50
 *   (e.g., for n=2, K=10: 7.9577e-3 vs correct 1.5915e-2; for n=3, K=10: 1.0132e-2 vs correct 2.0261e-2).
 * - Corrected version:
 *   The continuum tail correction I_tail(r, R, n, K) evaluates the exact continuous radial
 *   integral over u = |k| > K:
 *     n=1: I_tail = (2 / pi) * arctan(r / (2 * pi * R * K))
 *     n=2: I_tail = r / sqrt(r^2 + (2 * pi * R * K)^2)
 *     n=3: I_tail = (2 / pi) * [ (2*pi*R*K*r) / (r^2 + (2*pi*R*K)^2) + arctan(r / (2*pi*R*K)) ]
 */

export interface SweepResult {
  n: number;
  R: number; // in micrometers
  crossoverScaleRc: number; // r where f(r) = 1.10 (10% deviation from 3D Newton)
  fAt50Micrometers: number;
  fittedAlpha: number;
  fittedLambda: number; // in micrometers
}

export interface YukawaFitResult {
  alpha: number;
  lambda: number;
  lambdaOverR: number;
  r2: number;
}

// Precomputed integer lattice norm-squared counts: count[m] = count of k in Z^n with |k|^2 = m
const latticeCache = new Map<string, Int32Array>();

export function getLatticeNormSqCounts(n: number, maxRadius: number): Int32Array {
  const key = `${n}_${maxRadius}`;
  const cached = latticeCache.get(key);
  if (cached) return cached;

  const maxNormSq = maxRadius * maxRadius;
  const counts = new Int32Array(maxNormSq + 1);

  if (n === 0) {
    counts[0] = 1;
  } else if (n === 1) {
    for (let k = -maxRadius; k <= maxRadius; k++) {
      counts[k * k]++;
    }
  } else if (n === 2) {
    for (let k1 = -maxRadius; k1 <= maxRadius; k1++) {
      const k1sq = k1 * k1;
      for (let k2 = -maxRadius; k2 <= maxRadius; k2++) {
        const normSq = k1sq + k2 * k2;
        if (normSq <= maxNormSq) {
          counts[normSq]++;
        }
      }
    }
  } else if (n === 3) {
    for (let k1 = -maxRadius; k1 <= maxRadius; k1++) {
      const k1sq = k1 * k1;
      for (let k2 = -maxRadius; k2 <= maxRadius; k2++) {
        const k12sq = k1sq + k2 * k2;
        if (k12sq > maxNormSq) continue;
        for (let k3 = -maxRadius; k3 <= maxRadius; k3++) {
          const normSq = k12sq + k3 * k3;
          if (normSq <= maxNormSq) {
            counts[normSq]++;
          }
        }
      }
    }
  } else {
    throw new Error(`Unsupported extra dimension count n=${n}. Supported: 0, 1, 2, 3.`);
  }

  latticeCache.set(key, counts);
  return counts;
}

/**
 * Normalization factor N(R, n) ensuring f(r) -> 1 as r >> R.
 * Formula: N(R, n) = (2 * pi * R)^n * gamma((n + 1) / 2) / pi^((n + 1) / 2)
 */
export function imageSumNormalization(R: number, n: number): number {
  if (n === 0) return 1.0;
  if (n === 1) return 2.0 * R;
  if (n === 2) return 2.0 * Math.PI * R * R;
  if (n === 3) return 8.0 * Math.PI * R * R * R;

  let gammaVal = 1.0;
  if (n === 1) gammaVal = 1.0;
  else if (n === 2) gammaVal = Math.sqrt(Math.PI) / 2.0;
  else if (n === 3) gammaVal = 1.0;

  return (Math.pow(2.0 * Math.PI * R, n) * gammaVal) / Math.pow(Math.PI, (n + 1) / 2.0);
}

/**
 * Exact analytic integral of the neglected image sum continuum tail for |k| > K.
 *
 * Formulas:
 * n=1: I_tail = (2 / pi) * arctan(r / (2 * pi * R * K))
 * n=2: I_tail = r / sqrt(r^2 + (2 * pi * R * K)^2)
 * n=3: I_tail = (2 / pi) * [ (2*pi*R*K*r) / (r^2 + (2*pi*R*K)^2) + arctan(r / (2*pi*R*K)) ]
 */
export function imageSumContinuumTail(r: number, R: number, n: number, K: number): number {
  if (n === 0 || K <= 0) return 0.0;
  const A = 2.0 * Math.PI * R * K;
  if (n === 1) {
    return (2.0 / Math.PI) * Math.atan(r / A);
  }
  if (n === 2) {
    return r / Math.sqrt(r * r + A * A);
  }
  if (n === 3) {
    return (2.0 / Math.PI) * ((A * r) / (r * r + A * A) + Math.atan(r / A));
  }
  return 0.0;
}

/**
 * Method 1: Potential Ratio Image Sum.
 * f(r) = N * r * sum_{|k|<=K} (r^2 + (2*pi*R*|k|)^2)^(-(n+1)/2) + [optional continuum tail]
 */
export function potentialRatioImageSum(
  r: number,
  R: number,
  n: number,
  K: number,
  includeTail: boolean = false
): number {
  if (n === 0) return 1.0;
  const N = imageSumNormalization(R, n);
  const normSqCounts = getLatticeNormSqCounts(n, K);
  const exponent = -(n + 1) / 2.0;
  const factor = 2.0 * Math.PI * R;
  const factorSq = factor * factor;
  const rSq = r * r;

  let sum = 0.0;
  for (let m = 0; m <= K * K; m++) {
    const count = normSqCounts[m];
    if (count > 0) {
      const distSq = rSq + factorSq * m;
      sum += count * Math.pow(distSq, exponent);
    }
  }
  let result = N * r * sum;
  if (includeTail) {
    result += imageSumContinuumTail(r, R, n, K);
  }
  return result;
}

/**
 * Reports exact image sum tail estimate (continuum tail).
 */
export function imageSumTailEstimate(r: number, R: number, n: number, K: number): number {
  return imageSumContinuumTail(r, R, n, K);
}

/**
 * Method 2: Potential Ratio Kaluza-Klein Mode Sum.
 * f(r) = sum_{|p|<=P} exp(-|p| * r / R)
 */
export function potentialRatioKKSum(r: number, R: number, n: number, P: number): number {
  if (n === 0) return 1.0;
  const normSqCounts = getLatticeNormSqCounts(n, P);
  const rOverR = r / R;

  let sum = 0.0;
  for (let m = 0; m <= P * P; m++) {
    const count = normSqCounts[m];
    if (count > 0) {
      const norm = Math.sqrt(m);
      sum += count * Math.exp(-norm * rOverR);
    }
  }
  return sum;
}

/**
 * KK sum truncation tail estimate for |p| > P.
 */
export function kkSumTailEstimate(r: number, R: number, n: number, P: number): number {
  if (n === 0 || P <= 0) return 0.0;
  const a = (P * r) / R;
  const expA = Math.exp(-a);
  const rOverR = r / R;

  if (n === 1) {
    return (2.0 / rOverR) * expA;
  }
  if (n === 2) {
    return ((2.0 * Math.PI) / (rOverR * rOverR)) * (a + 1.0) * expA;
  }
  if (n === 3) {
    return ((4.0 * Math.PI) / Math.pow(rOverR, 3)) * (a * a + 2.0 * a + 2.0) * expA;
  }
  return 0.0;
}

/**
 * Method 3: Closed form for n=1: f(r) = coth(r / (2R))
 */
export function n1ClosedForm(r: number, R: number): number {
  const x = r / (2.0 * R);
  if (x < 1e-6) {
    return 1.0 / x + x / 3.0;
  }
  return 1.0 / Math.tanh(x);
}

/**
 * Evaluates potential ratio choosing optimal method or exact method specified.
 */
export function potentialRatio(
  r: number,
  R: number,
  n: number,
  options?: { method?: 'image' | 'kk' | 'closed'; K?: number; P?: number; includeTail?: boolean }
): number {
  if (n === 0) return 1.0;
  const method = options?.method ?? (r < R ? 'image' : 'kk');
  const K = options?.K ?? 50;
  const P = options?.P ?? 50;
  const includeTail = options?.includeTail ?? true;

  if (method === 'closed' || (n === 1 && options?.method === undefined)) {
    if (n === 1) return n1ClosedForm(r, R);
  }
  if (method === 'image') {
    return potentialRatioImageSum(r, R, n, K, includeTail);
  }
  return potentialRatioKKSum(r, R, n, P);
}

/**
 * Force Ratio F_ratio(r) = F(r) / F_Newton(r) = f(r) - r * f'(r).
 * Supports analytic evaluation (via image sum derivative) or numerical central difference.
 */
export function forceRatio(
  r: number,
  R: number,
  n: number,
  options?: { method?: 'analytic' | 'numerical'; K?: number; P?: number }
): number {
  if (n === 0) return 1.0;
  const method = options?.method ?? 'analytic';
  const K = options?.K ?? 50;

  if (method === 'analytic') {
    const N = imageSumNormalization(R, n);
    const normSqCounts = getLatticeNormSqCounts(n, K);
    const exponent = -(n + 3) / 2.0;
    const factor = 2.0 * Math.PI * R;
    const factorSq = factor * factor;
    const rSq = r * r;

    let sum = 0.0;
    for (let m = 0; m <= K * K; m++) {
      const count = normSqCounts[m];
      if (count > 0) {
        const distSq = rSq + factorSq * m;
        sum += count * Math.pow(distSq, exponent);
      }
    }
    return N * (1.0 + n) * Math.pow(r, 3) * sum;
  }

  // Numerical central difference
  const h = 1e-6 * r;
  const fPlus = potentialRatio(r + h, R, n, { K, P: options?.P ?? K });
  const fMinus = potentialRatio(r - h, R, n, { K, P: options?.P ?? K });
  const dfdr = (fPlus - fMinus) / (2.0 * h);
  const fVal = potentialRatio(r, R, n, { K, P: options?.P ?? K });

  return fVal - r * dfdr;
}

/**
 * Least-squares fit of f(r) = 1 + alpha * exp(-r / lambda) over [rMin, rMax].
 */
export function fitYukawa(
  R: number,
  n: number,
  rMin: number,
  rMax: number,
  numPoints: number = 100,
  K: number = 50,
  P: number = 50
): YukawaFitResult {
  if (n === 0) {
    return { alpha: 0.0, lambda: R, lambdaOverR: 1.0, r2: 1.0 };
  }

  const xs: number[] = [];
  const ys: number[] = [];

  for (let i = 0; i < numPoints; i++) {
    const r = rMin + (i / (numPoints - 1)) * (rMax - rMin);
    const fVal = potentialRatio(r, R, n, { K, P });
    const delta = fVal - 1.0;
    if (delta > 1e-15) {
      xs.push(r);
      ys.push(Math.log(delta));
    }
  }

  const M = xs.length;
  if (M < 2) {
    return { alpha: 2 * n, lambda: R, lambdaOverR: 1.0, r2: 0.0 };
  }

  let sumX = 0.0;
  let sumY = 0.0;
  let sumXY = 0.0;
  let sumX2 = 0.0;

  for (let i = 0; i < M; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumX2 += xs[i] * xs[i];
  }

  const denom = M * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-20) {
    return { alpha: 2 * n, lambda: R, lambdaOverR: 1.0, r2: 0.0 };
  }

  const slope = (M * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / M;

  const lambda = -1.0 / slope;
  const alpha = Math.exp(intercept);

  const meanY = sumY / M;
  let ssTot = 0.0;
  let ssRes = 0.0;
  for (let i = 0; i < M; i++) {
    const yPred = intercept + slope * xs[i];
    ssRes += (ys[i] - yPred) * (ys[i] - yPred);
    ssTot += (ys[i] - meanY) * (ys[i] - meanY);
  }
  const r2 = ssTot > 0 ? 1.0 - ssRes / ssTot : 1.0;

  return { alpha, lambda, lambdaOverR: lambda / R, r2 };
}

/**
 * Crossover scale r_c definition: Distance r at which f(r) = 1.10 (10% deviation from 3D Newton).
 */
export function sweepParameters(
  nValues: number[] = [1, 2, 3],
  RValuesMicrometers: number[] = [10, 44, 100]
): SweepResult[] {
  const results: SweepResult[] = [];

  for (const n of nValues) {
    for (const RMicrons of RValuesMicrometers) {
      const R = RMicrons * 1e-6;

      let rLow = 0.01 * R;
      let rHigh = 20.0 * R;
      let rCrossover = R;

      for (let step = 0; step < 50; step++) {
        const rMid = 0.5 * (rLow + rHigh);
        const fMid = potentialRatio(rMid, R, n, { K: 50, P: 50 });
        if (fMid > 1.10) {
          rLow = rMid;
        } else {
          rHigh = rMid;
        }
        rCrossover = rMid;
      }

      const r50Microns = 50e-6;
      const fAt50 = potentialRatio(r50Microns, R, n, { K: 50, P: 50 });

      const fit = fitYukawa(R, n, R, 5 * R, 100, 50, 50);

      results.push({
        n,
        R: RMicrons,
        crossoverScaleRc: rCrossover * 1e6,
        fAt50Micrometers: fAt50,
        fittedAlpha: fit.alpha,
        fittedLambda: fit.lambda * 1e6,
      });
    }
  }

  return results;
}
