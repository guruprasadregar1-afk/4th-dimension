# Master Technical Sprint Document — 4D Representation Platform

## 1. Project Overview & Boundaries

### What We Are Building
- **Core Platform**: Browser-based 4D Gaussian Splatting visualization platform with WebGL2 rendering and Extended Position-Based Dynamics (XPBD) soft-body physics simulation.
- **Real-Time Collaboration**: Real-time multi-user scene viewing (active viewer presence, synchronized time scrubbing) via WebSockets (Sprint B17 / F17).
- **Scene Storage**: Hybrid storage model (embedded arrays for scenes $\le 16$MB; MongoDB GridFS chunking for scenes $> 16$MB).

### Technical Boundaries
- **Scene Complexity Cap**: 500,000 Gaussian primitives per scene.
- **Backend Concurrency Target**: 10,000 concurrent users.
- **Render Performance Target**: 60 FPS (RTX 3060+ class GPUs) / 30 FPS (Integrated GPUs).

---

## 2. System Architecture & Tech Stack

### Technology Stack
- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, SWR, Zustand, React Hook Form, Zod.
- **BFF Layer**: Next.js App Router API Route Handlers (`/api/*`) proxying requests to NestJS API.
- **Backend**: NestJS 10 (Monolithic architecture), TypeScript, Mongoose ODM, MongoDB Atlas / GridFS, Bcrypt, `@nestjs/throttler`, Socket.io.
- **4D Engine**: WebGL2 with custom GLSL splat shaders (`splat.vert.glsl`, `splat.frag.glsl` — native implementation, Supersplat dependency removed for direct 4D hyperplane slicing and order-independent transparency control).

### Request Path Architecture (BFF Pattern)
```
Browser Client  ──(httpOnly Cookies)──>  Next.js BFF Route Handlers (/api/*)
                                                    │
                                         (Authorization: Bearer JWT)
                                                    ▼
                                          NestJS REST API (:4000)
                                                    │
                                             (Mongoose ODM)
                                                    ▼
                                           MongoDB Atlas / GridFS
```

---

## 3. 4D Engine Sprint ID Mapping Table (Internal Codebase vs Master Specs)

| Codebase Internal Name | Master Document Sprint ID | Module Description | Status |
| :--- | :--- | :--- | :---: |
| **E1** | **E1 – E2** | 4D Vector/Matrix Math & 6-Plane Rotation Matrices ($R_{xy}, R_{xz}, R_{yz}, R_{xw}, R_{yw}, R_{zw}$) | **DONE** |
| **E2** | **E3** | WebGL2 Context & Custom GLSL Splat Shaders (`splat.vert/frag.glsl`) | **DONE** |
| **E3** | **E3.2 – E3.5** | 4D Time-Slicing Decomposition, 3D Projection & Alpha Blending (`SplatBuffer.ts`) | **DONE** |
| **E4** | **E4 – E5** | Time Scrubber API, Orbit Camera Controller (`OrbitCameraController.ts`), Hyperplane Rotations | **DONE** |
| **E5** | **E6** | Depth Visualization Shader (`renderMode: depth`) & Segmentation Layer Filtering | **DONE** |
| **E6** | **E7** | Level-of-Detail (LOD) & Dynamic Performance Manager (`lod.ts`) | **DONE** |
| **E7** | **E15** | XPBD 4D Soft-Body Physics Constraint Solver (`xpbd.ts`, `PhysicsWorld.ts`) | **DONE** |

---

## 4. Retroactively Recorded Sprints & Scope Additions

### Backend Sprint B17: Real-Time Collaboration & WebSockets
- **Goal**: Enable real-time active viewer presence and remote timeline scrubbing synchronization across active clients.
- **Scope**: `EventsModule` and `SceneGateway` (`src/events/scene.gateway.ts`) using Socket.io.

### Frontend Sprint F17: Multi-User Viewer Sync
- **Goal**: Synchronize active viewer counts and remote hyperplane scrubbing in the 4D Viewer.
- **Scope**: `useSceneSocket` hook (`src/hooks/useSceneSocket.ts`) and `ViewerPageClient.tsx`.

### Backend Sprint B18: Analytics & System Performance API
- **Goal**: Provide metrics for scene popularity, view counts, and platform storage utilization.
- **Scope**: `AnalyticsModule` and `AnalyticsController` (`src/analytics/analytics.controller.ts`).

### Scene Cloning & Engine State Snapshots (Sprint B5 Additions)
- **Task B5.4 (Scene Cloning)**: Duplicate scene documents and primitive data (`POST /scenes/:id/clone`).
- **Task B5.5 (Physics Snapshots)**: Save physical engine state snapshots (`POST /scenes/:id/snapshot`).

### Frontend Sprint F9: Camera Control UI & Physical Parameter UI
- **Goal**: Implement camera viewpoint presets (Front, Top, Side, Isometric), FOV adjustment slider ($30^\circ - 90^\circ$), perspective vs. orthographic projection toggle, and XPBD soft-body physical parameter sliders (stiffness, damping/friction, gravity). Clicking camera presets explicitly halts auto-orbit (`userInteracted = true`), and physical parameter controls are visibly disabled with reduced opacity when physics is OFF.
- **Scope**: `ViewerControls.tsx`, `sceneInteractionStore.ts`, `ViewerCanvas.tsx`, `Engine4D.ts`, `GaussianRenderer.ts`, `projection.ts`, `PhysicsWorld.ts`.
- **Status**: **DONE**

### glTF Manifest Export (Sprint B11 Addition)
- **Task B11.4 (glTF Manifest Export)**: Export 4D scene structure as glTF 2.0 manifest JSON (`GET /scenes/:id/export?format=gltf_manifest`).

---

## 5. Open Items & Assumptions Requiring Sign-Off

1. **Real-Time WebSockets Concurrency Load Testing**:
   - **Note**: While `EventsModule` and `SceneGateway` are built and functional, WebSockets active connection scaling has not been load-tested at the 10,000 concurrent socket level. Dedicated socket benchmarking (e.g. via `artillery`) is required prior to production release.

2. **Proposed Sprint E8: WebGPU Compute Shader Acceleration**:
   - **Note**: WebGPU compute shader migration is proposed for rendering scene densities exceeding 500,000 primitives. *Requires explicit sign-off before starting work.*
