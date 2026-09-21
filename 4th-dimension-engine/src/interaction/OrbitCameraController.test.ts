import { describe, expect, it } from 'vitest';

import { OrbitCameraController } from './OrbitCameraController';

// Simple mock HTMLCanvasElement for vitest
function createMockCanvas(): HTMLCanvasElement {
  const listeners: Record<string, Function[]> = {};

  return {
    addEventListener: (type: string, fn: Function) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    },
    removeEventListener: (type: string, fn: Function) => {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter((f) => f !== fn);
      }
    },
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
    getBoundingClientRect: () => ({ width: 800, height: 600, top: 0, left: 0 }),
    listeners,
  } as unknown as HTMLCanvasElement;
}

function triggerEvent(canvas: HTMLCanvasElement, type: string, eventObj: any) {
  const listeners = (canvas as any).listeners[type] || [];
  for (const fn of listeners) {
    fn(eventObj);
  }
}

describe('OrbitCameraController Auto-Orbit Tests', () => {
  it('enables auto-orbit by default on fresh view', () => {
    const canvas = createMockCanvas();
    const camera = new OrbitCameraController(canvas, { autoOrbit: true });

    expect(camera.isAutoOrbiting()).toBe(true);
    expect(camera.hasUserInteracted()).toBe(false);

    camera.dispose();
  });

  it('stops auto-orbit immediately on pointerdown drag interaction and marks userInteracted=true', () => {
    const canvas = createMockCanvas();
    const camera = new OrbitCameraController(canvas);

    expect(camera.isAutoOrbiting()).toBe(true);

    triggerEvent(canvas, 'pointerdown', { clientX: 100, clientY: 100, pointerId: 1 });

    expect(camera.isAutoOrbiting()).toBe(false);
    expect(camera.hasUserInteracted()).toBe(true);

    camera.dispose();
  });

  it('does NOT restart auto-orbit after user releases drag (pointerup)', () => {
    const canvas = createMockCanvas();
    const camera = new OrbitCameraController(canvas);

    triggerEvent(canvas, 'pointerdown', { clientX: 100, clientY: 100, pointerId: 1 });
    triggerEvent(canvas, 'pointermove', { clientX: 120, clientY: 100, pointerId: 1 });
    triggerEvent(canvas, 'pointerup', { clientX: 120, clientY: 100, pointerId: 1 });

    expect(camera.isAutoOrbiting()).toBe(false);
    expect(camera.hasUserInteracted()).toBe(true);

    camera.dispose();
  });

  it('stops auto-orbit immediately on wheel zoom interaction', () => {
    const canvas = createMockCanvas();
    const camera = new OrbitCameraController(canvas);

    expect(camera.isAutoOrbiting()).toBe(true);

    triggerEvent(canvas, 'wheel', { deltaY: 50, preventDefault: () => {} });

    expect(camera.isAutoOrbiting()).toBe(false);
    expect(camera.hasUserInteracted()).toBe(true);

    camera.dispose();
  });

  it('respects autoOrbit: false option for saved/custom camera views', () => {
    const canvas = createMockCanvas();
    const camera = new OrbitCameraController(canvas, { autoOrbit: false });

    expect(camera.isAutoOrbiting()).toBe(false);

    camera.dispose();
  });

  it('stops auto-orbit when stopAutoOrbit() is called explicitly on viewpoint preset selection', () => {
    const canvas = createMockCanvas();
    const camera = new OrbitCameraController(canvas);

    expect(camera.isAutoOrbiting()).toBe(true);
    camera.setState({ azimuth: 0, elevation: 0 });
    camera.stopAutoOrbit();

    expect(camera.isAutoOrbiting()).toBe(false);
    expect(camera.hasUserInteracted()).toBe(true);
    expect(camera.getState().azimuth).toBe(0);
    expect(camera.getState().elevation).toBe(0);

    camera.dispose();
  });
});

