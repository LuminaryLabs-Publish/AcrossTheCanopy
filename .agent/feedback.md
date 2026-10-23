# Feedback and deferred findings

Historical documentation findings and current renderer migration results are recorded below.

## ATC-001 — Composition ledger status column is historical/stale

- Type: documentation-history / validation authority
- Evidence: `docs/NEXUS_COMPOSITION_LEDGER.md`, implemented source/tests
- Observation: the ledger was written as a pre-implementation build gate and many rows still say `Partial — proof pending` even though current source/tests now exercise substantial portions of the graph.
- Impact: readers can mistake planning status for current implementation state.
- Documentation action in this pass: add an explicit reconciliation note; preserve individual historical row statuses instead of silently re-certifying every subsystem.
- Suggested future action: run a dedicated current composition certification and update each row with exact current evidence if needed.
- Status: recommended later

## ATC-002 — Root committed build is not the Pages deployment authority

- Type: deployment clarity
- Evidence: root build files, `.github/workflows/deploy.yml`
- Observation: root contains built assets, but Pages workflow rebuilds `source/` and uploads `source/dist`.
- Impact: maintainers could edit/depend on the wrong artifact.
- Documentation action in this pass: clarify source vs snapshot vs CI deployment ownership.
- Status: informational

## ATC-003 — Greybox evidence is not final experience proof

- Type: acceptance boundary
- Evidence: capture adapter review metadata, greybox spec, current primitive content
- Observation: capture intentionally uses colored primitive greybox art and silent audio; deterministic logic is stronger than final audiovisual proof.
- Impact: passing capture/tests should not be labeled final-quality acceptance.
- Suggested future action: preserve separate final-art/audio/human review gates.
- Status: informational

## ATC-004 — Ledger should not be upgraded piecemeal without certification

- Type: evidence hygiene
- Evidence: ledger responsibility table vs varied current tests
- Observation: some rows have strong tests while others would require broader browser/provider/lifecycle proof to call fully current.
- Impact: mechanically changing every old `Partial` to `Pass` would overstate evidence.
- Suggested future action: update table statuses only through a bounded proof/certification pass.
- Status: required evidence discipline

## ATC-005 — NexusGL migration acceptance

- Evidence: `.agent/evidence/browser-migration-proof.json`, `wasm-migration-proof.json`, `validation.json`, and the evidence index.
- Result: all seven routes and both endings pass using real browser input. Save restoration, controls, resize, host recovery and repeated readiness pass. The actual WASM replay and budget recovery pass. Three.js is absent from runtime dependencies and the generated build.
- Status: passed locally; source delivery revision is recorded in the latest change-log entry after push.

## ATC-006 — Bundle size remains above Vite's warning threshold

- Baseline: 1,800.52 kB minified JavaScript / 409.85 kB gzip.
- Current: about 1,439.04 kB / 296.75 kB gzip, plus 147,783-byte WASM and 16,557-byte glue module. These are artifact sizes, not a measured network-transfer or startup improvement.
- Status: measured; chunk-size warning remains a production optimization item.

## ATC-007 — Dependency audit findings

- Targeted Vite update to 6.4.5 and the locked dependency changes resolve the original findings. Clean install and final npm audit report zero vulnerabilities.
- Status: resolved for the tested lockfile; npm audit is not a complete security audit of first-party renderer code.

## ATC-008 — CPU rendering and presentation performance

- Host: Apple M2 MacBook Air / 8 GB, Chrome 155 and Node 25.8.1. World 320×180; HUD/presentation 640×360; all 2,300 trees retained.
- The recorded browser run presented roughly 4–13 FPS. Earlier 17–20 FPS labels used raw render duration and overstated actual presentation. The counter now includes scheduling intervals.
- Final WASM capture: 53.6 ms median, 59.7 ms p95 rendering/composition after 20 warm-up frames. Sampled peak Node RSS about 495 MiB, process high-water about 499 MiB. These include the game/engine process, not just NexusGL.
- Skipping the unused Sequence Node driver reduced an isolated tick from about 3.0–3.3 ms to about 0.2 ms; it does not establish a corresponding browser FPS increase.
- Status: measured limitation; production-performance qualification remains open.

## ATC-009 — Visual and interaction limits

