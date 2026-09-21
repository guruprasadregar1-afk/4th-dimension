import { SceneApiClient } from '../api/sceneApi';
import { WebGLContext } from '../core/WebGLContext';
import { OrbitCameraController } from '../interaction/OrbitCameraController';
import type { HyperplaneRotation } from '../math/hyperplane4d';
import { DEFAULT_HYPERPLANE } from '../math/hyperplane4d';
import { clonePrimitives, restoreSpatialMeans } from '../physics/clonePrimitives';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import type { PhysicsStats } from '../physics/types';
import { GaussianRenderer } from '../renderer/GaussianRenderer';
import type {
  GaussianPrimitive4D,
  LayerVisibility,
  QualityPreset,
  RenderMode,
  RenderStats,
  ScenePayload,
} from '../types/GaussianPrimitive';

export interface Engine4DOptions {
  canvas: HTMLCanvasElement;
  apiBaseUrl?: string;
  accessToken?: string;
  enableOrbitControls?: boolean;
  enableFoveatedRendering?: boolean;
}

export interface LoadSceneFromApiOptions {
  apiBaseUrl: string;
  accessToken: string;
}

/** Top-level 4D engine entry point consumed by the frontend. */
export class Engine4D {
  readonly context: WebGLContext;
  readonly renderer: GaussianRenderer;
  readonly orbitCamera: OrbitCameraController | null;

  private animationId: number | null = null;
  private startTimestamp = 0;
  private time = 0;
  private playing = false;
  private sceneDuration = 0;
  private loadedScene: ScenePayload | null = null;
  private apiClient: SceneApiClient | null = null;
  private onTimeChange?: (time: number, duration: number) => void;
  private hyperplaneRotation: HyperplaneRotation = { ...DEFAULT_HYPERPLANE };
  private readonly physics = new PhysicsWorld();
  private scenePrimitives: GaussianPrimitive4D[] = [];
  private restPrimitives: GaussianPrimitive4D[] = [];
  private lastPhysicsFrame = 0;

  constructor(options: Engine4DOptions) {
    this.context = new WebGLContext(options.canvas);
    this.renderer = new GaussianRenderer(this.context);

    if (options.enableFoveatedRendering !== false) {
      this.renderer.setFoveatedRendering(true);
    }

    if (options.apiBaseUrl) {
      this.apiClient = new SceneApiClient({
        baseUrl: options.apiBaseUrl,
        accessToken: options.accessToken,
      });
    }

    if (options.enableOrbitControls !== false) {
      this.orbitCamera = new OrbitCameraController(options.canvas, {
        onChange: (state) => {
          this.renderer.setCamera(
            state.azimuth,
            state.elevation,
            state.radius,
          );
          this.renderer.render();
        },
      });
    } else {
      this.orbitCamera = null;
    }

    const rect = options.canvas.getBoundingClientRect();
    this.context.resize(rect.width, rect.height);
  }

  setOnTimeChange(callback: (time: number, duration: number) => void): void {
    this.onTimeChange = callback;
  }

  loadScene(scene: ScenePayload): void {
    this.loadedScene = scene;
    this.sceneDuration = scene.duration;
    this.restPrimitives = clonePrimitives(scene.primitives);
    this.scenePrimitives = clonePrimitives(scene.primitives);
    this.renderer.setSceneDuration(scene.duration);
    this.renderer.setPrimitives(this.scenePrimitives);
    this.physics.initialize(this.restPrimitives);
    this.setTime(0);
  }

  async loadSceneFromApi(
    sceneId: string,
    options: LoadSceneFromApiOptions,
  ): Promise<ScenePayload> {
    const client =
      this.apiClient ??
      new SceneApiClient({
        baseUrl: options.apiBaseUrl,
        accessToken: options.accessToken,
      });

    client.setAccessToken(options.accessToken);
    this.apiClient = client;

    const scene = await client.fetchScenePayload(sceneId);
    this.loadScene(scene);
    return scene;
  }

  getLoadedScene(): ScenePayload | null {
    return this.loadedScene;
  }

  getApiClient(): SceneApiClient | null {
    return this.apiClient;
  }

  getTime(): number {
    return this.time;
  }

