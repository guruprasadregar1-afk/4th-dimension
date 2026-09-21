export interface OrbitCameraState {
  azimuth: number;
  elevation: number;
  radius: number;
}

export interface OrbitCameraControllerOptions {
  initial?: Partial<OrbitCameraState>;
  minRadius?: number;
  maxRadius?: number;
  autoOrbit?: boolean;
  /** Speed in revolutions per minute (RPM). Default: 0.2 RPM around Y-axis. */
  autoOrbitRpm?: number;
  onChange?: (state: OrbitCameraState) => void;
}

/** Mouse/Touch-driven orbit camera with gentle ambient auto-orbit for 3D Gaussian Splat view. */
export class OrbitCameraController {
  private azimuth: number;
  private elevation: number;
  private radius: number;
  private dragging = false;
  private userInteracted = false;
  private autoOrbitEnabled: boolean;
  private autoOrbitRpm: number;
  private autoOrbitAnimationId: number | null = null;
  private lastFrameTime = 0;
  private lastX = 0;
  private lastY = 0;
  private readonly minRadius: number;
  private readonly maxRadius: number;
  private readonly onChange?: (state: OrbitCameraState) => void;

  private readonly onPointerDown = (e: PointerEvent): void => {
    this.stopAutoOrbit();
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    if (this.canvas.setPointerCapture && e.pointerId !== undefined) {
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch {
        // Fallback for mock/test environments
      }
    }
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return;

    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    this.azimuth += dx * 0.005;
    this.elevation = clamp(
      this.elevation + dy * 0.005,
      -Math.PI / 2 + 0.1,
      Math.PI / 2 - 0.1,
    );

    this.emit();
  };

  private readonly onPointerUp = (e: PointerEvent): void => {
    this.dragging = false;
    if (this.canvas.releasePointerCapture && e.pointerId !== undefined) {
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Fallback for mock/test environments
      }
    }
  };

  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.stopAutoOrbit();
    this.radius = clamp(
      this.radius + e.deltaY * 0.005,
      this.minRadius,
      this.maxRadius,
    );
    this.emit();
  };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: OrbitCameraControllerOptions = {},
  ) {
    this.azimuth = options.initial?.azimuth ?? 0.6;
    this.elevation = options.initial?.elevation ?? 0.35;
    this.radius = options.initial?.radius ?? 4;
    this.minRadius = options.minRadius ?? 1.5;
    this.maxRadius = options.maxRadius ?? 12;
    this.autoOrbitRpm = options.autoOrbitRpm ?? 0.2;
    this.onChange = options.onChange;

    // Check reduced motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Auto-orbit is enabled by default unless explicitly set to false or prefers-reduced-motion is true
    this.autoOrbitEnabled =
      options.autoOrbit !== false && !prefersReducedMotion;

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointerleave', this.onPointerUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });

    if (this.autoOrbitEnabled) {
      this.startAutoOrbitLoop();
    }
  }

  getState(): OrbitCameraState {
    return {
      azimuth: this.azimuth,
      elevation: this.elevation,
      radius: this.radius,
    };
  }

  setState(state: Partial<OrbitCameraState>): void {
    if (state.azimuth !== undefined) this.azimuth = state.azimuth;
    if (state.elevation !== undefined) this.elevation = state.elevation;
    if (state.radius !== undefined) {
      this.radius = clamp(state.radius, this.minRadius, this.maxRadius);
    }
    this.emit();
  }

  isAutoOrbiting(): boolean {
    return this.autoOrbitEnabled && !this.userInteracted && !this.dragging;
  }

  hasUserInteracted(): boolean {
    return this.userInteracted;
  }

  stopAutoOrbit(): void {
    this.userInteracted = true;
    this.autoOrbitEnabled = false;
    if (this.autoOrbitAnimationId !== null) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.autoOrbitAnimationId);
      }
      this.autoOrbitAnimationId = null;
    }
  }

  dispose(): void {
    this.stopAutoOrbit();
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }

  private startAutoOrbitLoop(): void {
    if (!this.autoOrbitEnabled || this.userInteracted) return;

    this.lastFrameTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const tick = (): void => {
      if (!this.autoOrbitEnabled || this.userInteracted || this.dragging) {
        this.autoOrbitAnimationId = null;
        return;
      }

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = now;

      // 0.2 RPM = 0.2 * 2 * Math.PI rad / 60 sec ≈ 0.02094395 rad/sec
      const radPerSec = (this.autoOrbitRpm * Math.PI * 2) / 60;
      this.azimuth += radPerSec * dt;

      this.emit();

      if (typeof requestAnimationFrame === 'function') {
        this.autoOrbitAnimationId = requestAnimationFrame(tick);
      }
    };

    if (typeof requestAnimationFrame === 'function') {
      this.autoOrbitAnimationId = requestAnimationFrame(tick);
    }
  }

  private emit(): void {
    this.onChange?.(this.getState());
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