- Fog, additive glow, per-point colors and hardware instancing are not reproduced. Shadow casting is disabled. Triangles replace point foliage; the world has a lower resolution than the former GPU renderer.
- The picker follows the baseline policy of intersecting interactive geometry, not a complete noninteractive-occlusion policy. Existing primitive inspection framing remains greybox behavior.
- Status: documented limitations, not final-art or full visual-parity acceptance. See `docs/NEXUSGL_RENDERING.md`.

## ATC-010 — Browser input proof

- Earlier mouse-dispatch timeouts are resolved. Real mouse/keyboard events pass the story, seven routes, two endings, cancellation, FOV, look, pause and resize checks.
- Status: resolved; screenshots and the structured browser report are retained.

## ATC-011 — Disk capacity and root snapshot

- Earlier `npm ci` failed with ENOSPC. The subsequent clean install, tests, audit and build pass. The root snapshot is regenerated and its files match `source/dist`.
- Status: resolved. Source remains the editable authority.

## ATC-012 — Stale input replay after save restoration

- Browser alternate-ending validation exposed historical Interaction activations replaying after Story reset its processed IDs.
- The game runtime now resets existing Interaction/Input services when restoring portable story state. Session restoration clears local movement/navigation/focus and reconciles derived NPC placement. No parallel input registry was added.
- A regression test and same-session browser station restore verify that old actions do not change the new choice or start stale navigation.
- Status: resolved.

## ATC-013 — Placeholder geometry and proof-driver corrections

- Fixed incomplete box faces, duplicate route transforms, overlarge spherical pick proxies, double application of HUD alpha and unreadable low-resolution HUD text.
- Lowered only the market visual deck by 0.3, raised the existing submit plate above the deck, and placed visible entrance markers away from player origins. IDs, story rules, route paths and location count remain unchanged.
- The proof driver avoids tiny drags that were interpreted as clicks and walks around the console to see the recover-cell choice. Optional routes target the visible marker tip above rails.
- Status: resolved; regression checks plus actual views and interactions pass.

## ATC-014 — Remaining platform/product qualification

- Mobile, Quest/XR, native hosting, full accessibility, final art/audio, universal physical-device behavior and production frame-time targets remain unverified.
- Navigation/reload behavior passed; this does not prove every browser cache policy or whole-process leak freedom. Save/load proof uses the existing public application command API, not a new player-facing save menu.
- Status: outside the functional renderer migration's proven scope; do not label Phase 1 production complete.

## ATC-015 — Continuous movement cost

- A real 60-second W/S and orbit soak exposed receipt-ledger growth and per-tick snapshot copies. An intermediate run fell below 1 FPS even though rasterization remained fast.
- Fixed by using the existing exported locomotion solver and owner updates once per engine tick. Explicit durable commands retain their receipts. Full snapshots remain available outside hot paths.
- The 3,600-tick regression preserves a real command receipt; the browser movement benchmark records state bytes and receipt count. Keep cold admissions and sustained timings separate.
- Status: repaired; see current performance evidence, with historical failure retained.

## ATC-016 — Third-person camera obstruction

- The follow camera uses supported authored solid bounds and route-cable capsules; it is not arbitrary mesh physics.
- Cable intersection and an avatar filling the view after boom retraction were found in actual captures. The camera retracts before cable entry, and the avatar hides at close camera distance.
- Status: focused greybox repair; broader asset collision and production camera tuning remain future work.

## ATC-017 — 1440p output cost

- User selected 2560×1440 output with a lower-resolution world. World raster remains 320×180; HUD uses output resolution.
- Full-resolution CPU compositing/copying was too expensive. Canvas now stages and scales completed NexusGL pixels and overlays cached HUD pixels; an owned full-resolution RGBA capture is composed on demand.
- Do not call this native 1440p geometry, locked 60 FPS, final art or AAA qualification. Current distributions and Canvas/capture comparisons belong in the continuation evidence.

## ATC-018 — Remaining frame-time variability

- Current final-build stationary sample: 20.1 FPS / p95 111.0 ms. Moving/orbit sample: 11.0 FPS / p95 249.7 ms, max 1254.1 ms. Earlier optimized runs were faster. Retain both results; do not select only the favorable average.
- Continuous movement state is bounded, with no per-sample receipt accumulation. That repair is demonstrated independently from frame-time consistency.
- Host activity was not controlled; `host-load.json` is an observation, not proof of causation. The 30 FPS target is not consistent.
- Status: OPEN for controlled per-phase profiling and remaining long frames. Functional implementation and 1440p output are delivered; general smoothness/AAA qualification is not complete.
