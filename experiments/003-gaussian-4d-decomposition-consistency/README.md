# Experiment 003: Gaussian 4D Decomposition Consistency

## Hypothesis
The 4D-to-3D Gaussian conditional distribution slice (evaluated via Schur complement decomposition of the 4×4 covariance matrix) remains strictly positive-definite and numerically stable across all non-zero temporal variance inputs ($\sigma_T \in [10^{-8}, 1.0]$), preventing degenerate (near-zero or needle) splat artifacts.

## Schur Complement Formulation
Given a 4D Gaussian Primitive with mean $\boldsymbol{\mu} \in \mathbb{R}^4$ and 4×4 covariance matrix $\mathbf{\Sigma} \in \mathbb{R}^{4 \times 4}$:

$$\mathbf{\Sigma} = \begin{bmatrix} \mathbf{\Sigma}_{1:3, 1:3} & \mathbf{\Sigma}_{1:3, 4} \\ \mathbf{\Sigma}_{4, 1:3} & \Sigma_{4,4} \end{bmatrix}$$

The 3D spatial slice at time $t$ has conditional mean $\boldsymbol{\mu}_{3D}$ and conditional 3D spatial covariance $\mathbf{\Sigma}_{3D}$:

$$\boldsymbol{\mu}_{3D} = \boldsymbol{\mu}_{1:3} + \mathbf{\Sigma}_{1:3, 4} \, \Sigma_{4,4}^{-1} (t - \mu_4)$$
$$\mathbf{\Sigma}_{3D} = \mathbf{\Sigma}_{1:3, 1:3} - \mathbf{\Sigma}_{1:3, 4} \, \Sigma_{4,4}^{-1} \, \mathbf{\Sigma}_{4, 1:3}$$

## Numerical Safety Floor
To prevent floating-point division-by-zero or matrix collapse during hyperplane rotations, the engine enforces:
- $\Sigma_{4,4} \ge 10^{-3}$
- Spatial Variance Diagonal Floor $\ge 10^{-4}$

## Execution
```bash
npm run experiment:003
```