  getDuration(): number {
    return this.sceneDuration;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  setHyperplaneRotation(rotation: HyperplaneRotation): void {
    this.hyperplaneRotation = rotation;
    this.renderer.setHyperplaneRotation(rotation);
    this.renderer.render();
  }

  setFov(fovDegrees: number): void {
    this.renderer.setFov(fovDegrees);
    this.renderer.render();
  }

  setProjectionMode(mode: 'perspective' | 'orthographic'): void {
    this.renderer.setProjectionMode(mode);
    this.renderer.render();
  }

  setCameraPreset(preset: 'front' | 'top' | 'side' | 'isometric'): void {
    if (!this.orbitCamera) return;
    this.orbitCamera.stopAutoOrbit();
    switch (preset) {
      case 'front':
        this.orbitCamera.setState({ azimuth: 0, elevation: 0 });
        break;
      case 'top':
        this.orbitCamera.setState({ azimuth: 0, elevation: Math.PI / 2 - 0.001 });
        break;
      case 'side':
        this.orbitCamera.setState({ azimuth: Math.PI / 2, elevation: 0 });
        break;
      case 'isometric':
        this.orbitCamera.setState({ azimuth: Math.PI / 4, elevation: Math.PI / 6 });
        break;
    }
  }

  configurePhysicsParams(params: {
    stiffness?: number;
    damping?: number;
    gravity?: number;
  }): void {
    const partial: Partial<import('../physics/types').PhysicsConfig> = {};
    if (params.gravity !== undefined) {
      partial.gravity = [0, params.gravity, 0];
    }
    if (params.stiffness !== undefined) {
      // stiffness range 0 (soft, compliance 1e-3) to 1 (stiff, compliance 1e-6)
      const compliance = 1e-6 + (1 - Math.max(0, Math.min(1, params.stiffness))) * 1e-3;
      partial.compliance = compliance;
    }
    if (params.damping !== undefined) {
      partial.groundPlane = {
        enabled: true,
        yFloor: -2.0,
        restitution: 0.3,
        friction: Math.max(0, Math.min(1, params.damping)),
      };
    }
    this.physics.configure(partial);
  }

  setRenderMode(mode: RenderMode): void {
    this.renderer.setRenderMode(mode);
    this.renderer.render();
  }

  setLayerVisibility(layers: LayerVisibility): void {
    this.renderer.setLayerVisibility(layers);
    this.renderer.render();
  }

  setQualityPreset(preset: QualityPreset): void {
    this.renderer.setQualityPreset(preset);
    this.renderer.render();
  }

  getQualityPreset(): QualityPreset {
    return this.renderer.getQualityPreset();
  }

  getRenderStats(): RenderStats {
    return this.renderer.getRenderStats();
  }

  setPhysicsEnabled(enabled: boolean): void {
    if (enabled === this.physics.isEnabled()) {
      return;
    }

    this.physics.setEnabled(enabled);

    if (enabled) {
      restoreSpatialMeans(this.scenePrimitives, this.restPrimitives);
      this.physics.initialize(this.restPrimitives);
    } else {
      restoreSpatialMeans(this.scenePrimitives, this.restPrimitives);
      this.physics.reset();
    }

    this.renderer.setPrimitives(this.scenePrimitives);
    this.renderer.render();
  }

  isPhysicsEnabled(): boolean {
    return this.physics.isEnabled();
  }

  getPhysicsStats(): PhysicsStats {
    return this.physics.getStats();
  }

  getHyperplaneRotation(): HyperplaneRotation {
    return { ...this.hyperplaneRotation };
  }

  setTime(time: number): void {
    const clamped =
      this.sceneDuration > 0
        ? Math.min(Math.max(time, 0), this.sceneDuration)
        : Math.max(time, 0);

    this.time = clamped;
    this.renderer.setTime(clamped);
    this.renderer.render();
    this.onTimeChange?.(this.time, this.sceneDuration);
  }

  play(): void {
    if (this.playing) return;
    this.playing = true;
    this.startTimestamp = performance.now() - this.time * 1000;
    this.lastPhysicsFrame = performance.now();
    this.tick();
  }

  pause(): void {
    this.playing = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  togglePlay(): void {
    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  dispose(): void {
    this.pause();
    this.orbitCamera?.dispose();
    this.renderer.dispose();
  }

  private tick = (): void => {
    if (!this.playing) return;

    const now = performance.now();
    let elapsed = (now - this.startTimestamp) / 1000;

    if (this.sceneDuration > 0 && elapsed >= this.sceneDuration) {
      this.startTimestamp = now;
      elapsed = 0;
      if (this.physics.isEnabled()) {
        restoreSpatialMeans(this.scenePrimitives, this.restPrimitives);
        this.physics.reset();
      }
    }

    if (this.physics.isEnabled()) {
      const dt = Math.min(
        this.lastPhysicsFrame > 0 ? (now - this.lastPhysicsFrame) / 1000 : 1 / 60,
        1 / 30,
      );
      this.physics.step(dt, this.scenePrimitives);
      this.renderer.setPrimitives(this.scenePrimitives);
      this.lastPhysicsFrame = now;
    }

    this.setTime(elapsed);
    this.animationId = requestAnimationFrame(this.tick);
  };
}

export type { PhysicsStats } from '../physics/types';
export type {
  GaussianPrimitive4D,
  LayerVisibility,
  QualityPreset,
  RenderMode,
  RenderStats,
  ScenePayload,
  HyperplaneRotation,
};
