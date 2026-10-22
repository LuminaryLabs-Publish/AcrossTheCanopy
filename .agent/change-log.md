# Maintainer change log

## 2026-10-22 — Migration verified; delivery pending

- Final local gates: clean install, zero npm audit findings, 29 checks, production build and generated root snapshot. Build rejects Three.js modules; package and lock contain no Three.js dependency. Only WASM, glue and integrity manifest ship as runtime artifacts.
- Fresh root-browser proof covers all seven routes and both endings, including loading the station save in the same runtime. Controls, resize, optional glides, navigation, visible failed WASM startup, recovery and five successful reload cycles pass with zero application errors recorded. Development-server boot and an actual browser reset also pass.
- Fixed stale Interaction/Input activations replaying after load. The existing DSK services reset their own state; local movement, pending navigation, focus and derived Sela placement are reconciled. Story rules and save schema are unchanged.
- Fixed opaque deck/submit-target visibility and route entrance markers, including a regression for the start ring. The proof driver's tiny drags and occluded choice stance were corrected rather than bypassing real input.
- The app has no mounted Sequence Nodes; skipping their unused automatic frame driver measured about 0.2 ms isolated ticks versus 3.0–3.3 ms. Ordinary runtime scheduling and Story Kit coordination remain enabled.
- Final real WASM replay: 300 simulated seconds in about 32.8 wall seconds; signal ending completes. After 20 warm-up frames: rendering/composition p50 53.6 ms, p95 59.7 ms. Sampled peak RSS about 495 MiB; process high-water about 499 MiB. Real renderer-budget failure retains pixels and recovers; disposal releases resources.
- Browser presentation was roughly 4–13 FPS, not the earlier raw-render-based estimate. CPU/world resolution, atmosphere/shadow differences and unverified platforms remain explicit production limits.
- Evidence is indexed in `.agent/evidence/README.md`. Source/build digest and exact checks are in `validation.json`.
- GitHub repository Actions are disabled (`enabled:false`); Pages workflow 347958793 remains manually disabled. No workflow/deployment was run. Next: race-check main, commit/push, verify remote bytes and record the delivered source SHA.

## 2026-10-22 — Continuation: clean build and real browser acceptance

- Disk capacity recovered to 2.8 GiB; fresh `npm ci`, audit (zero vulnerabilities), 26 tests and production build pass.
- Corrected missing second triangles on box faces and removed the duplicate transform on world-space routes. Picking now intersects the same geometry and transforms as rendering, avoiding oversized platform proxies intercepting clues.
- Moved existing bitmap HUD composition to the application provider at 640×360 while NexusGL renders the world at 320×180. Correctly composites the bitmap's premultiplied alpha and returns owned completed frames for both browser and capture.
- Added explicit render error state, retention of the last completed frame after failure, safe dimension checks, and reset/disposal checks. Removed unused Three texture helpers.
- Real production-browser input now passes start, walking, spindle, Sela, branch/trunk routes, crew clue and Rows lantern; market/lock/station/endings are the next acceptance stages. The earlier mouse-input blocker is resolved.
- Reviewed Drive production plan, development plan and tracker read-only on 2026-10-22. Six production scene packages map across five repository locations; lock and return are existing areas/states, not new locations. Broader 60-minute/final-art milestones remain outside this renderer migration.
- Host: Apple M2 MacBook Air, 8 GB RAM, macOS arm64, Chrome 155. Workflows remain disabled. No commit or push yet.

## 2026-10-22 — NexusGL browser frame and adapter

- Deterministic 300-second NexusGL WASM replay completed: `answer_signal`, 86 dispatched actions, 160×90 RGBA frame, final provider frame 301 presented. The last replay frame measured 68.3 ms (17 FPS); this is a capture run and differs from the 320×180 browser measurement below.
- Targeted dependency remediation updated Vite to `6.4.5`; `npm audit --audit-level=high` returned zero vulnerabilities.
- Final `npm ci` then failed with `ENOSPC` while unpacking NexusEngine, with 44 MB free. The partial install caused integration tests and Vite build to fail. Earlier passing tests and replay remain evidence, but final clean-install/build acceptance is blocked.
- `source/dist` and the committed root hashed snapshot were stale; the root bundle contains `web-three-scene`. Removed the stale ignored `source/dist` output; regenerate it and the root snapshot only after a successful build.

