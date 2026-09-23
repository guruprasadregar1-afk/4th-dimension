# Experiment 002: Tesseract Rotation Invariance

## Hypothesis
Rotation of a 4D rigid body in $\mathbb{R}^4$ is a true mathematical isometry—preserving all pairwise 4D vertex distances identically (variance $= 0$). Conversely, its projected 3D shadow is **not** an isometry, exhibiting dynamic metric stretch and foreshortening as expected during 4D hyperplane projection.

## Methodology
1. Generate canonical 4D Tesseract vertices $\mathbf{V} \in \mathbb{R}^{16 \times 4}$.
2. Apply 4D rotation matrices across 6 hyperplanes ($XW, YW, ZW$ and compound rotation planes) at varying angles $\theta \in [0, \pi/2]$.
3. Evaluate pairwise 4D Euclidean metric distance $d_{4D}(\mathbf{v}_i, \mathbf{v}_j) = \|\mathbf{v}_i - \mathbf{v}_j\|_2$ along all 32 hypercube edges.
4. Project rotated vertices to 3D projected space via perspective hyperplane division $\mathbf{P}_{\text{proj}}$, measuring the resulting 3D shadow stretch ratio $\frac{\max(d_{3D})}{\min(d_{3D})}$.

## Execution
```bash
npm run experiment:002
```
