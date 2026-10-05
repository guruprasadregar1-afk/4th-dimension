'use client';

import { useMemo, useState } from 'react';
import {
  fitYukawa,
  forceRatio,
  imageSumTailEstimate,
  n1ClosedForm,
  potentialRatio,
  potentialRatioImageSum,
  potentialRatioKKSum,
  sweepParameters,
} from '@/lib/compactDimension/extraDimensionGravity';

interface ChartPoint {
  r: number; // in micrometers
  exact: number; // excess (V/V_N - 1)
  leadingMode: number; // 2n * exp(-r/R)
  kapnerMode: number | null; // (8/3) * exp(-r/R) for n=1 only
}

interface CheckResult {
  name: string;
  measured: string;
  threshold: string;
  pass: boolean;
}

export function CompactDimensionExplorer() {
  const [n, setN] = useState<1 | 2 | 3>(1);
  const [R, setR] = useState<number>(44); // R in micrometers

  // Checks state
  const [checksRun, setChecksRun] = useState<boolean>(false);
  const [checksRuntimeMs, setChecksRuntimeMs] = useState<number>(0);
  const [checkResults, setCheckResults] = useState<CheckResult[]>([]);

  // Calculate chart series and measure timing
  const { points, calcTimeMs } = useMemo(() => {
    const start = performance.now();
    const RMeters = R * 1e-6;
    const pts: ChartPoint[] = [];

    // 64 log-spaced points from r = 10 to 1000 micrometers
    for (let i = 0; i < 64; i++) {
      const logR = Math.log10(10) + (i / 63) * (Math.log10(1000) - Math.log10(10));
      const rMicrons = Math.pow(10, logR);
      const rMeters = rMicrons * 1e-6;
      const rOverR = rMeters / RMeters;

      // Exact excess calculation per spec
      let exactExcess = 0;
      if (n === 1) {
        exactExcess = 2.0 / Math.expm1(rOverR); // coth(r/2R) - 1
      } else {
        if (rOverR >= 0.8) {
          const P = Math.max(1, Math.ceil(22.0 / rOverR));
          exactExcess = potentialRatioKKSum(rMeters, RMeters, n, P) - 1.0;
        } else {
          const K = n === 2 ? 25 : 10;
          exactExcess = potentialRatioImageSum(rMeters, RMeters, n, K, true) - 1.0;
        }
      }

      const leadingMode = 2.0 * n * Math.exp(-rOverR);
      const kapnerMode = n === 1 ? (8.0 / 3.0) * Math.exp(-rOverR) : null;

      if (exactExcess >= 1e-4) {
        pts.push({
          r: rMicrons,
          exact: exactExcess,
          leadingMode,
          kapnerMode,
        });
      }
    }

    const elapsed = performance.now() - start;
    return { points: pts, calcTimeMs: elapsed };
  }, [n, R]);

  // Metric Cards calculations
  const excessAt52Percent = useMemo(() => {
    const RMeters = R * 1e-6;
    const r52Meters = 52e-6;
    const fVal = potentialRatio(r52Meters, RMeters, n);
    return (fVal - 1.0) * 100.0;
  }, [n, R]);

  const crossoverScaleRc = useMemo(() => {
    let logLow = Math.log(1.0);
    let logHigh = Math.log(5000.0);
    let rCrossover = R;
    const RMeters = R * 1e-6;

    for (let iter = 0; iter < 50; iter++) {
      const logMid = 0.5 * (logLow + logHigh);
      const rMid = Math.exp(logMid);
      const fMid = potentialRatio(rMid * 1e-6, RMeters, n);
      if (fMid - 1.0 > 0.10) {
        logLow = logMid;
      } else {
        logHigh = logMid;
      }
      rCrossover = rMid;
    }
    return rCrossover;
  }, [n, R]);

  const statusVsPublishedLimit = useMemo(() => {
    if (n === 1) {
      if (R < 30) {
        return 'R is below the 2020 limit (radius < 30 micrometers)';
      }
      return 'R is at or above the 2020 limit';
    }
    return 'Limit for equal-size dimensions not computed here';
  }, [n, R]);

  // Multi-window Yukawa fits
  const yukawaWindowResults = useMemo(() => {
    const RMeters = R * 1e-6;
    const windows = [
      { label: '[0.5R, 2R]', minM: 0.5, maxM: 2.0 },
      { label: '[1.0R, 5R]', minM: 1.0, maxM: 5.0 },
      { label: '[4.0R, 15R]', minM: 4.0, maxM: 15.0 },
      { label: '[10.0R, 30R]', minM: 10.0, maxM: 30.0 },
    ];

    const results: Array<{ dim: number; window: string; alpha: number; lambdaOverR: number; r2: number }> = [];

    for (const dim of [1, 2, 3] as const) {
      for (const w of windows) {
        const fit = fitYukawa(RMeters, dim, w.minM * RMeters, w.maxM * RMeters, 120, 100, 100);
        results.push({
          dim,
          window: w.label,
          alpha: fit.alpha,
          lambdaOverR: fit.lambdaOverR,
          r2: fit.r2,
        });
      }
    }

    return results;
  }, [R]);

  // Parameter sweep
  const sweepTableResults = useMemo(() => {
    return sweepParameters([1, 2, 3], [10, 44, 100]);
  }, []);

  // Run Experiment 008 checks in browser
  const handleRunChecks = () => {
    const start = performance.now();
    const results: CheckResult[] = [];

    const R_test = 1.0;

    // 1a: Tail-corrected image-vs-KK max relative diff < 1e-4
    let maxDiff1a = 0;
    for (const dim of [1, 2, 3]) {
      for (const rOverR of [0.3, 0.5, 1.0, 1.5, 2.0, 3.0]) {
        const r = rOverR * R_test;
        const img = potentialRatioImageSum(r, R_test, dim, 100, true);
        const kk = potentialRatioKKSum(r, R_test, dim, 200);
        const diff = Math.abs(img - kk) / kk;
        if (diff > maxDiff1a) maxDiff1a = diff;
      }
    }
    results.push({
      name: '1a: Tail-corrected Image vs KK Max RelDiff (r/R in [0.3,3], K=100, P=200)',
      measured: maxDiff1a.toExponential(4),
      threshold: '< 1e-4',
      pass: maxDiff1a < 1e-4,
    });

    // 1b: Tail estimator / actual error ratio in [0.98, 1.02] at 9 points
    const points1b = [
      { rOverR: 0.3, K: 50 },
      { rOverR: 1.0, K: 100 },
      { rOverR: 3.0, K: 200 },
    ];
    let allRatiosPass = true;
    const ratioStrings: string[] = [];

    for (const dim of [1, 2, 3]) {
      for (const pt of points1b) {
        const r = pt.rOverR * R_test;
        const fRef = potentialRatioImageSum(r, R_test, dim, 300, true);
        const fUncorr = potentialRatioImageSum(r, R_test, dim, pt.K, false);
        const actualErr = Math.abs(fRef - fUncorr);
        const tailEst = imageSumTailEstimate(r, R_test, dim, pt.K);
        const ratio = tailEst / actualErr;
        ratioStrings.push(`n=${dim},r/R=${pt.rOverR}:${ratio.toFixed(4)}`);
        if (ratio < 0.98 || ratio > 1.02) allRatiosPass = false;
      }
    }
    results.push({
      name: '1b: Tail Estimator / Actual Error Ratio (9 Points)',
      measured: ratioStrings.slice(0, 3).join(', ') + '...',
      threshold: '[0.98, 1.02]',
      pass: allRatiosPass,
    });

    // 1c: n=1 KK vs coth(r/2R) < 1e-12
    let maxDiff1c = 0;
    for (const rOverR of [1.0, 2.0, 5.0, 10.0, 20.0]) {
      const r = rOverR * R_test;
      const cothVal = n1ClosedForm(r, R_test);
      const kkVal = potentialRatioKKSum(r, R_test, 1, 100);
      const diff = Math.abs(kkVal - cothVal) / cothVal;
      if (diff > maxDiff1c) maxDiff1c = diff;
    }
    results.push({
      name: '1c: n=1 KK sum vs coth(r/2R) (r/R in [1,20], P=100)',
      measured: maxDiff1c.toExponential(4),
      threshold: '< 1e-12',
      pass: maxDiff1c < 1e-12,
    });

    // 1d: Far-window fit [10R,30R]
    let pass1d = true;
    const maxErrors1d: string[] = [];
    for (const dim of [1, 2, 3]) {
      const fit = fitYukawa(R_test, dim, 10 * R_test, 30 * R_test, 150, 100, 100);
      const alphaErr = Math.abs(fit.alpha / (2 * dim) - 1.0);
      const lambdaErr = Math.abs(fit.lambdaOverR - 1.0);
      maxErrors1d.push(`n=${dim}:|a/2n-1|=${alphaErr.toFixed(4)},|l/R-1|=${lambdaErr.toFixed(4)}`);
      if (alphaErr >= 0.03 || lambdaErr >= 0.005) pass1d = false;
    }
    results.push({
      name: '1d: Far-Window Yukawa Fit [10R,30R]',
      measured: maxErrors1d.join(' | '),
      threshold: '|alpha/(2n)-1|<0.03 & |lambda/R-1|<0.005',
      pass: pass1d,
    });

    // 1e: n=1, R=44 um: f(r) vs 1+(8/3)exp(-r/R) < 0.05
    const R_44 = 44e-6;
    let maxDiff1e = 0;
    for (let i = 0; i < 100; i++) {
      const r = (55e-6) + (i / 99) * (300e-6 - 55e-6);
      const fExact = n1ClosedForm(r, R_44);
      const gApprox = 1.0 + (8.0 / 3.0) * Math.exp(-r / R_44);
      const diff = Math.abs(fExact - gApprox) / fExact;
      if (diff > maxDiff1e) maxDiff1e = diff;
    }
    results.push({
      name: '1e: n=1, R=44 um: f(r) vs 1+(8/3)e^(-r/R) RelDiff ([55,300] um)',
      measured: maxDiff1e.toFixed(6),
      threshold: '< 0.05',
      pass: maxDiff1e < 0.05,
    });

    // 1f: Scale Invariance across R in {10,44,100} < 1e-9
    let pass1f = true;
    let maxDiff1f = 0;
    for (const dim of [1, 2, 3]) {
      const lList = [10, 44, 100].map((rMicrons) => fitYukawa(rMicrons * 1e-6, dim, rMicrons * 1e-6, 5 * rMicrons * 1e-6).lambdaOverR);
      const diff = Math.max(Math.abs(lList[1] - lList[0]), Math.abs(lList[2] - lList[0]));
      if (diff > maxDiff1f) maxDiff1f = diff;
      if (diff >= 1e-9) pass1f = false;
    }
    results.push({
      name: '1f: Scale Invariance of Fitted lambda/R across R in {10,44,100} um',
      measured: maxDiff1f.toExponential(4),
      threshold: '< 1e-9',
      pass: pass1f,
    });

    // Force log-log slope at r = 1e-4 * R equals -(n+2) within 1e-3
    let passSlope = true;
    const slopes: string[] = [];
    for (const dim of [0, 1, 2, 3]) {
      const r1 = 1e-4 * R_test;
      const r2 = 1.01e-4 * R_test;
      const F1 = (1.0 / (r1 * r1)) * forceRatio(r1, R_test, dim, { method: 'analytic', K: 100 });
      const F2 = (1.0 / (r2 * r2)) * forceRatio(r2, R_test, dim, { method: 'analytic', K: 100 });
      const slope = (Math.log(F2) - Math.log(F1)) / (Math.log(r2) - Math.log(r1));
      const expSlope = -(dim + 2);
      slopes.push(`n=${dim}:${slope.toFixed(4)}`);
      if (Math.abs(slope - expSlope) >= 1e-3) passSlope = false;
    }
    results.push({
      name: 'Force Log-Log Slope for r=1e-4*R (expected -(n+2))',
      measured: slopes.join(', '),
      threshold: '|slope - (-(n+2))| < 1e-3',
      pass: passSlope,
    });

    // |f(20R) - 1| < 1e-6
    let passLargeR = true;
    const f20Vals: string[] = [];
    for (const dim of [1, 2, 3]) {
      const f20 = potentialRatioKKSum(20 * R_test, R_test, dim, 20);
      const diff = Math.abs(f20 - 1.0);
      f20Vals.push(`n=${dim}:${diff.toExponential(2)}`);
      if (diff >= 1e-6) passLargeR = false;
    }
    results.push({
      name: 'Large-R Limit |f(20R) - 1|',
      measured: f20Vals.join(', '),
      threshold: '< 1e-6',
      pass: passLargeR,
    });

    const elapsed = performance.now() - start;
    setChecksRuntimeMs(elapsed);
    setCheckResults(results);
    setChecksRun(true);
  };

  // SVG Chart Geometry Constants
  const width = 800;
  const height = 400;
  const margin = { top: 30, right: 30, bottom: 50, left: 65 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // Log-log mapping functions
  const mapX = (rMicrons: number) => {
    const logVal = Math.log10(rMicrons);
    const norm = (logVal - Math.log10(10)) / (Math.log10(1000) - Math.log10(10));
    return margin.left + Math.max(0, Math.min(1, norm)) * innerW;
  };

  const mapY = (excessVal: number) => {
    const clamped = Math.max(1e-4, Math.min(1e5, excessVal));
    const logVal = Math.log10(clamped);
    const norm = (logVal - (-4)) / (5 - (-4)); // log range -4 to 5
    return margin.top + (1 - Math.max(0, Math.min(1, norm))) * innerH;
  };

  // Generate SVG path commands
  const pathExact = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${mapX(p.r).toFixed(2)} ${mapY(p.exact).toFixed(2)}`).join(' ');
  const pathLeading = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${mapX(p.r).toFixed(2)} ${mapY(p.leadingMode).toFixed(2)}`).join(' ');
  const pathKapner = n === 1
    ? points.filter((p) => p.kapnerMode !== null).map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${mapX(p.r).toFixed(2)} ${mapY(p.kapnerMode!).toFixed(2)}`).join(' ')
    : '';

  const x52 = mapX(52);

  return (
    <div className="flex h-full min-h-screen flex-col gap-8 max-w-6xl mx-auto w-full p-4 sm:p-6 text-foreground">
      {/* Title Header */}
      <div className="flex flex-col gap-2 border-b border-surface-border pb-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-semibold text-accent border border-accent/40">
            Platform Research Module
          </span>
          <span className="text-xs text-muted">Experiment 008</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Compact Extra Dimension Force Law (3+n Spatial Dimensions)
        </h1>
        <p className="text-sm text-muted">
          Dual Poisson-summed spatial image &amp; momentum KK series calculations on a compact torus $T^n$.
        </p>
      </div>

      {/* SECTION 1: EXPLORER */}
      <section className="flex flex-col gap-6 rounded-xl border border-surface-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-foreground">1. Interactive Model Explorer</h2>
          <div className="text-xs text-muted font-mono bg-background px-3 py-1.5 rounded border border-surface-border">
            Calc latency: <span className="font-semibold text-accent">{calcTimeMs.toFixed(2)} ms</span>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-background/50 p-4 rounded-lg border border-surface-border">
          {/* Dimension Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Extra Dimensions (n)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setN(val as 1 | 2 | 3)}
                  className={`flex-1 rounded-md py-2 text-sm font-semibold transition border ${
                    n === val
                      ? 'bg-accent/20 text-accent border-accent/50 shadow-sm'
                      : 'bg-surface text-muted border-surface-border hover:text-foreground'
                  }`}
                >
                  n = {val}
                </button>
              ))}
            </div>
          </div>

          {/* Torus Radius Slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="radius-slider" className="text-xs font-semibold uppercase tracking-wider text-muted">
                Compactification Radius R (&mu;m)
              </label>
              <span className="text-sm font-bold text-accent font-mono">{R} &mu;m</span>
            </div>
            <input
              id="radius-slider"
              type="range"
              min={5}
              max={60}
              step={1}
              value={R}
              onChange={(e) => setR(Number(e.target.value))}
              className="w-full cursor-pointer accent-accent"
            />
            <div className="flex justify-between text-[11px] text-muted font-mono mt-1">
              <span className={R === 30 ? 'text-accent font-bold' : ''}>30 &mu;m (Lee 2020 limit)</span>
              <span className={R === 44 ? 'text-accent font-bold' : ''}>44 &mu;m (Kapner 2007 limit)</span>
            </div>
          </div>
        </div>

        {/* SVG Log-Log Chart */}
        <div className="flex flex-col gap-2">
          <div className="relative w-full overflow-x-auto rounded-lg border border-surface-border bg-background p-2">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto text-foreground"
              aria-label="Log-log plot of potential excess over Newtonian gravity vs separation distance r"
              role="img"
            >
              {/* Grid Lines */}
              {[10, 100, 1000].map((rVal) => {
                const x = mapX(rVal);
                return (
                  <g key={`xgrid-${rVal}`}>
                    <line x1={x} y1={margin.top} x2={x} y2={height - margin.bottom} stroke="currentColor" strokeOpacity={0.12} strokeWidth={1} />
                    <text x={x} y={height - margin.bottom + 20} textAnchor="middle" fill="currentColor" fillOpacity={0.7} fontSize={11} fontFamily="sans-serif">
                      {rVal} &mu;m
                    </text>
                  </g>
                );
              })}

              {[-4, -2, 0, 2, 4].map((exponent) => {
                const val = Math.pow(10, exponent);
                const y = mapY(val);
                return (
                  <g key={`ygrid-${exponent}`}>
                    <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke="currentColor" strokeOpacity={0.12} strokeWidth={1} />
                    <text x={margin.left - 8} y={y + 4} textAnchor="end" fill="currentColor" fillOpacity={0.7} fontSize={11} fontFamily="sans-serif">
                      10<sup>{exponent}</sup>
                    </text>
                  </g>
                );
              })}

              {/* Series (iv): Vertical dotted line at r = 52 um */}
              <line
                x1={x52}
                y1={margin.top}
                x2={x52}
                y2={height - margin.bottom}
                stroke="#a855f7"
                strokeWidth={1.8}
                strokeDasharray="2 2"
              />
              <text x={x52 + 5} y={margin.top + 15} fill="#a855f7" fontSize={10} fontWeight="bold" fontFamily="sans-serif">
                r = 52 &mu;m (Lee 2020)
              </text>

              {/* Series (ii): Leading mode 2n*exp(-r/R) */}
              {pathLeading && (
                <path d={pathLeading} fill="none" stroke="#898781" strokeWidth={2} strokeDasharray="6 4" />
              )}

              {/* Series (iii): Kapner mode (8/3)*exp(-r/R) for n=1 */}
              {n === 1 && pathKapner && (
                <path d={pathKapner} fill="none" stroke="#eb6834" strokeWidth={2} strokeDasharray="3 3" />
              )}

              {/* Series (i): Exact model */}
              {pathExact && (
                <path d={pathExact} fill="none" stroke="#2a78d6" strokeWidth={2.5} />
              )}

              {/* Axis Labels */}
              <text x={width / 2} y={height - 10} textAnchor="middle" fill="currentColor" fontSize={12} fontWeight="bold">
                Separation r (&mu;m)
              </text>
              <text
                x={-height / 2}
                y={18}
                transform="rotate(-90)"
                textAnchor="middle"
                fill="currentColor"
                fontSize={12}
                fontWeight="bold"
              >
                Potential Excess V/V_N - 1
              </text>
            </svg>
          </div>

          {/* Custom Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs font-medium">
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-6 bg-[#2a78d6]" />
              <span>Exact Model (blue solid)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-6 bg-[#898781] border-dashed border-t-2" />
              <span>Leading Mode 2n&middot;e<sup>-r/R</sup> (gray dashed)</span>
            </div>
            {n === 1 && (
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-6 bg-[#eb6834] border-dashed border-t-2" />
                <span>Kapner Mapping (8/3)e<sup>-r/R</sup> (orange dashed)</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-6 bg-[#a855f7] border-dotted border-t-2" />
              <span>r = 52 &mu;m (Lee 2020 test)</span>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Card (a) */}
          <div className="flex flex-col gap-1 rounded-lg border border-surface-border bg-background p-4 shadow-sm">
            <span className="text-xs font-semibold text-muted">Excess at 52 &mu;m</span>
            <span className="text-2xl font-extrabold text-accent font-mono">
              {excessAt52Percent.toFixed(2)}%
            </span>
            <span className="text-[11px] text-muted">V/V_N - 1 percentage deviation</span>
          </div>

          {/* Card (b) */}
          <div className="flex flex-col gap-1 rounded-lg border border-surface-border bg-background p-4 shadow-sm">
            <span className="text-xs font-semibold text-muted">Crossover Scale r_c (10% excess)</span>
            <span className="text-2xl font-extrabold text-foreground font-mono">
              {crossoverScaleRc.toFixed(2)} &mu;m
            </span>
            <span className="text-[11px] text-muted">Distance where f(r_c) = 1.10</span>
          </div>

          {/* Card (c) */}
          <div className="flex flex-col gap-1 rounded-lg border border-surface-border bg-background p-4 shadow-sm">
            <span className="text-xs font-semibold text-muted">Status vs Published Limit</span>
            <span className="text-sm font-bold text-foreground mt-1">
              {statusVsPublishedLimit}
            </span>
            <span className="text-[11px] text-muted">Compared against Lee et al. (2020)</span>
          </div>
        </div>
      </section>

      {/* SECTION 2: EXPERIMENT 008 CHECKS */}
      <section className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">2. Experiment 008 Automated Checks</h2>
            <p className="text-xs text-muted">Run all analytical assertions in the browser client.</p>
          </div>
          <div className="flex items-center gap-3">
            {checksRun && (
              <span className="text-xs text-muted font-mono">
                Runtime: <span className="font-semibold text-accent">{checksRuntimeMs.toFixed(1)} ms</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleRunChecks}
              className="rounded-md bg-accent px-4 py-2 text-xs font-bold text-background shadow transition hover:opacity-90"
            >
              Run Checks
            </button>
          </div>
        </div>

        {checksRun && (
          <div className="overflow-x-auto rounded-lg border border-surface-border bg-background mt-2">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-surface-border bg-surface text-muted uppercase tracking-wider font-mono">
                <tr>
                  <th className="p-3">Check Description</th>
                  <th className="p-3">Measured Value</th>
                  <th className="p-3">Threshold</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border font-mono">
                {checkResults.map((item, idx) => (
                  <tr key={idx} className="hover:bg-surface/50 transition">
                    <td className="p-3 font-sans font-medium text-foreground">{item.name}</td>
                    <td className="p-3 text-muted">{item.measured}</td>
                    <td className="p-3 text-muted">{item.threshold}</td>
                    <td className="p-3">
                      {item.pass ? (
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-400 border border-emerald-500/30">
                          PASS
                        </span>
                      ) : (
                        <span className="rounded bg-rose-500/20 px-2 py-0.5 font-bold text-rose-400 border border-rose-500/30">
                          FAIL
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 3: YUKAWA FIT WINDOWS */}
      <section className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-foreground">3. Yukawa Fit Windows Analysis</h2>
          <p className="text-xs text-muted">
            Fitting f(r) = 1 + &alpha;&middot;e<sup>-r/&lambda;</sup> over various radial windows [r<sub>min</sub>, r<sub>max</sub>].
            Note: Only the far windows [4R, 15R] and [10R, 30R] approach the leading KK mode limit (2n, 1.0000).
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-surface-border bg-background">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-surface-border bg-surface text-muted uppercase tracking-wider">
              <tr>
                <th className="p-3">Dimension (n)</th>
                <th className="p-3">Fitting Window</th>
                <th className="p-3">Fitted &alpha;</th>
                <th className="p-3">Fitted &lambda; / R</th>
                <th className="p-3">R<sup>2</sup> Quality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {yukawaWindowResults.map((item, idx) => (
                <tr key={idx} className="hover:bg-surface/50 transition">
                  <td className="p-3 font-semibold text-accent">n = {item.dim}</td>
                  <td className="p-3 text-foreground font-sans font-medium">{item.window}</td>
                  <td className="p-3">{item.alpha.toFixed(4)}</td>
                  <td className="p-3">{item.lambdaOverR.toFixed(4)}</td>
                  <td className="p-3">{item.r2.toFixed(6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 4: PARAMETER SWEEP */}
      <section className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-foreground">4. Compactification Radius &amp; Dimension Sweep</h2>
          <p className="text-xs text-muted">
            Parameter sweep across n in &#123;1, 2, 3&#125; and R in &#123;10, 44, 100&#125; &mu;m.
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-surface-border bg-background">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-surface-border bg-surface text-muted uppercase tracking-wider">
              <tr>
                <th className="p-3">n</th>
                <th className="p-3">R (&mu;m)</th>
                <th className="p-3">Crossover r_c (&mu;m)</th>
                <th className="p-3">f(r = 50 &mu;m)</th>
                <th className="p-3">Fitted &alpha;</th>
                <th className="p-3">Fitted &lambda; (&mu;m)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {sweepTableResults.map((row, idx) => (
                <tr key={idx} className="hover:bg-surface/50 transition">
                  <td className="p-3 font-semibold text-accent">n = {row.n}</td>
                  <td className="p-3">{row.R} &mu;m</td>
                  <td className="p-3">{row.crossoverScaleRc.toFixed(2)} &mu;m</td>
                  <td className="p-3">{row.fAt50Micrometers.toFixed(6)}</td>
                  <td className="p-3">{row.fittedAlpha.toFixed(4)}</td>
                  <td className="p-3">{row.fittedLambda.toFixed(2)} &mu;m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 5: SCOPE NOTE */}
      <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200/90 text-xs leading-relaxed shadow-sm">
        This page shows model predictions for a hypothetical compact extra dimension and compares them with published limits. It is not evidence that an extra dimension exists. Published limits: largest extra dimension, toroidal radius {'<'} 30 micrometers (Lee et al., PRL 124, 101101, 2020); single extra dimension, R {'<'} 44 micrometers (Kapner et al., PRL 98, 021101, 2007).
      </section>
    </div>
  );
}
