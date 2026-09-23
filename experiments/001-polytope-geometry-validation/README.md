# Experiment 001: Polytope Geometry Validation

## Hypothesis
The 4D regular polytope generator functions (`generateTesseractGeometry`, `generateSimplex5Geometry`, `generateOrthoplex16Geometry`) produce topologically sound and metrically uniform 4D polytopes matching exact analytical formulas.

## Expected Analytical Values
1. **Tesseract (8-cell / Hypercube)**:
   - Vertices: $16 = 2^4$
   - Edges: $32$
   - Metric Edge Length: $2.0$ (spanning $[-1, 1]^4$)
2. **5-cell (4-simplex)**:
   - Vertices: $5$
   - Edges: $10 = \binom{5}{2}$ (Complete Graph $K_5$)
   - Metric Edge Length: $\sqrt{8} \approx 2.828427$
3. **16-cell (4-orthoplex / Cross-Polytope)**:
   - Vertices: $8$ (4-axis antipodes)
   - Edges: $24$
   - Metric Edge Length: $\sqrt{2} \approx 1.414214$

## Methodology
Each polytope generator function is called to compute vertex position vectors in $\mathbb{R}^4$ and edge connectivity lists. The script computes:
- Exact vertex count $N_v$
- Exact edge count $N_e$
- Pairwise 4D Euclidean distance $d_{4D}(\mathbf{p}_i, \mathbf{p}_j) = \sqrt{\sum_{k=0}^3 (p_{i,k} - p_{j,k})^2}$ along all generated edges
- Standard deviation of edge lengths to verify metric uniformity

## Execution
```bash
npm run experiment:001
```
