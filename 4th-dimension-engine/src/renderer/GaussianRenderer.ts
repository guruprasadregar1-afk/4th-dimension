import { WebGLContext } from '../core/WebGLContext';
import { sliceSceneAtTime, type SliceOptions } from '../math/gaussian4d';
import type { HyperplaneRotation } from '../math/hyperplane4d';
import { DEFAULT_HYPERPLANE } from '../math/hyperplane4d';
import {
  createOrbitCamera,
  projectSplats,
  type CameraParams,
} from '../math/projection';
import type {
  GaussianPrimitive4D,
  LayerVisibility,
  PrimitiveLayer,
  QualityPreset,
  RenderMode,
  RenderStats,
} from '../types/GaussianPrimitive';
import splatFrag from '../shaders/splat.frag.glsl?raw';
import splatVert from '../shaders/splat.vert.glsl?raw';
import { applyRenderBudget, QUALITY_MAX_SPLATS } from './lod';
import { SplatBuffer } from './SplatBuffer';

const DEFAULT_LAYERS: LayerVisibility = {
  static: true,
  dynamic: true,
  transient: true,
};

/** 4D Gaussian splat renderer with time-slicing and alpha compositing. */
export class GaussianRenderer {
  private readonly context: WebGLContext;
  private readonly program: WebGLProgram;
  private readonly quadVao: WebGLVertexArrayObject;
  private readonly splatBuffer: SplatBuffer;
  private primitives: GaussianPrimitive4D[] = [];
  private time = 0;
  private sceneDuration = 0;
  private cameraAzimuth = 0.6;
  private cameraElevation = 0.35;
  private cameraRadius = 4;
  private fovY = Math.PI / 4;
  private isOrthographic = false;
  private hyperplaneRotation: HyperplaneRotation = { ...DEFAULT_HYPERPLANE };
  private foveatedStrength = 0.35;
  private smoothTemporal = true;
  private renderMode: RenderMode = 'color';
  private layerVisibility: LayerVisibility = { ...DEFAULT_LAYERS };
  private qualityPreset: QualityPreset = 'balanced';
  private lastStats: RenderStats = {
    totalPrimitives: 0,
    projectedSplats: 0,
    renderedSplats: 0,
    lastFrameMs: 0,
    qualityPreset: 'balanced',
  };

  constructor(context: WebGLContext) {
    this.context = context;
    this.program = this.createProgram(splatVert, splatFrag);
    this.quadVao = this.createUnitQuad();
    this.splatBuffer = new SplatBuffer(context.gl);
  }

  setPrimitives(primitives: GaussianPrimitive4D[]): void {
    this.primitives = primitives;
  }

  setSceneDuration(duration: number): void {
    this.sceneDuration = duration;
  }

  setTime(time: number): void {
    this.time = time;
  }

  setCamera(azimuth: number, elevation: number, radius: number): void {
    this.cameraAzimuth = azimuth;
    this.cameraElevation = elevation;
    this.cameraRadius = radius;
  }

  setFov(fovDegrees: number): void {
    const rad = (Math.max(10, Math.min(120, fovDegrees)) * Math.PI) / 180;
    this.fovY = rad;
  }

  setProjectionMode(mode: 'perspective' | 'orthographic'): void {
    this.isOrthographic = mode === 'orthographic';
  }

  setHyperplaneRotation(rotation: HyperplaneRotation): void {
    this.hyperplaneRotation = rotation;
  }

  setFoveatedRendering(enabled: boolean): void {
    this.foveatedStrength = enabled ? 0.35 : 0;
  }

  setSmoothTemporal(enabled: boolean): void {
    this.smoothTemporal = enabled;
  }

  setRenderMode(mode: RenderMode): void {
    this.renderMode = mode;
  }

  setLayerVisibility(layers: LayerVisibility): void {
    this.layerVisibility = { ...layers };
  }

  setQualityPreset(preset: QualityPreset): void {
    this.qualityPreset = preset;
  }

  getQualityPreset(): QualityPreset {
    return this.qualityPreset;
  }

  getRenderStats(): RenderStats {
    return { ...this.lastStats };
  }

