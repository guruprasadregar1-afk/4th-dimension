# Experiment 006: Exact Hyperplane Slicing of Irregular 4D Geometry

## Methodology & Objectives
This experiment extends exact cell-based 4D hyperplane boundary slicing ([`hyperplaneSlicer.ts`](../../4th-dimension-engine/src/math/hyperplaneSlicer.ts)) from regular 4D polytopes (Experiment 005) to a bounded case of irregular geometry: an **Asymmetric 4-Simplex (Irregular 5-Cell)**.

### Target Irregular Geometry
Defined by 5 non-symmetrical vertices $V = \{v_0, v_1, v_2, v_3, v_4\} \subset \mathbb{R}^4$:
- $v_0 = (0, 0, 0, 0)$
- $v_1 = (2, 0, 0, 0)$
- $v_2 = (0, 3, 0, 0)$
- $v_3 = (0, 0, 4, 0)$
- $v_4 = (1, 1, 1, 5)$  *(Asymmetric peak vertex at $w=5$)*

## Hand-Derived Analytical Ground Truth

### Case 1: Axis-Aligned Hyperplane $H_1: w = 2.5$
- **Intersecting Parameter**: $t = 0.5$ on edges connecting $v_4$ to $v_0, v_1, v_2, v_3$.
- **4D Vertices**: $P_0(0.5, 0.5, 0.5, 2.5)$, $P_1(1.5, 0.5, 0.5, 2.5)$, $P_2(0.5, 2.0, 0.5, 2.5)$, $P_3(0.5, 0.5, 2.5, 2.5)$.
- **Analytical Volume**: $V_{3D} = \frac{1}{6}(1.0 \cdot 1.5 \cdot 2.0) = \mathbf{0.500000}$.

### Case 2: Oblique Hyperplane $H_2: x + y + z + w = 2.0$ (All 4 Coefficients Nonzero)
- **4D Vertices**: $Q_0(2, 0, 0, 0)$, $Q_1(0, 2, 0, 0)$, $Q_2(0, 0, 2, 0)$, $Q_3(0.25, 0.25, 0.25, 1.25)$.
- **True 4D Euclidean Edge Lengths**: $\|Q_0 Q_1\|_{4D} = \|Q_0 Q_2\|_{4D} = \|Q_1 Q_2\|_{4D} = \sqrt{8} \approx 2.8284271$, $\|Q_0 Q_3\|_{4D} = \|Q_1 Q_3\|_{4D} = \|Q_2 Q_3\|_{4D} = \sqrt{4.75} \approx 2.1794495$.
- **Isometric Orthonormal Chart**: Evaluated via Gram-Schmidt basis $(u_1, u_2, u_3)$ of $H_2$. 3D chart distances match true 4D lengths exactly without orthographic distortion.
- **Analytical Volume**: $V_{3D} = \mathbf{5/3 \approx 1.666667}$ (via Cayley-Menger determinant $\det(B) = 800$).

## Execution
Run the experiment script:
```bash
npm run experiment:006
```
Or run full experiment suite:
```bash
npm run experiment:all
```
