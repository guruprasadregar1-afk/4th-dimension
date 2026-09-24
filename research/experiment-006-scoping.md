# Research Scope Definition: Extension of Experiment 005 to Irregular 4D Geometry

**Document Type**: Pre-Implementation Research & Verification Scope  
**Target Module**: `experiments/006-irregular-polytope-slicing`  
**Date**: September 2026  
**Status**: Scope Signed-Off with Canonical Basis Continuity Rule  

---

## 1. Minimal Target Irregular Shape: Asymmetric 4-Simplex (Irregular 5-Cell)

To validate exact hyperplane slicing on geometry devoid of regular symmetry, we select the simplest non-regular 4D polytope: an **Asymmetric 4-Simplex** defined by 5 hand-chosen vertices $V = \{v_0, v_1, v_2, v_3, v_4\} \subset \mathbb{R}^4$:

- $v_0 = (0, 0, 0, 0)$
- $v_1 = (2, 0, 0, 0)$
- $v_2 = (0, 3, 0, 0)$
- $v_3 = (0, 0, 4, 0)$
- $v_4 = (1, 1, 1, 5)$  *(Asymmetric peak vertex at $w = 5$)*

### Topology & Metric Properties
- **Vertices**: $5$
- **Edges**: $10$ (connecting all pairs; no two edge lengths are equal).
- **Cells**: $5$ tetrahedral boundary cells (4 slanted cells connecting $v_4$ to base triangles, plus 1 base cell in $w=0$).
- **Euler Characteristic**: $\chi = V - E + F - C = 5 - 10 + 10 - 5 = 0$.

---

## 2. Hand-Derived Analytical Reference Cases

### Case 1: Axis-Aligned Hyperplane $H_1: w = 2.5$

Intersecting $H_1: w = 2.5$ (parallel to $w=0$) cuts the 4 edges connecting $v_4$ to $v_0, v_1, v_2, v_3$ at exact linear parameter $t = \frac{2.5 - 0}{5 - 0} = 0.5$:

- Intersecting Edge $(v_0, v_4) \to P_0 = (0.5, 0.5, 0.5, 2.5)$
- Intersecting Edge $(v_1, v_4) \to P_1 = (1.5, 0.5, 0.5, 2.5)$
- Intersecting Edge $(v_2, v_4) \to P_2 = (0.5, 2.0, 0.5, 2.5)$
- Intersecting Edge $(v_3, v_4) \to P_3 = (0.5, 0.5, 2.5, 2.5)$

**Expected 3D Cross-Section at $w = 2.5$**:
- **Topology**: Asymmetric Tetrahedron ($N_v = 4$, $N_e = 6$, $N_f = 4$ scalene/isosceles triangular faces).
- **Chart 3D Coordinates** *(via $w$-dropping for coordinate hyperplane)*: $P_0(0.5, 0.5, 0.5)$, $P_1(1.5, 0.5, 0.5)$, $P_2(0.5, 2.0, 0.5)$, $P_3(0.5, 0.5, 2.5)$.
- **Exact 4D Edge Lengths**:
  - $\|P_0 P_1\|_{4D} = 1.0$
  - $\|P_0 P_2\|_{4D} = 1.5$
  - $\|P_0 P_3\|_{4D} = 2.0$
  - $\|P_1 P_2\|_{4D} = \sqrt{1.0^2 + 1.5^2} = \sqrt{3.25} \approx 1.8027756$
  - $\|P_1 P_3\|_{4D} = \sqrt{1.0^2 + 2.0^2} = \sqrt{5.0} \approx 2.2360680$
  - $\|P_2 P_3\|_{4D} = \sqrt{1.5^2 + 2.0^2} = \sqrt{6.25} = 2.5$
- **Exact Enclosed 3D Volume**:
  $$\text{Volume} = \frac{1}{6} |(P_1 - P_0) \cdot ((P_2 - P_0) \times (P_3 - P_0))| = \frac{1}{6} (1.0 \cdot 1.5 \cdot 2.0) = 0.500000$$

---

### Case 2: Oblique Hyperplane $H_2: x + y + z + w = 2.0$ (All 4 Coefficients Nonzero)