  render(): void {
    const frameStart = performance.now();
    const { gl, canvas } = this.context;
    this.context.clear();

    const visible = this.filterByLayer(this.primitives);
    const sliceOptions: SliceOptions = {
      hyperplaneRotation: this.hyperplaneRotation,
      smoothTemporal: this.smoothTemporal,
    };
    const sliced = sliceSceneAtTime(visible, this.time, sliceOptions);
    if (sliced.length === 0) {
      this.lastStats = {
        totalPrimitives: this.primitives.length,
        projectedSplats: 0,
        renderedSplats: 0,
        lastFrameMs: performance.now() - frameStart,
        qualityPreset: this.qualityPreset,
      };
      return;
    }

    const aspect = canvas.width / canvas.height;
    const camera: CameraParams = {
      ...createOrbitCamera(
        this.cameraAzimuth,
        this.cameraElevation,
        this.cameraRadius,
        aspect,
        this.fovY,
        this.isOrthographic,
      ),
      viewport: [canvas.width, canvas.height],
    };

    const splats2d = projectSplats(sliced, camera);
    const projectedCount = splats2d.length;

    if (projectedCount === 0) {
      this.lastStats = {
        totalPrimitives: this.primitives.length,
        projectedSplats: 0,
        renderedSplats: 0,
        lastFrameMs: performance.now() - frameStart,
        qualityPreset: this.qualityPreset,
      };
      return;
    }

    const maxSplats = QUALITY_MAX_SPLATS[this.qualityPreset];
    applyRenderBudget(splats2d, maxSplats);

    // FIX 3: Back-to-front depth sorting for order-independent alpha compositing.
    // NOTE: Sorting on the CPU may become a bottleneck for >100,000 primitives per frame.
    // This ties to the 500K-primitive render performance target recorded in KNOWN_GAPS.md.
    splats2d.sort((a, b) => b.depth - a.depth);

    this.splatBuffer.upload(splats2d);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.quadVao);
    this.splatBuffer.bind(this.program);

    const viewportLoc = gl.getUniformLocation(this.program, 'u_viewport');
    const foveaLoc = gl.getUniformLocation(this.program, 'u_foveatedStrength');
    const renderModeLoc = gl.getUniformLocation(this.program, 'u_renderMode');
    const depthMinLoc = gl.getUniformLocation(this.program, 'u_depthMin');
    const depthMaxLoc = gl.getUniformLocation(this.program, 'u_depthMax');

    let depthMin = splats2d[0].depth;
    let depthMax = splats2d[0].depth;
    for (const splat of splats2d) {
      depthMin = Math.min(depthMin, splat.depth);
      depthMax = Math.max(depthMax, splat.depth);
    }

    gl.uniform2f(viewportLoc, canvas.width || 960, canvas.height || 540);
    gl.uniform1f(foveaLoc, this.foveatedStrength);
    gl.uniform1f(renderModeLoc, this.renderMode === 'depth' ? 1 : 0);
    gl.uniform1f(depthMinLoc, depthMin);
    gl.uniform1f(depthMaxLoc, depthMax);

    // FIX 3: Enable alpha blending and disable depth buffer writes during splat rendering
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);

    const count = this.splatBuffer.getCount();
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);

    gl.depthMask(true);
    gl.bindVertexArray(null);
    gl.useProgram(null);

    this.lastStats = {
      totalPrimitives: this.primitives.length,
      projectedSplats: projectedCount,
      renderedSplats: count,
      lastFrameMs: performance.now() - frameStart,
      qualityPreset: this.qualityPreset,
    };
  }

  dispose(): void {
    const { gl } = this.context;
    gl.deleteProgram(this.program);
    gl.deleteVertexArray(this.quadVao);
    this.splatBuffer.dispose();
  }

  private classifyLayer(primitive: GaussianPrimitive4D): PrimitiveLayer {
    if (primitive.alpha < 0.25) {
      return 'transient';
    }

    const temporalOffset = Math.abs(primitive.mean[3]);
    if (this.sceneDuration > 0 && temporalOffset > 1e-4) {
      return 'dynamic';
    }

    return 'static';
  }

  private filterByLayer(
    primitives: GaussianPrimitive4D[],
  ): GaussianPrimitive4D[] {
    return primitives.filter((primitive) => {
      const layer = this.classifyLayer(primitive);
      return this.layerVisibility[layer];
    });
  }

  private createProgram(vertexSrc: string, fragmentSrc: string): WebGLProgram {
    const { gl } = this.context;

    const vertex = this.compileShader(gl.VERTEX_SHADER, vertexSrc);
    const fragment = this.compileShader(gl.FRAGMENT_SHADER, fragmentSrc);

    const program = gl.createProgram();
    if (!program) {
      throw new Error('Failed to create WebGL program');
    }

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) ?? 'Unknown link error';
      gl.deleteProgram(program);
      throw new Error(`Program link failed: ${log}`);
    }

    gl.deleteShader(vertex);
    gl.deleteShader(fragment);

    return program;
  }

  private compileShader(type: number, source: string): WebGLShader {
    const { gl } = this.context;
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) ?? 'Unknown compile error';
      gl.deleteShader(shader);
      throw new Error(`Shader compile failed: ${log}`);
    }

    return shader;
  }

  private createUnitQuad(): WebGLVertexArrayObject {
    const { gl } = this.context;
    const vao = gl.createVertexArray();
    if (!vao) {
      throw new Error('Failed to create VAO');
    }

    const vbo = gl.createBuffer();
    if (!vbo) {
      throw new Error('Failed to create VBO');
    }

    const corners = new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]);

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, corners, gl.STATIC_DRAW);

    const cornerLoc = 0;
    gl.enableVertexAttribArray(cornerLoc);
    gl.vertexAttribPointer(cornerLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return vao;
  }
}
