# Experiment 006: Exact 4D Hyperplane Slicing of Irregular Geometry

**Document Type**: Methods and Empirical Results Write-Up  
**Target Module**: `experiments/006-irregular-polytope-slicing`  
**Date**: September 2026  
**Status**: Executed & Verified (100% Analytical Ground Truth Match)  

---

## Executive Summary

While Experiment 005 validated exact boundary-slicing algorithms on highly symmetric regular 4D polytopes (tesseract, 5-cell, 16-cell), regular geometry can obscure edge cases such as degeneracies, non-uniform scaling, and basis orientation jumps. Experiment 006 extends exact hyperplane boundary slicing to an irregular, asymmetric 4D shape: an **Asymmetric 4-Simplex (Irregular 5-Cell)** defined by 5 hand-chosen non-symmetrical vertices.

We validate the slicing engine across two analytical reference cases:
1. **Case 1 (Axis-Aligned Hyperplane $H_1: w = 2.5$)**: Intersects at linear parameter $t = 0.5$, yielding an asymmetric tetrahedron of exact 3D volume $V_{3D} = \mathbf{0.500000}$.
2. **Case 2 (Oblique Hyperplane $H_2: x + y + z + w = 2.0$)**: All four hyperplane normal coefficients are non-zero. Slicing yields 4 intersection points whose 3D chart distances and enclosed volume ($V_{3D} = \mathbf{5/3 \approx 1.666667}$) match true 4D Euclidean metric ground truth without orthographic length compression.

All empirical results match hand-derived analytical ground truth within floating-point tolerance ($\le 10^{-6}$), while satisfying 3D convex half-space enclosure, $2$-manifold watertight closure, and frame-to-frame basis orientation continuity ($\max \|\Delta u_m\| = 0.08854 < 0.10$).

---

## 1. Mathematical Methodology & Formulation

### 1.1 Irregular 4-Simplex Geometry
The target geometry is an asymmetric 4-simplex $S \subset \mathbb{R}^4$ defined by 5 vertices:
- $v_0 = (0, 0, 0, 0)$
- $v_1 = (2, 0, 0, 0)$
- $v_2 = (0, 3, 0, 0)$
- $v_3 = (0, 0, 4, 0)$
- $v_4 = (1, 1, 1, 5)$  *(Asymmetric apex at $w = 5$)*

Topology: 5 vertices, 10 edges (connecting all pairs; no two edge lengths are equal), and 5 boundary 3D tetrahedral cells.

```
       v4 (1,1,1,5) [Apex]
        / | \   \
       /  |  \   \
      /   |   \   \
    v0   v1   v2   v3
  (0,0) (2,0) (0,3) (0,0,4)
```

### 1.2 Gauge-Fixed Canonical Orthonormal Basis Construction
For an arbitrary 3D hyperplane defined by normal $\hat{\mathbf{n}} = [a,b,c,d]^T / \|\mathbf{n}\|_2$, orthographic projection (dropping coordinates) compresses lengths by $\cos(\theta) = 1/\|\mathbf{n}\|_2$. To preserve 3D Euclidean metric distances without spatial distortion, chart coordinates are evaluated in a canonical 3D orthonormal basis $(u_1, u_2, u_3)$ constructed via Gram-Schmidt orthogonalization with global axis fallback rules:

1. **Primary Vector $u_1$**: Project global unit vector $e_1 = [1, 0, 0, 0]^T$ onto $\hat{\mathbf{n}}^\perp$:
   $$v_1 = e_1 - (e_1 \cdot \hat{\mathbf{n}}) \hat{\mathbf{n}}$$
   *(If $\|v_1\| < 10^{-4}$, fall back to $e_2 = [0, 1, 0, 0]^T$)*.
   $$u_1 = \frac{v_1}{\|v_1\|}$$