#### Mathematical Rule for Oblique Hyperplanes
> **Critical Rule**: For oblique hyperplanes (e.g. $x+y+z+w=2.0$), dropping the extra coordinate (orthographic projection) compresses lengths and distorts volumes by $\cos(\theta) = \frac{1}{\|N\|_2}$. 3D chart coordinates **MUST** be evaluated in an isometry-preserving 3D orthonormal basis $(u_1, u_2, u_3)$ of the 3D hyperplane subspace. Alternatively, the enclosed 3D volume is evaluated directly from true 4D edge lengths using the Cayley-Menger determinant without coordinate projection.

#### Signed Distances to $H_2$
- $d(v_0) = 0 + 0 + 0 + 0 - 2.0 = -2.0$  *(Negative side)*
- $d(v_1) = 2 + 0 + 0 + 0 - 2.0 = 0.0$   *(Vertex $v_1$ lies exactly on $H_2$)*
- $d(v_2) = 0 + 3 + 0 + 0 - 2.0 = +1.0$  *(Positive side)*
- $d(v_3) = 0 + 0 + 4 + 0 - 2.0 = +2.0$  *(Positive side)*
- $d(v_4) = 1 + 1 + 1 + 5 - 2.0 = +6.0$  *(Positive side)*

#### Hand-Derived 4D Intersections
Hyperplane $H_2$ separates $v_0$ from $\{v_1, v_2, v_3, v_4\}$, yielding 4 intersection points:
1. **Edge $(v_0, v_1)$**: Signed distance $d(v_1) = 0 \to$ `VERTEX` contact at $Q_0 = v_1 = (2, 0, 0, 0)$.
2. **Edge $(v_0, v_2)$**: Parameter $t = \frac{-(-2)}{1 - (-2)} = \frac{2}{3} \to Q_1 = (0, 2, 0, 0)$.
3. **Edge $(v_0, v_3)$**: Parameter $t = \frac{-(-2)}{2 - (-2)} = \frac{2}{4} = \frac{1}{2} \to Q_2 = (0, 0, 2, 0)$.
4. **Edge $(v_0, v_4)$**: Parameter $t = \frac{-(-2)}{6 - (-2)} = \frac{2}{8} = \frac{1}{4} \to Q_3 = (0.25, 0.25, 0.25, 1.25)$.

#### Exact True 4D Euclidean Edge Lengths
- $\|Q_0 Q_1\|_{4D} = \sqrt{(-2)^2 + 2^2 + 0 + 0} = \sqrt{8} \approx 2.8284271$
- $\|Q_0 Q_2\|_{4D} = \sqrt{(-2)^2 + 0 + 2^2 + 0} = \sqrt{8} \approx 2.8284271$
- $\|Q_1 Q_2\|_{4D} = \sqrt{0 + (-2)^2 + 2^2 + 0} = \sqrt{8} \approx 2.8284271$
- $\|Q_0 Q_3\|_{4D} = \sqrt{(-1.75)^2 + 0.25^2 + 0.25^2 + 1.25^2} = \sqrt{4.75} \approx 2.1794495$
- $\|Q_1 Q_3\|_{4D} = \sqrt{0.25^2 + (-1.75)^2 + 0.25^2 + 1.25^2} = \sqrt{4.75} \approx 2.1794495$
- $\|Q_2 Q_3\|_{4D} = \sqrt{0.25^2 + 0.25^2 + (-1.75)^2 + 1.25^2} = \sqrt{4.75} \approx 2.1794495$

#### Isometric 3D Orthonormal Chart Coordinates
Using Gram-Schmidt orthogonalization on $H_2$ relative to origin $Q_0$:
- $u_1 = \left( -\frac{1}{\sqrt{2}}, \frac{1}{\sqrt{2}}, 0, 0 \right)$
- $u_2 = \left( -\frac{1}{\sqrt{6}}, -\frac{1}{\sqrt{6}}, \frac{2}{\sqrt{6}}, 0 \right)$
- $u_3 = \left( -\frac{1}{2\sqrt{3}}, -\frac{1}{2\sqrt{3}}, -\frac{1}{2\sqrt{3}}, \frac{\sqrt{3}}{2} \right)$

