# Goal

Across the Canopy should prove one complete authored story route with third-person and optional first-person viewing inside a much larger procedural canopy while using NexusEngine for reusable runtime/domain responsibilities and keeping product-specific narrative logic owned by the game.

## Success conditions

- authored route remains readable inside the procedural forest
- no conventional visible ground appears
- procedural generation never decides or obstructs authored story placement
- stable object IDs survive replacement of greybox primitives with final assets
- click-to-move and keyboard traversal update the same player/world authority
- unsafe/invalid traversal recovers rather than creating irreversible failure
- story/puzzle/choice/save behavior remains deterministic
- both final choices complete with distinct consequences
- NexusEngine ownership and product-owned extensions stay explicit
- rendering provider can be validated/replaced without changing authoritative game state
- the five-minute replay remains deterministic and bounded
- build/test/deploy/capture evidence stays distinct from final art and human experience approval

## Current milestone boundary

This repository documents and implements the greybox vertical slice. Final assets, audio, broad production content, and subjective AAA-quality acceptance are outside the current proven scope.

## Historical milestone — NexusGL renderer migration

Status: functional greybox migration delivered to `main`; production qualification remains open.

The existing adventure uses NexusGL WASM through NexusEngine's Graphics Language Kit from the latest `main` branch (`081fea1cdd9ca1662bc15116e7174d9c27821630` at this verification). Story rules, stable IDs, five locations, seven routes, saves and no-ground world remain game-owned. Changes are confined to this repository and its Actions settings.

Local acceptance: clean install and audit pass; 29 checks and the production build pass. Real browser input covers the full authored route, both endings, both optional glides, pause, journal cancellation, FOV, mouse look and resize. Same-session station restoration, failed WASM startup, recovery, navigation and five successful reload cycles pass. The real WASM 300-second replay, owned-frame capture, budget rejection/recovery and disposal pass. The root snapshot is regenerated from source and inspected.

Evidence: `.agent/evidence/README.md`, `browser-migration-proof.json`, `wasm-migration-proof.json` and `validation.json`.

Limits remain explicit: the world renders at 320×180 and HUD/presentation at 640×360. Actual browser presentation measured roughly 4–13 FPS during the recorded run. Fog, additive glow and shadow casting are not reproduced; final art, production performance, mobile/Quest, native hosting and full accessibility qualification are not completed by this migration.

GitHub Actions are disabled at repository level, and `Deploy GitHub Pages` remains manually disabled. Implementation commit `a502c0f7f9105483de6f9459da5b40ead3b7b717` is pushed and verified against all 83 remote tracked blob hashes. No new workflow or deployment ran. See `.agent/evidence/delivery.json`. Next work, if authorized: improve measured browser performance and remaining visual differences; do not treat this migration as production qualification.

## Active milestone — smooth movement and forest rendering

User authorized performance work in AcrossTheCanopy and NexusGL, procedural-forest improvements and third-person movement. Preserve story, stable IDs, route safety, saves and optional first-person/capture behavior. Do not edit NexusEngine as part of this game task; ground integration decisions in its latest `main` and refresh the dependency first. Preserve pre-existing NexusGL audit work.

Sequence: profile baseline; remove discarded snapshots; bound forest submission by cells/LOD; move CPU rendering to a worker; add a collision-aware following camera and visible moving avatar; verify real browser movement, story, resize and recovery; regenerate root output, record measured results and push main with Actions disabled. Target at least 30 presented FPS under recorded desktop conditions; report actual distributions and any unmet limits. AAA is a quality direction, not a certification.

Resolution acceptance: actual browser output is 2560×1440; NexusGL world raster remains 320×180 and is upscaled by Canvas, as selected by the user. HUD rendering uses the output resolution. Full-resolution captures are available on demand.

Implementation checkpoint: local tests/build and the 1440p browser route pass. Deliver these verified changes to main, then finish timing readback. Performance is improved, but frame-time consistency and broad production qualification remain open; report every workload and residual spike.

## Delivered implementation and remaining performance gate

Implementation commit `c7be124d1364f83ca1351a212aef0feb7f2fa567` is pushed to main and matched all 138 remote tracked blob hashes. The final build passes 34 tests, both endings, seven routes and the browser host checks. Actual output and owned capture are 2560×1440; Canvas/capture comparison has zero differing channels.

Current final-build 60-second stationary sample: 20.1 presented FPS, p95 111.0 ms. Current 60-second movement/orbit sample: 11.0 FPS, p95 249.7 ms, maximum 1254.1 ms. Movement state remains 2723 bytes with zero sampled operation receipts. Earlier optimized samples were faster; all results remain in evidence.

NexusEngine is tracked by the `main` branch in `source/package.json`; refresh from upstream main before every validation or implementation pass. The lockfile records the resolved commit for the installed tree.

The 30 FPS target is not consistently met across recorded workloads. Do not mark performance universally smooth, production ready or AAA. Host load was uncontrolled; its observation is recorded without claiming it explains every spike. The next focused performance task is to isolate long worker frames from 1440p presentation under repeatable host conditions. Repository Actions remain disabled and no deployment ran.