2. **Secondary Vector $u_2$**: Project candidate global reference vector onto $(\hat{\mathbf{n}}, u_1)^\perp$:
   $$v_2 = e_2 - (e_2 \cdot \hat{\mathbf{n}}) \hat{\mathbf{n}} - (e_2 \cdot u_1) u_1, \quad u_2 = \frac{v_2}{\|v_2\|}$$

3. **Tertiary Vector $u_3$**: Project candidate global reference vector onto $(\hat{\mathbf{n}}, u_1, u_2)^\perp$:
   $$v_3 = e_3 - (e_3 \cdot \hat{\mathbf{n}}) \hat{\mathbf{n}} - (e_3 \cdot u_1) u_1 - (e_3 \cdot u_2) u_2, \quad u_3 = \frac{v_3}{\|v_3\|}$$

### 1.3 Volume Evaluation via Cayley-Menger Determinant
For 4 3D chart vertices $P_0, P_1, P_2, P_3$, the enclosed 3D volume is computed directly via vector scalar triple product:
$$\text{Volume}_{3D} = \frac{1}{6} |(P_1 - P_0) \cdot ((P_2 - P_0) \times (P_3 - P_0))|$$
In 4D space, the volume is verified independently via the Cayley-Menger determinant on true 4D edge lengths $d_{ij} = \|P_i - P_j\|_{4D}$:
$$\det(B) = \begin{vmatrix}
0 & d_{01}^2 & d_{02}^2 & d_{03}^2 & 1 \\
d_{01}^2 & 0 & d_{12}^2 & d_{13}^2 & 1 \\
d_{02}^2 & d_{12}^2 & 0 & d_{23}^2 & 1 \\
d_{03}^2 & d_{13}^2 & d_{23}^2 & 0 & 1 \\
1 & 1 & 1 & 1 & 0
\end{vmatrix} \implies V_{3D} = \sqrt{\frac{\det(B)}{288}}$$

---

## 2. Analytical Ground Truth Reference Cases

### Case 1: Axis-Aligned Hyperplane $H_1: w = 2.5$
Intersecting $H_1: w = 2.5$ cuts the 4 edges connecting $v_4$ to $v_0, v_1, v_2, v_3$ at exact linear parameter $t = 0.5$:
- $P_0 = (0.5, 0.5, 0.5, 2.5)$
- $P_1 = (1.5, 0.5, 0.5, 2.5)$
- $P_2 = (0.5, 2.0, 0.5, 2.5)$
- $P_3 = (0.5, 0.5, 2.5, 2.5)$

**Ground Truth Metric Validation**:
- Topology: Asymmetric Tetrahedron ($N_v = 4$, $N_f = 4$).
- 4D Edge Lengths: $\|P_0 P_1\| = 1.0$, $\|P_0 P_2\| = 1.5$, $\|P_0 P_3\| = 2.0$.
- Analytical Volume: $V_{3D} = \frac{1}{6}(1.0 \cdot 1.5 \cdot 2.0) = \mathbf{0.500000}$.

### Case 2: Oblique Hyperplane $H_2: x + y + z + w = 2.0$
Signed distances: $d(v_0) = -2.0$, $d(v_1) = 0.0$ (vertex contact), $d(v_2) = +1.0$, $d(v_3) = +2.0$, $d(v_4) = +6.0$.
Hyperplane separates $v_0$ from $\{v_1, v_2, v_3, v_4\}$, yielding 4 intersection points:
- $Q_0 = (2, 0, 0, 0)$  *(Vertex contact at $v_1$)*
- $Q_1 = (0, 2, 0, 0)$
- $Q_2 = (0, 0, 2, 0)$
- $Q_3 = (0.25, 0.25, 0.25, 1.25)$

**Ground Truth Metric Validation**:
- True 4D Edge Lengths: $\|Q_0 Q_1\|_{4D} = \|Q_0 Q_2\|_{4D} = \|Q_1 Q_2\|_{4D} = \sqrt{8} \approx 2.8284271$, $\|Q_0 Q_3\|_{4D} = \|Q_1 Q_3\|_{4D} = \|Q_2 Q_3\|_{4D} = \sqrt{4.75} \approx 2.1794495$.
- Orthonormal 3D Chart Distances: Match 4D edge lengths exactly within $\le 10^{-6}$.
- Analytical Volume: $\det(B_{Cayley-Menger}) = 800 \implies V_{3D} = \sqrt{800/288} = \mathbf{5/3 \approx 1.666667}$.

