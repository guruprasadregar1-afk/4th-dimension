import type { Splat2D } from '../math/projection';

const FLOATS_PER_SPLAT = 11;

/** GPU buffer for instanced 2D Gaussian splats. */
export class SplatBuffer {
  private readonly gl: WebGL2RenderingContext;
  private readonly vbo: WebGLBuffer;
  private count = 0;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    const vbo = gl.createBuffer();
    if (!vbo) {
      throw new Error('Failed to create splat VBO');
    }
    this.vbo = vbo;
  }

  upload(splats: Splat2D[]): void {
    const { gl } = this;
    const data = new Float32Array(splats.length * FLOATS_PER_SPLAT);

    for (let i = 0; i < splats.length; i++) {
      const s = splats[i];
      const o = i * FLOATS_PER_SPLAT;
      data[o] = s.center[0];
      data[o + 1] = s.center[1];
      data[o + 2] = s.conic[0];
      data[o + 3] = s.conic[1];
      data[o + 4] = s.conic[2];
      data[o + 5] = s.color[0];
      data[o + 6] = s.color[1];
      data[o + 7] = s.color[2];
      data[o + 8] = s.alpha;
      data[o + 9] = s.depth;
      data[o + 10] = s.radius;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    this.count = splats.length;
  }

  bind(_program: WebGLProgram): void {
    const { gl } = this;
    const stride = FLOATS_PER_SPLAT * 4;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

    const centerLoc = 1;
    gl.enableVertexAttribArray(centerLoc);
    gl.vertexAttribPointer(centerLoc, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(centerLoc, 1);

    const conicLoc = 2;
    gl.enableVertexAttribArray(conicLoc);
    gl.vertexAttribPointer(conicLoc, 3, gl.FLOAT, false, stride, 8);
    gl.vertexAttribDivisor(conicLoc, 1);

    const colorLoc = 3;
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 20);
    gl.vertexAttribDivisor(colorLoc, 1);

    const depthLoc = 4;
    gl.enableVertexAttribArray(depthLoc);
    gl.vertexAttribPointer(depthLoc, 1, gl.FLOAT, false, stride, 36);
    gl.vertexAttribDivisor(depthLoc, 1);

    const radiusLoc = 5;
    gl.enableVertexAttribArray(radiusLoc);
    gl.vertexAttribPointer(radiusLoc, 1, gl.FLOAT, false, stride, 40);
    gl.vertexAttribDivisor(radiusLoc, 1);
  }

  getCount(): number {
    return this.count;
  }

  dispose(): void {
    this.gl.deleteBuffer(this.vbo);
  }
}
