# 4D Representation Engine Experiments & Validation Suite

This directory contains the public, reproducible scientific experiment suite for the **4D Representation Platform**. It packages and validates the core mathematical, topological, and metric algorithms powering the engine—separate from internal CI/CD unit tests.

The methodology and structure follow conventions established by 4D computer vision benchmark suites (such as *Open4D* and *Style4D-Bench*): explicit hypotheses, analytical derivations, empirical test scripts, and published results.

---

## Experiments Overview

| Experiment ID | Title | Objective | Primary Engine Source |
| :--- | :--- | :--- | :--- |
| **001** | [Polytope Geometry Validation](./001-polytope-geometry-validation/README.md) | Topological & metric validation of 4D polytopes (8-cell, 5-cell, 16-cell). | `polytopeGeometry.ts` |
| **002** | [Tesseract Rotation Invariance](./002-tesseract-rotation-invariance/README.md) | Proof of 4D rotation isometry ($d_{4D}$ variance $= 0$) vs. 3D shadow metric distortion. | `hyperplane4d.ts`, `escapePuzzle.ts` |
| **003** | [Gaussian 4D Decomposition Consistency](./003-gaussian-4d-decomposition-consistency/README.md) | Schur complement numerical stability & positive-definiteness across temporal variance. | `gaussian4d.ts` |
| **004** | [Static Scene Rigidity Control](./004-static-scene-rigidity-control/README.md) | Verification that static 3D scenes (Truck, Dr Johnson) yield an invariant $1.000\times$ stretch ratio. | `pairwiseDistance.test.ts` |
| **005** | [Exact Hyperplane Mesh Slicing](./005-hyperplane-mesh-slicing/README.md) | Exact cell-based 3D cross-sectional mesh generation of 4D polytopes cut by moving hyperplanes. | `hyperplaneSlicer.ts` |

---

## Execution Instructions

All experiments can be run directly from the workspace root using `npm` runner commands powered by `tsx`:

### Run All Experiments
```bash
npm run experiment:all
```

### Run Individual Experiments
```bash
npm run experiment:001
npm run experiment:002
npm run experiment:003
npm run experiment:004
```

---

## Reproducibility Statement

Anyone can clone this repository, run `npm run experiment:all` in a standard Node.js environment, and independently verify every published number, status code, and metric. All data generation algorithms and analytical formulas are self-contained within open source engine modules with zero synthetic cherry-picking or hidden parameters.

---

## Scope & Limitations (What This Suite Does NOT Claim)

1. **Physical Dimensions:** This software provides mathematical models for spatial $\mathbb{R}^4$ hypercube geometry and time-parameterized $\mathbb{R}^3 \times \mathbb{R}^1$ radiance fields. It makes no physical claims regarding physical 4D space.
2. **Experiment 005 (Planned):** True 4D hyperplane-to-polytope 3D cross-section mesh slicing (calculating 3D intersection polyhedra of arbitrary hyperplanes cutting 4D polytopes) is currently scoped as **Experiment 005** for a future release.
