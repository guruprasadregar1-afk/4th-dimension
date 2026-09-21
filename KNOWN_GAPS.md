# Known Gaps — Pre-Launch Verification Required

These items are explicitly deferred, not resolved. Do not mark them as passing anywhere, and do not build further features that assume they are true without flagging that assumption.

## 1. 500K-Primitive Render Performance (UNVERIFIED)
- **Target**: 60 FPS on RTX 3060+ class GPU, 30 FPS on integrated graphics, at 500,000 Gaussian primitives (Master Technical Sprint Document, Section 2.3).
- **Status**: BLOCKED. The sandbox environment's headless Chrome has no physical GPU driver access (`canvas.getContext('webgl2')` returns `null`). Time-slicing logic is verified with passing unit tests, and render pipeline logic is verified up to 50,000 primitives.
- **Action Required Before Launch**: Run `public/webgl2-benchmark.html` (or automated Playwright GPU test) on a machine with a physical GPU / GPU-enabled cloud CI runner and record actual FPS under 500,000 primitive load.

## 2. 10,000 Concurrent User Capacity (UNVERIFIED)
- **Target**: 10,000 concurrent websocket/HTTP connections handled with graceful degradation (Master Technical Sprint Document, Section 2.3).
- **Status**: BLOCKED. Single-node local environment hits OS socket exhaustion and NestJS Throttler limits (`THROTTLE_LIMIT=100` correctly rate-limits excessive connections with HTTP 429). Throttling protection is verified in `concurrency10k-load.spec.ts`, but full 10K connection load requires distributed multi-node staging infrastructure.
- **Action Required Before Launch**: Execute a k6 / Artillery load test script against a deployed multi-node staging cluster with rate limiters configured for production thresholds.

---

## Verified Items (For Context)
- **GridFS 16MB Single-Chunk Upload Boundary**: **VERIFIED PASS** (55.31MB 4D dataset successfully stored & streamed via multi-chunk GridFS in `gridfs-boundary500k.spec.ts`).
- **NestJS Throttler Rate Limiting**: **VERIFIED PASS** (HTTP 429 correctly returned when request limits are exceeded).
- **Session & Access Token Auth**: **VERIFIED PASS** (1-hour access token, client-side auto-refresh, pure access-token auth without session logout loops).
- **Comprehensive Test Coverage**: **VERIFIED PASS** (22/22 NestJS backend tests passing, 20/20 4D Engine tests passing across 7 suites).
