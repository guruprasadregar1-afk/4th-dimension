import { describe, expect, it } from 'vitest';
import {
  fitYukawa,
  forceRatio,
  imageSumTailEstimate,
  kkSumTailEstimate,
  n1ClosedForm,
  potentialRatioImageSum,
  potentialRatioKKSum,
  sweepParameters,
} from './extraDimensionGravity';

describe('Experiment 008 Finalized Assertions: Extra Dimension Gravity (3+n dimensions)', () => {
  // --------------------------------------------------------------------------------
  // Legacy / Baseline Assertions (5%, 1%, 1%, R^2 > 0.98)
  // --------------------------------------------------------------------------------
  it('Baseline Check (a): n=1 closed form comparison (Image RelErr < 0.05, KK RelErr < 0.01)', () => {
    const R = 1.0;
    const rValues = [0.05, 0.1, 0.3, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0];

    let maxRelErrImage = 0;
    let maxRelErrKK = 0;

    for (const rOverR of rValues) {
      const r = rOverR * R;
      const expected = n1ClosedForm(r, R);
      const imgVal = potentialRatioImageSum(r, R, 1, 100, true);
      const kkVal = potentialRatioKKSum(r, R, 1, 100);

      const relErrImg = Math.abs(imgVal - expected) / expected;
      const relErrKK = Math.abs(kkVal - expected) / expected;

      if (relErrImg > maxRelErrImage) maxRelErrImage = relErrImg;
      if (relErrKK > maxRelErrKK) maxRelErrKK = relErrKK;
    }

    console.log(`Baseline Assertion (a): maxRelErrImage = ${maxRelErrImage.toExponential(4)} (Threshold: < 0.05 / 5%)`);
    console.log(`Baseline Assertion (a): maxRelErrKK = ${maxRelErrKK.toExponential(4)} (Threshold: < 0.01 / 1%)`);

    expect(maxRelErrImage).toBeLessThan(0.05); // 5% assertion exists
    expect(maxRelErrKK).toBeLessThan(0.01); // 1% assertion exists
  });

  it('Baseline Check (b): Image vs KK overlap maxRelDiff < 0.01 for n=2,3', () => {
    const R = 1.0;
    const rValues = [0.3, 0.5, 1.0, 1.5, 2.0, 3.0];

    for (const n of [2, 3]) {
      let maxRelDiff = 0;
      for (const rOverR of rValues) {
        const r = rOverR * R;
        const imgVal = potentialRatioImageSum(r, R, n, 50, true);
        const kkVal = potentialRatioKKSum(r, R, n, 50);
        const relDiff = Math.abs(imgVal - kkVal) / kkVal;
        if (relDiff > maxRelDiff) maxRelDiff = relDiff;
      }

      console.log(`Baseline Assertion (b) n=${n}: maxRelDiff = ${maxRelDiff.toExponential(4)} (Threshold: < 0.01 / 1%)`);
      expect(maxRelDiff).toBeLessThan(0.01); // 1% assertion exists
    }
  });

  it('Baseline Check (d): Yukawa fit R^2 > 0.98 for n=1,2,3 over [R, 5R]', () => {
    const R = 44e-6;
    for (const n of [1, 2, 3]) {
      const fit = fitYukawa(R, n, R, 5 * R, 100, 50, 50);
      console.log(`Baseline Assertion (d) n=${n}: R^2 = ${fit.r2.toFixed(6)} (Threshold: R^2 > 0.98)`);
      expect(fit.r2).toBeGreaterThan(0.98); // R^2 > 0.98 assertion exists
    }
  });

  // --------------------------------------------------------------------------------
  // Assertion 1a: Tail-corrected image-vs-KK max relative difference < 1e-4 for n=1,2,3
  // --------------------------------------------------------------------------------
  it('1a: Tail-corrected image-vs-KK max relative difference for r/R in [0.3,3], K=100, P=200 is < 1e-4 for n=1,2,3', () => {
    const R = 1.0;
    const rValues = [0.3, 0.5, 1.0, 1.5, 2.0, 3.0];
    const K = 100;
    const P = 200;

    for (const n of [1, 2, 3]) {
      let maxRelDiff = 0;
      for (const rOverR of rValues) {
        const r = rOverR * R;
        const imgVal = potentialRatioImageSum(r, R, n, K, true);
        const kkVal = potentialRatioKKSum(r, R, n, P);
        const relDiff = Math.abs(imgVal - kkVal) / kkVal;
        if (relDiff > maxRelDiff) maxRelDiff = relDiff;
      }

      console.log(`Assertion 1a (n=${n}): Measured Max RelDiff = ${maxRelDiff.toExponential(4)} (Threshold: < 1e-4)`);
      expect(maxRelDiff).toBeLessThan(1e-4);
    }
  });

  // --------------------------------------------------------------------------------
  // Assertion 1b: imageSumTailEstimate / actual error ratio within [0.98, 1.02] at 9 points
  // --------------------------------------------------------------------------------
  it('1b: imageSumTailEstimate / actual truncation error ratio is within [0.98, 1.02] at nine test points', () => {
    const R = 1.0;
    const testCases: Array<{ rOverR: number; K: number }> = [
      { rOverR: 0.3, K: 50 },
      { rOverR: 1.0, K: 100 },
      { rOverR: 3.0, K: 200 },
    ];

    for (const n of [1, 2, 3]) {
      for (const tc of testCases) {
        const r = tc.rOverR * R;
        const fRef = potentialRatioImageSum(r, R, n, 300, true);
        const fKUncorrected = potentialRatioImageSum(r, R, n, tc.K, false);

        const actualError = Math.abs(fRef - fKUncorrected);
        const tailEst = imageSumTailEstimate(r, R, n, tc.K);
        const ratio = tailEst / actualError;

        console.log(`Assertion 1b (n=${n}, r/R=${tc.rOverR}, K=${tc.K}): Measured Tail Ratio = ${ratio.toFixed(4)} (Threshold: [0.98, 1.02])`);
        expect(ratio).toBeGreaterThanOrEqual(0.98);
        expect(ratio).toBeLessThanOrEqual(1.02);
      }
    }
  });

  // --------------------------------------------------------------------------------
  // Assertion 1c: n=1 KK sum vs coth(r/(2R)) < 1e-12 for r/R in [1, 20], P=100
  // --------------------------------------------------------------------------------
  it('1c: n=1 KK sum vs coth(r/(2R)) relative difference is < 1e-12 for r/R in [1, 20], P=100', () => {
    const R = 1.0;
    const rValues = [1.0, 2.0, 5.0, 10.0, 20.0];
    const P = 100;

    let maxRelDiff = 0;
    for (const rOverR of rValues) {
      const r = rOverR * R;
      const expected = n1ClosedForm(r, R);
      const kkVal = potentialRatioKKSum(r, R, 1, P);
      const relDiff = Math.abs(kkVal - expected) / expected;
      if (relDiff > maxRelDiff) maxRelDiff = relDiff;
    }

    console.log(`Assertion 1c: Measured Max RelDiff KK vs coth = ${maxRelDiff.toExponential(4)} (Threshold: < 1e-12)`);
    expect(maxRelDiff).toBeLessThan(1e-12);
  });

  // --------------------------------------------------------------------------------
  // Assertion 1d: Far-window fit [10R,30R]: |alpha/(2n) - 1| < 0.03 and |lambda/R - 1| < 0.005
  // --------------------------------------------------------------------------------
  it('1d: Far-window fit [10R,30R] satisfies |alpha/(2n) - 1| < 0.03 and |lambda/R - 1| < 0.005 for n=1,2,3', () => {
    const R = 1.0;

    for (const n of [1, 2, 3]) {
      const fit = fitYukawa(R, n, 10 * R, 30 * R, 150, 100, 100);
      const alphaErr = Math.abs(fit.alpha / (2 * n) - 1.0);
      const lambdaErr = Math.abs(fit.lambdaOverR - 1.0);

      console.log(
        `Assertion 1d (n=${n}): Measured |alpha/(2n) - 1| = ${alphaErr.toFixed(6)} (Threshold: < 0.03), |lambda/R - 1| = ${lambdaErr.toFixed(6)} (Threshold: < 0.005)`
      );

      expect(alphaErr).toBeLessThan(0.03);
      expect(lambdaErr).toBeLessThan(0.005);
    }
  });

  // --------------------------------------------------------------------------------
  // Assertion 1e: n=1, R=44 um: max relative diff f(r) vs 1+(8/3)exp(-r/R) over [55,300] um < 0.05
  // --------------------------------------------------------------------------------
  it('1e: n=1, R=44 um: max relative difference between f(r) and 1+(8/3)exp(-r/R) over [55,300] um is < 0.05', () => {
    const R = 44e-6; // 44 um
    const rMin = 55e-6;
    const rMax = 300e-6;
    const numPoints = 100;

    let maxRelDiff = 0;

    for (let i = 0; i < numPoints; i++) {
      const r = rMin + (i / (numPoints - 1)) * (rMax - rMin);
      const fExact = n1ClosedForm(r, R);
      const gApprox = 1.0 + (8.0 / 3.0) * Math.exp(-r / R);

      const relDiff = Math.abs(fExact - gApprox) / fExact;
      if (relDiff > maxRelDiff) maxRelDiff = relDiff;
    }

    console.log(`Assertion 1e: Measured Max RelDiff vs (1 + (8/3)e^(-r/R)) = ${maxRelDiff.toFixed(6)} (Threshold: < 0.05)`);
    expect(maxRelDiff).toBeLessThan(0.05);
  });

  // --------------------------------------------------------------------------------
  // Assertion 1f: Scale invariance: fitted lambda/R identical across R in {10,44,100} to 1e-9
  // --------------------------------------------------------------------------------
  it('1f: Scale invariance: fitted lambda/R is identical across R in {10,44,100} um to 1e-9', () => {
    const RValuesMicrons = [10, 44, 100];

    for (const n of [1, 2, 3]) {
      const lambdaOverRList: number[] = [];

      for (const RMicrons of RValuesMicrons) {
        const R = RMicrons * 1e-6;
        const fit = fitYukawa(R, n, R, 5 * R, 100, 50, 50);
        lambdaOverRList.push(fit.lambdaOverR);
      }

      const ref = lambdaOverRList[0];
      let maxDiff = 0;
      for (const val of lambdaOverRList) {
        const diff = Math.abs(val - ref);
        if (diff > maxDiff) maxDiff = diff;
      }

      console.log(`Assertion 1f (n=${n}): Measured Scale Invariance MaxDiff = ${maxDiff.toExponential(4)} (Threshold: < 1e-9)`);
      expect(maxDiff).toBeLessThan(1e-9);
    }
  });
});
