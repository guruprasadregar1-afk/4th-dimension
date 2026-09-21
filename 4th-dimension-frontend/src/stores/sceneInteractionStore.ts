import { create } from 'zustand';

export interface HyperplaneRotation {
  xw: number;
  yw: number;
  zw: number;
}

export interface LayerVisibility {
  static: boolean;
  dynamic: boolean;
  transient: boolean;
}

export type RenderMode = 'color' | 'depth';

export type QualityPreset = 'high' | 'balanced' | 'performance';

export type CameraPreset = 'front' | 'top' | 'side' | 'isometric';

export type ProjectionMode = 'perspective' | 'orthographic';

export interface PhysicsParams {
  stiffness: number;
  damping: number;
  gravity: number;
}

interface SceneInteractionState {
  time: number;
  duration: number;
  isPlaying: boolean;
  hyperplane: HyperplaneRotation;
  layers: LayerVisibility;
  renderMode: RenderMode;
  qualityPreset: QualityPreset;
  physicsEnabled: boolean;
  cameraPreset: CameraPreset | null;
  fov: number;
  projectionMode: ProjectionMode;
  physicsParams: PhysicsParams;
  setTime: (time: number) => void;
  setDuration: (duration: number) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setHyperplane: (partial: Partial<HyperplaneRotation>) => void;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  setRenderMode: (mode: RenderMode) => void;
  toggleRenderMode: () => void;
  setQualityPreset: (preset: QualityPreset) => void;
  setPhysicsEnabled: (enabled: boolean) => void;
  togglePhysics: () => void;
  setCameraPreset: (preset: CameraPreset) => void;
  setFov: (fov: number) => void;
  setProjectionMode: (mode: ProjectionMode) => void;
  toggleProjectionMode: () => void;
  setPhysicsParams: (partial: Partial<PhysicsParams>) => void;
  reset: () => void;
}

const DEFAULT_HYPERPLANE: HyperplaneRotation = { xw: 0, yw: 0, zw: 0 };
const DEFAULT_LAYERS: LayerVisibility = {
  static: true,
  dynamic: true,
  transient: true,
};
const DEFAULT_PHYSICS_PARAMS: PhysicsParams = {
  stiffness: 0.8,
  damping: 0.8,
  gravity: -2.0,
};

export const useSceneInteractionStore = create<SceneInteractionState>(
  (set) => ({
    time: 0,
    duration: 5,
    isPlaying: false,
    hyperplane: DEFAULT_HYPERPLANE,
    layers: DEFAULT_LAYERS,
    renderMode: 'color',
    qualityPreset: 'balanced',
    physicsEnabled: false,
    cameraPreset: null,
    fov: 45,
    projectionMode: 'perspective',
    physicsParams: DEFAULT_PHYSICS_PARAMS,

    setTime: (time) => set({ time }),
    setDuration: (duration) => set({ duration }),
    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
    setPlaying: (isPlaying) => set({ isPlaying }),
    setHyperplane: (partial) =>
      set((state) => ({
        hyperplane: { ...state.hyperplane, ...partial },
      })),
    toggleLayer: (layer) =>
      set((state) => ({
        layers: { ...state.layers, [layer]: !state.layers[layer] },
      })),
    setRenderMode: (renderMode) => set({ renderMode }),
    toggleRenderMode: () =>
      set((state) => ({
        renderMode: state.renderMode === 'color' ? 'depth' : 'color',
      })),
    setQualityPreset: (qualityPreset) => set({ qualityPreset }),
    setPhysicsEnabled: (physicsEnabled) => set({ physicsEnabled }),
    togglePhysics: () =>
      set((state) => ({ physicsEnabled: !state.physicsEnabled })),
    setCameraPreset: (cameraPreset) => set({ cameraPreset }),
    setFov: (fov) => set({ fov }),
    setProjectionMode: (projectionMode) => set({ projectionMode }),
    toggleProjectionMode: () =>
      set((state) => ({
        projectionMode:
          state.projectionMode === 'perspective' ? 'orthographic' : 'perspective',
      })),
    setPhysicsParams: (partial) =>
      set((state) => ({
        physicsParams: { ...state.physicsParams, ...partial },
      })),
    reset: () =>
      set({
        time: 0,
        duration: 5,
        isPlaying: false,
        hyperplane: DEFAULT_HYPERPLANE,
        layers: DEFAULT_LAYERS,
        renderMode: 'color',
        qualityPreset: 'balanced',
        physicsEnabled: false,
        cameraPreset: null,
        fov: 45,
        projectionMode: 'perspective',
        physicsParams: DEFAULT_PHYSICS_PARAMS,
      }),
  }),
);