Yielding exact local 3D coordinates:
- $Q_0^{(3D)} = (0, 0, 0)$
- $Q_1^{(3D)} = (\sqrt{8}, 0, 0) \approx (2.8284271, 0, 0)$
- $Q_2^{(3D)} = (\sqrt{2}, \sqrt{6}, 0) \approx (1.4142136, 2.4494897, 0)$
- $Q_3^{(3D)} = \left(\sqrt{2}, \frac{2}{\sqrt{6}}, \frac{5}{2\sqrt{3}}\right) \approx (1.4142136, 0.8164966, 1.4433757)$

#### Mandatory Self-Consistency Check (Distance Preservation)
Evaluating 3D Euclidean distances in the orthonormal chart:
- $\|Q_0^{(3D)} - Q_1^{(3D)}\|_{3D} = \sqrt{8} \approx 2.8284271$  *(Matches 4D length $\sqrt{8}$ exactly)*
- $\|Q_0^{(3D)} - Q_2^{(3D)}\|_{3D} = \sqrt{2 + 6} = \sqrt{8} \approx 2.8284271$  *(Matches 4D length $\sqrt{8}$ exactly)*
- $\|Q_1^{(3D)} - Q_2^{(3D)}\|_{3D} = \sqrt{(-\sqrt{2})^2 + 6} = \sqrt{8} \approx 2.8284271$  *(Matches 4D length $\sqrt{8}$ exactly)*
- $\|Q_0^{(3D)} - Q_3^{(3D)}\|_{3D} = \sqrt{2 + 4/6 + 25/12} = \sqrt{4.75} \approx 2.1794495$  *(Matches 4D length $\sqrt{4.75}$ exactly)*

#### Exact Analytical Enclosed 3D Volume
Evaluated via both the Orthonormal Chart determinant and Cayley-Menger Determinant:
$$\det(B_{Cayley-Menger}) = 800 \implies \text{Volume}_{3D} = \sqrt{\frac{800}{288}} = \frac{5}{3} \approx 1.666667$$

**Corrected Expected Volume for Case 2**: $\frac{5}{3} \approx 1.666667$.

---

## 3. Canonical Basis Construction Rule & Frame Continuity

### Gauge-Fixing Rule for Basis Construction
To prevent 3D orientation jumps or sign flips during live hyperplane slider scrubbing, the 3D orthonormal basis $(u_1, u_2, u_3)$ of hyperplane normal $\hat{\mathbf{n}} = \frac{[a,b,c,d]^T}{\sqrt{a^2+b^2+c^2+d^2}}$ is constructed deterministically:

1. **Primary Vector $u_1$**: Project global unit vector $e_1 = [1, 0, 0, 0]^T$ onto $\hat{\mathbf{n}}^\perp$:
   $$v_1 = e_1 - (e_1 \cdot \hat{\mathbf{n}}) \hat{\mathbf{n}}$$
   If $\|v_1\| < 10^{-4}$ (normal parallel to $X$), fall back to $e_2 = [0, 1, 0, 0]^T$:
   $$v_1 = e_2 - (e_2 \cdot \hat{\mathbf{n}}) \hat{\mathbf{n}}$$
   $$u_1 = \frac{v_1}{\|v_1\|}$$

2. **Secondary Vector $u_2$**: Project global unit vector $e_2 = [0, 1, 0, 0]^T$ (or $e_3 = [0, 0, 1, 0]^T$ if fallback triggered) onto $(\hat{\mathbf{n}}, u_1)^\perp$:
   $$v_2 = e_2 - (e_2 \cdot \hat{\mathbf{n}}) \hat{\mathbf{n}} - (e_2 \cdot u_1) u_1$$
   $$u_2 = \frac{v_2}{\|v_2\|}$$

3. **Tertiary Vector $u_3$**: Project $e_3 = [0, 0, 1, 0]^T$ (or $e_4 = [0, 0, 0, 1]^T$) onto $(\hat{\mathbf{n}}, u_1, u_2)^\perp$:
   $$v_3 = e_3 - (e_3 \cdot \hat{\mathbf{n}}) \hat{\mathbf{n}} - (e_3 \cdot u_1) u_1 - (e_3 \cdot u_2) u_2$$
   $$u_3 = \frac{v_3}{\|v_3\|}$$

