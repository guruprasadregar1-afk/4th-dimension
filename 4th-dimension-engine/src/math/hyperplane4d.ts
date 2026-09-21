import type { GaussianPrimitive4D } from '../types/GaussianPrimitive';

/** Rotation angles for the three 4D hyperplane rotations (x-w, y-w, z-w). */
export interface HyperplaneRotation {
  xw: number;
  yw: number;
  zw: number;
}

export const DEFAULT_HYPERPLANE: HyperplaneRotation = { xw: 0, yw: 0, zw: 0 };

/** Apply 4D rotation to a Gaussian primitive before time-slicing. */
export function rotatePrimitive4D(
  primitive: GaussianPrimitive4D,
  rotation: HyperplaneRotation,
): GaussianPrimitive4D {
  const matrix = buildRotation4D(rotation);
  const rotatedMean = transformPoint4D(primitive.mean, matrix);
  const cov = normalizeCov4(primitive.covariance);
  const rotatedCov = transformCovariance4D(cov, matrix);

  return {
    ...primitive,
    mean: rotatedMean,
    covariance: rotatedCov,
  };
}

function buildRotation4D(rotation: HyperplaneRotation): Float32Array {
  const rxw = rotationMatrixPlane(0, 3, rotation.xw);
  const ryw = rotationMatrixPlane(1, 3, rotation.yw);
  const rzw = rotationMatrixPlane(2, 3, rotation.zw);
  return multiply4x4(multiply4x4(rzw, ryw), rxw);
}

function rotationMatrixPlane(i: number, j: number, angle: number): Float32Array {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;

  m[i * 4 + i] = c;
  m[j * 4 + j] = c;
  m[i * 4 + j] = -s;
  m[j * 4 + i] = s;

  return m;
}

function transformPoint4D(
  point: [number, number, number, number],
  matrix: Float32Array,
): [number, number, number, number] {
  const [x, y, z, w] = point;
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12] * w,
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13] * w,
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14] * w,
    matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15] * w,
  ];
}

function transformCovariance4D(
  cov: Float32Array,
  matrix: Float32Array,
): Float32Array {
  const temp = multiply4x4(multiply4x4(matrix, cov), transpose4x4(matrix));
  return temp;
}

function multiply4x4(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      out[col * 4 + row] =
        a[row] * b[col * 4] +
        a[4 + row] * b[col * 4 + 1] +
        a[8 + row] * b[col * 4 + 2] +
        a[12 + row] * b[col * 4 + 3];
    }
  }
  return out;
}

function transpose4x4(m: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      out[col * 4 + row] = m[row * 4 + col];
    }
  }
  return out;
}

function normalizeCov4(input: Float32Array | number[]): Float32Array {
  if (input instanceof Float32Array && input.length === 16) {
    return input;
  }
  if (Array.isArray(input) && input.length === 16) {
    return new Float32Array(input);
  }
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 0.1;
  return m;
}