---

## 3. Empirical Validation Results

The execution harness (`experiments/006-irregular-polytope-slicing/run.ts`) evaluated the algorithm against all ground truth and boundary constraints:

| Test Case / Metric | Target Hyperplane | Vertices (Act/Exp) | Face Count | Computed 3D Volume | Distance Preservation | Convexity & Closure | Status |
|-------------------|-------------------|--------------------|------------|--------------------|-----------------------|---------------------|--------|
| **Case 1** Axis-Aligned | $w = 2.5$ | 4 / 4 | 4 | 0.500000 (Exp: 0.500000) | ✅ 100% Match | ✅ Convex / Closed | ✅ PASS |
| **Case 2** Oblique Hyperplane | $x+y+z+w = 2.0$ | 4 / 4 | 4 | 1.666667 (Exp: 1.666667) | ✅ 100% Isometric | ✅ Convex / Closed | ✅ PASS |
| **Degenerate Slicing** | $w = 6.0$ (Out-of-bounds) | 0 / 0 | 0 | N/A (Empty Mesh) | N/A | N/A | ✅ PASS |
| **Concave Rejection** | Perturbed Non-Convex | 5 / 5 | 4 | N/A | N/A | ❌ Rejected (Half-Space) | ✅ PASS |
| **Basis Frame Continuity** | 50-Step Normal Sweep | N/A | N/A | N/A | N/A | $\max \|\Delta u_m\| = 0.08854$ | ✅ PASS |

---

## 4. Prior Work & Differentiation

### 4.1 Prior Work
- **CGAL ($d\text{D}$ Polyhedral Kernel)**: Heavy C++ library supporting $N$-dimensional convex hull extraction, hyperplane cutting, and cell intersections.
- **Qhull / libqhull (Barber et al., 1996)**: C library implementing Quickhull for half-space intersections in $\mathbb{R}^N$.

### 4.2 Citation & Differentiation
- **Citation**: Hyperplane slicing of $N$-dimensional polyhedra is a classic solved problem in computational geometry (Barber et al., 1996; CGAL $d\text{D}$ Kernel). We make **no claim** of inventing a new slicing algorithm.
- **Differentiation**: Generic C++ libraries like CGAL and Qhull are offline, heavy external tools. Our implementation ([`hyperplaneSlicer.ts`](../../4th-dimension-engine/src/math/hyperplaneSlicer.ts)) is a zero-dependency, lightweight TypeScript module executing real-time 4D boundary slicing and WebGL chart rendering directly in browser runtime environments at 60 FPS.

---

## 5. Limitations

1. **Convexity Boundary**: The cell-based slicing algorithm relies on convex boundary cells. While it handles irregular non-symmetric convex polyhedra, non-convex self-intersecting 4D meshes are not supported without prior tetrahedral decomposition.
2. **Double Precision Epsilon**: Floating-point comparisons rely on $\epsilon = 10^{-5}$. Slicing within $\epsilon$ of exact 4D vertices can create tiny micro-edges if not deduplicated.

---

## 6. AI Tool Use & Human Contribution

All source code and unit tests in Experiment 006 were generated by an AI coding agent (Antigravity) under direct, iterative human specification and adversarial mathematical review. The human author(s) were responsible for:
- Defining the irregular 4-simplex vertex coordinates and formulating hand-derived analytical ground truth for Cases 1 and 2.
- Identifying and correcting the oblique hyperplane orthographic projection error (coordinate dropping vs Gram-Schmidt isometric basis).
- Specifying the deterministic canonical basis gauge-fixing rule and basis frame continuity test.
- Conducting adversarial verification of all empirical run logs before accepting test suite sign-off.
