# Experiment 004: Static Scene Rigidity Control

## Hypothesis
Real-world 3D photogrammetry scan data (such as Tanks & Temples: Truck and Deep Blending: Dr Johnson) represent rigid 3D spatial points lacking true 4D time-varying structure. Under spatial camera rotation, pairwise 3D Euclidean distances must yield a constant stretch ratio of exactly $1.000000\times$, serving as a control metric for the Concept Mode viewer.

## Methodology
1. Load real-world static Gaussian primitive centroid locations $[x, y, z]$.
2. Apply 3D camera rotation transforms $R(\theta_{\text{azimuth}}, \theta_{\text{elevation}})$.
3. Measure pairwise Euclidean distance ratio:

$$\text{Stretch Ratio} = \frac{\max(d_{\text{rotated}}) / \min(d_{\text{rotated}})}{\max(d_{\text{unrotated}}) / \min(d_{\text{unrotated}})}$$

4. Verify that $\text{Stretch Ratio} = 1.000000\times$ across all rotation angles.

## Execution
```bash
npm run experiment:004
```
