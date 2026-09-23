# Experiment 005: Exact Hyperplane-to-Polytope Mesh Slicing

## Research Question
Given a 4D polytope (Tesseract, 5-cell, 16-cell) and a moving 3D hyperplane defined by $a x + b y + c z + d w = e$, can the platform compute the exact 3D cross-sectional solid produced by their intersection at any slice position, and does that computed solid match analytical geometric references?

## Theoretical Background & Analytical Reference
For a unit tesseract $[0, 1]^4$ sliced along its main space diagonal by the hyperplane $x + y + z + w = t$ as $t$ moves continuously from $0$ to $4$:
- $t = 0$ & $t = 4$: Single point ($N_v = 1$, corner vertices).
- $0 < t \le 1$: Growing Tetrahedron ($N_v = 4$).
- $1 < t < 2$: Truncated Tetrahedron ($N_v = 12$).
- $t = 2.0$: Regular Octahedron ($N_v = 6$, point of maximum symmetry).
- $2 < t < 3$: Truncated Tetrahedron ($N_v = 12$).
- $3 \le t < 4$: Shrinking Tetrahedron ($N_v = 4$).

## Structural Invariants Tested
1. **Convexity**: The cross-section of a convex polytope by a hyperplane is strictly convex.
2. **Symmetry**: The cross-sectional mesh at position $t$ is congruent to position $4 - t$.
3. **Continuity**: Smooth metric and topological transitions across slice positions.
4. **Closure**: Every generated 3D cross-sectional mesh forms a closed, watertight 3D solid.

## Execution
```bash
npm run experiment:005
```
