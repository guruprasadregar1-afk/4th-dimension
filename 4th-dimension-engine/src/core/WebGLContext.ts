export class WebGLContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebGLContextError';
  }
}

/** Initializes and owns a WebGL2 rendering context on a canvas element. */
export class WebGLContext {
  readonly canvas: HTMLCanvasElement;
  readonly gl: WebGL2RenderingContext;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: true,
      premultipliedAlpha: false,
    });

    if (!gl) {
      throw new WebGLContextError(
        'WebGL2 is not available. A WebGL2-capable browser is required.',
      );
    }

    this.gl = gl;
    this.configureDefaults();
  }

  resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  clear(color: [number, number, number, number] = [0.04, 0.04, 0.06, 1]): void {
    const [r, g, b, a] = color;
    this.gl.clearColor(r, g, b, a);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  private configureDefaults(): void {
    const { gl } = this;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
}