- Updated the source pin and semantic camera/Render Batch imports to NexusEngine `5a4da3eba6ac95d2d8c74a008bb12caff0d6b0e8`; installed the Graphics Language Kit in the runtime.
- Added a product-local NexusGL provider and stable-ID picker. Removed Three.js dependency, provider, picker and Three imports from the capture adapter. The 300-second capture adapter now requests NexusGL completed RGBA frames.
- Added dev and production WASM artifact serving/copying through Vite, plus focused tests for 2,300 forest placements, geometry/material/UI translation, alpha blending and picking.
- Browser evidence: Starter Perch rendered via NexusGL WASM at 320×180; screenshot stored at `.agent/evidence/nexusgl-starter-perch.png`. Visual review confirmed UI alignment after correcting texture orientation and plane size.
- Performance: before distant-forest triangle simplification, 320×180 frames were about 343 ms. With one triangle per distant tree and the same 2,300 placements, local frames measured 46–59 ms (17–20 FPS). Browser software rendering remains a performance limitation.
- Browser input: keyboard pause and FOV changed the game snapshot. Browser automation mouse events timed out; actual click targeting and full pointer-driven route remain unverified. Deterministic picker tests pass.
- Final five-minute replay completed; see the evidence above.
- The targeted package lock is audit-clean; the final clean-install check remains blocked by disk capacity.
- GitHub Actions were disabled before edits; recheck workflow state and active runs before any push. No commit or push yet.

## 2026-10-22 — NexusGL migration started

- Goal: replace Across the Canopy's Three.js renderer with NexusGL, preserving the existing game and limiting all changes to this repository.
- Checkout: `main @ 669517d2a86fbd4dabbea13bfe7aee8561b6cc17`; clean after clone. `origin` is `LuminaryLabs-Publish/AcrossTheCanopy`.
- Workflow safety: inspected all Actions workflows; disabled `Deploy GitHub Pages` ID `347958793` using the repository workflow setting. Live API readback returned `disabled_manually`.
- Baseline at prior source pin `8a60167fc945109408851c586a9355b1147438d5`: `cd source && npm ci && npm run validate` passed 21/21 tests and Vite build. JS output 1,800.52 kB (409.85 kB gzip); Vite warns above 500 kB. npm reported two high severity dependency findings.
- Baseline visual: Vite development server and browser booted at `http://127.0.0.1:4173/`; no application errors observed (one favicon 404). Screenshot capture through Playwright was requested but stored outside the authorized repository, so no capture is retained in this checkout. Baseline frame-time, memory and gameplay input evidence remain pending.
- Migration change: pinned `source` dependency to NexusEngine `5a4da3eba6ac95d2d8c74a008bb12caff0d6b0e8`, the inspected revision that exports the Graphics Language Kit; moved camera import to `nexusengine/domains/camera`; replaced retired Presentation Graphics import with Render Batch kit; installed Graphics Language Kit into game runtime.
- Current validation: focused `test/nexus-runtime.test.js` passes after updating expected pin and verifying Graphics Language domain path. Full suite had one stale kit-count assertion (46 current kits versus old expected 32); that assertion is now updated. Full suite rerun pending.
- Status: migration in progress. No commit or push yet.
- Next: free disk space, rerun clean install and full validation, regenerate/review the root snapshot, retry browser pointer input, then recheck workflow state and push only after these gates pass.

## 2026-09-29 — Upkeep documentation foundation

- Upkeep ID: `MNT-367`
- Repository: `LuminaryLabs-Publish/AcrossTheCanopy`
- Baseline: `main @ c5f610e69fd77466368b10b5366a63d8fa8eb241`
- Package: `across-the-canopy@0.1.0-greybox.0`
- Added: `AGENTS.md` and standardized eight-file `.agent/` continuity package.
- Preserved: gameplay source, tests, capture adapter, build workflow, greybox specification, root build snapshot.
- Reconciled: README source/deployment wording and Nexus composition ledger pre-implementation status framing.
- Source/gameplay behavior changed: no.
- Deferred evidence findings are recorded in `.agent/feedback.md`.
- Final pushed commit: record exact SHA in Upkeep after live Audit 3.
