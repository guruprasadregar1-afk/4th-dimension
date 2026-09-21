# 4D Representation Platform — Project Code

Monorepo-style layout for the 4D visualization platform.

## Projects

| Folder | Stack | Sprint |
|--------|-------|--------|
| `4th-dimension-backend` | NestJS + MongoDB | B1–B6 — Foundation through primitive storage |
| `4th-dimension-engine` | WebGL2 + TypeScript + Vite | Sprint 3 — Time-slicing + Splat rendering |
| `4th-dimension-frontend` | Next.js 14 + Tailwind | F1 — Routing & shell |

---

## Challenges & workarounds

Issues encountered during development and how they were resolved.

### Node.js version vs test dependencies

| Issue | `mongodb-memory-server` v11 requires Node **≥ 20.19.0**; dev machine runs **v20.11.1**, causing console warnings on every e2e run |
|-------|---|
| Impact | Tests still passed; warnings cluttered output; future package versions may break |
| Fix | Pinned `mongodb-memory-server` to **v10.1.4** (dev/test dependency only) |
| Product impact | **None** — production uses MongoDB Atlas, not in-memory MongoDB |

### Port conflicts on local dev

| Issue | Port **3000** (and 3001) already in use by another service on the dev machine |
|-------|---|
| Impact | Backend failed to start with `EADDRINUSE` |
| Fix | Set `PORT=4000` in `.env` |
| Product impact | **None** — port is configurable per environment |

### Refresh token revocation (found during B4 testing)

| Issue | Password change did not invalidate refresh tokens due to inconsistent `userId` type (string vs ObjectId) in MongoDB queries |
|-------|---|
| Impact | Old sessions remained valid after password change |
| Fix | Always store `userId` as `ObjectId` when creating refresh tokens |
| Product impact | **Security fix** — sessions now correctly invalidate on password change |

---

## Running tests

### Backend (Sprint B1–B6 QA cases)

```bash
cd 4th-dimension-backend
npm test          # unit tests
npm run test:e2e  # e2e tests (uses in-memory MongoDB)
```

E2e tests map to sprint test IDs: `TC-B1-01` through `TC-B11-05`.

### Engine (Sprint 3 math)

```bash
cd 4th-dimension-engine
npm test
```

---

## Quick start

### Backend

```bash
cd 4th-dimension-backend
cp .env.example .env
npm install
npm run start:dev
```

- API: http://localhost:4000 (port configurable via `PORT` in `.env`)
- Swagger: http://localhost:4000/api/docs
- Health: http://localhost:4000/health

**Auth endpoints (Sprint B2–B3):**
- `POST /auth/register` — create account
- `POST /auth/login` — get access + refresh tokens
- `POST /auth/refresh` — rotate refresh token
- `POST /auth/logout` — revoke token family
- `GET /auth/me` — current user (Bearer token required)

**User profile endpoints (Sprint B4):**
- `GET /users/me` — view profile
- `PATCH /users/me` — update email
- `PATCH /users/me/password` — change password (invalidates all sessions)
- `DELETE /users/me` — delete account (requires password confirmation)

**Scene endpoints (Sprint B5):**
- `POST /scenes` — create scene (sets ownerId from JWT)
- `GET /scenes` — paginated list with search & filters (`?limit&offset&search&minPrimitiveCount&maxDuration&...`)
- `GET /scenes/:id` — get scene metadata (owner only)
- `PATCH /scenes/:id` — update scene (owner only)
- `DELETE /scenes/:id` — delete scene (owner only)
- `GET /scenes/:id/export` — native JSON export (re-importable)
- `POST /scenes/:id/clone` — duplicate scene and primitives (optional `{ title }`)

**Primitive storage endpoints (Sprint B6):**
- `PUT /scenes/:id/primitives` — upload 4D Gaussian primitives (embedded if ≤ 16MB, else GridFS)
- `GET /scenes/:id/primitives` — fetch primitives (same response format for both storage types)

**Import endpoints (Sprint B8):**
- `POST /imports` — multipart upload (`.json`, `.ply`, `.splat`); creates async import job
- `GET /imports/:id` — poll import status (`pending` → `processing` → `complete` / `failed`)
- `GET /imports` — list your import jobs

Supported formats:
- **Native JSON** — platform schema `{ duration?, title?, primitives: [{ mean[4], covariance[16], color[4], alpha }] }`
- **3DGS PLY** — INRIA 3D Gaussian Splatting binary/ASCII (mapped to 4D with `t=0`)
- **4D keyframes JSON** — `{ format: "4d-gaussians-keyframes", frames: [{ time, gaussians }] }`
- **SPLAT** — antimatter15 32-byte records