### Frame-to-Frame Continuity Test
During hyperplane parameter sweeps, consecutive basis frames $\mathbf{U}^{(k)}$ and $\mathbf{U}^{(k+1)}$ are evaluated:
$$\|u_m^{(k+1)} - u_m^{(k)}\|_2 \le \delta \quad \text{for } m \in \{1, 2, 3\}$$
Asserting zero discontinuous $90^\circ / 180^\circ$ orientation flips or basis sign reversals frame-to-frame during live UI scrubbing.

---

## 4. Existing Computational Geometry Prior Work & Differentiators

### Prior Work
1. **CGAL (Computational Geometry Algorithms Library)**:
   - CGAL `dD Polyhedral Surfaces` module provides $d$-dimensional convex hull extraction, hyperplane cutting, and cell intersection algorithms in $\mathbb{R}^d$.
2. **Qhull / libqhull (Barber et al., 1996)**:
   - Qhull implements Quickhull for $N$-dimensional convex hulls and half-space intersections in $\mathbb{R}^N$.

### Honest Citation & Differentiation
- **Citation**: Hyperplane slicing of $N$-dimensional polyhedra is a classic solved problem in computational geometry (Barber et al., 1996; CGAL $d\text{D}$ Kernel). We make **no claim** of inventing a new mathematical slicing algorithm or outperforming offline C++ libraries like CGAL or Qhull.
- **Differentiation**:
  - CGAL and Qhull are generic, heavy C++ libraries designed for offline $N$-dimensional spatial computing.
  - Our implementation ([`hyperplaneSlicer.ts`](file:///d:/4th%20dimension/4th-dimension-engine/src/math/hyperplaneSlicer.ts)) is a zero-dependency, lightweight TypeScript module executing real-time 4D boundary slicing and WebGL rendering directly in browser runtime environments.

---

## 5. Exact Falsifiable Claim

> **Claim**: The cell-based 4D hyperplane slicing algorithm ([`hyperplaneSlicer.ts`](file:///d:/4th%20dimension/4th-dimension-engine/src/math/hyperplaneSlicer.ts)), when evaluated on an asymmetric 4-simplex across both coordinate ($w = 2.5$) and oblique ($x + y + z + w = 2.0$) hyperplanes, computes exact 3D cross-sectional meshes whose 3D isometric chart coordinates, true 4D edge lengths, face topology ($4$ triangular faces), and 3D volumes ($0.500000$ for Case 1 and $\frac{5}{3} \approx 1.666667$ for Case 2) match hand-derived analytical ground truth within floating-point tolerance ($\le 10^{-6}$), while satisfying 3D convex half-space enclosure, $2$-manifold watertight closure, and frame-to-frame basis orientation continuity.

---

## 6. Definition of "Done"

To achieve the same rigor established in Experiment 005, completion ("Done") requires:

1. **Dual Analytical Reference Table**: Pre-computed hand-derived ground truth coordinates, edge lengths, face normals, and volume for both Case 1 ($w=2.5$) and Case 2 ($x+y+z+w=2.0$) in the test suite.
2. **Executable Harness**: Implementation of `experiments/006-irregular-polytope-slicing/run.ts` and `hyperplaneSlicer.irregular.test.ts`.
3. **Adversarial Test Cases**:
   - **Degenerate Plane**: Slicing at out-of-bounds position ($w = 6.0$), verifying `vertexCount = 0` without error.
   - **Vertex Contact Boundary**: Verifying exact `VERTEX` handling at $v_1(2,0,0,0)$ on $H_2$.
   - **Concave Geometry Rejection**: Testing `verifyMeshConvexity()` against an intentionally distorted non-convex 4-simplex to verify explicit failure detection.
   - **Basis Continuity Test**: Sweeping hyperplane normal $\hat{\mathbf{n}}(t)$ over 50 steps and asserting smooth basis vector motion $\|u_m^{(k+1)} - u_m^{(k)}\| \le 0.05$ with zero sign flips.
4. **Zero Stubbed Verification**: Full integration of real mathematical verification functions (`verifyFaceCoplanarity`, `verifyMeshConvexity`, `verifyMeshCongruence`).