Optional form fields: `title`, `description`, `tags` (comma-separated), `duration`.

Download real-world sample files (when online): `npm run download-samples` in backend.

**Security (Sprint B9):**
- Global rate limiting via `@nestjs/throttler` (configurable in `.env`)
- Stricter limits on `/auth/*` and `POST /imports`
- Search queries escape regex metacharacters; DTOs trim and reject unknown fields
- Production dependency audit: `npm run audit:prod`

**Caching (Sprint B10):**
- In-memory response cache for `GET /scenes/:id` and `GET /scenes/:id/primitives`
- `X-Cache: HIT|MISS|BYPASS` header on cached routes
- Automatic invalidation on upload, patch, and delete
- Configurable via `CACHE_ENABLED`, `CACHE_*_TTL_SECONDS` in `.env`

Requires MongoDB (Atlas or local). Set `JWT_ACCESS_SECRET` in `.env` before starting.

### Frontend (Sprint F1–F2)

```bash
cd 4th-dimension-frontend
cp .env.example .env.local
npm install
npm run dev
```

- App: http://localhost:3002
- **Public routes:** `/login`, `/register` (React Hook Form + Zod validation)
- **Authenticated shell:** `/dashboard`, `/viewer`, `/scenes` (middleware-protected)
- **Scene library (F5):** search, primitive/duration filters, pagination, export JSON, open in viewer
- **Import UI (F6):** upload `.json`/`.ply`/`.splat` on `/scenes`, progress polling, recent import history
- **Auth:** JWT stored in httpOnly cookies via Next.js BFF routes (`/api/auth/*`)
- **State:** Zustand store for 4D viewer interaction (time, hyperplane, layers)
- **UX polish (F7):** skeleton loaders, error banners with retry, viewer Space = play/pause
- Requires backend running at `http://localhost:4000`

### 4D Engine (Sprint 3 + backend integration)

```bash
cd 4th-dimension-engine
npm install
npm run dev
```

- Dev canvas: http://localhost:5173
- **Load from API:** log in → select your scene → renders 4D Gaussians from backend (embedded or GridFS)
- **Load local demo:** offline fallback, no backend required
- **XPBD physics (Sprint 7):** toggle in viewer — soft-body distance constraints on spatial Gaussian means; press Play to simulate

**End-to-end flow (product-aligned):**
1. Start backend (`npm run start:dev` in `4th-dimension-backend`)
2. Register/login via Swagger or dev canvas
3. `POST /scenes` → `PUT /scenes/:id/primitives` with 4D Gaussian data
4. Engine dev canvas → Login → Load scene → time-sliced 4D rendering

---

## Development order

1. **Backend B1** — NestJS + MongoDB + validation + Swagger ✅
2. **Backend B2–B3** — Register/login, JWT, refresh rotation, auth guard ✅
3. **Engine Sprint 3** — 4D time-slicing, 3D→2D projection, alpha splats ✅
4. **Backend B4** — User profile, change password, account deletion ✅
5. **Backend B5** — Scene CRUD with ownership checks ✅
6. **Backend B6** — Embedded + GridFS primitive storage ✅
7. **Engine ↔ Backend** — JWT auth, load 4D primitives from API ✅
8. **Engine Sprint 4** — Time scrubber, orbit camera, hyperplane rotation, foveated rendering ✅
9. **Backend B7** — Scene search, pagination, filters ✅
10. **Backend B8** — Asset upload, Gaussian model import ✅
11. **Frontend F1** — Next.js App Router, route groups, auth context, shell ✅
12. **Frontend F2** — JWT auth (httpOnly cookies), forms, middleware, Zustand ✅
13. **Frontend F3** — Engine embed in /viewer, BFF scene API ✅
14. **Frontend F5** — Scene library (search/filter/pagination), export JSON ✅
15. **Backend B9** — Rate limiting, input hardening, dependency audit ✅
16. **Frontend F6** — Import UI (upload, progress polling, BFF `/api/imports`) ✅
17. **Engine Sprint 5** — Depth shader + layer filtering wired to viewer ✅
18. **Backend B10** — In-memory response caching for scene reads ✅
19. **Engine Sprint 6** — Adaptive LOD, render budget, stats in viewer ✅
20. **Engine Sprint 7** — XPBD soft-body physics on Gaussian spatial means ✅
21. **Frontend F7** — Loading states, error retry, viewer keyboard shortcuts ✅
22. **Backend B11** — Scene export API + clone/duplicate ✅
23. **Engine Sprint 8** or **Backend B12+** — next options
