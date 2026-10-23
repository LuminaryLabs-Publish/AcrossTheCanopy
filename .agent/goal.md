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

The existing adventure uses NexusGL WASM through NexusEngine's Graphics Language Kit at `5a4da3eba6ac95d2d8c74a008bb12caff0d6b0e8`. Story rules, stable IDs, five locations, seven routes, saves and no-ground world remain game-owned. Changes are confined to this repository and its Actions settings.

Local acceptance: clean install and audit pass; 29 checks and the production build pass. Real browser input covers the full authored route, both endings, both optional glides, pause, journal cancellation, FOV, mouse look and resize. Same-session station restoration, failed WASM startup, recovery, navigation and five successful reload cycles pass. The real WASM 300-second replay, owned-frame capture, budget rejection/recovery and disposal pass. The root snapshot is regenerated from source and inspected.

Evidence: `.agent/evidence/README.md`, `browser-migration-proof.json`, `wasm-migration-proof.json` and `validation.json`.

Limits remain explicit: the world renders at 320×180 and HUD/presentation at 640×360. Actual browser presentation measured roughly 4–13 FPS during the recorded run. Fog, additive glow and shadow casting are not reproduced; final art, production performance, mobile/Quest, native hosting and full accessibility qualification are not completed by this migration.

GitHub Actions are disabled at repository level, and `Deploy GitHub Pages` remains manually disabled. Implementation commit `a502c0f7f9105483de6f9459da5b40ead3b7b717` is pushed and verified against all 83 remote tracked blob hashes. No new workflow or deployment ran. See `.agent/evidence/delivery.json`. Next work, if authorized: improve measured browser performance and remaining visual differences; do not treat this migration as production qualification.

## Active milestone — smooth movement and forest rendering

User authorized performance work in AcrossTheCanopy and NexusGL, procedural-forest improvements and third-person movement. Preserve story, stable IDs, route safety, saves and optional first-person/capture behavior. NexusEngine stays unchanged. Preserve pre-existing NexusGL audit work.

Sequence: profile baseline; remove discarded snapshots; bound forest submission by cells/LOD; move CPU rendering to a worker; add a collision-aware following camera and visible moving avatar; verify real browser movement, story, resize and recovery; regenerate root output, record measured results and push main with Actions disabled. Target at least 30 presented FPS under recorded desktop conditions; report actual distributions and any unmet limits. AAA is a quality direction, not a certification.

Resolution acceptance: actual browser output is 2560×1440; NexusGL world raster remains 320×180 and is upscaled by Canvas, as selected by the user. HUD rendering uses the output resolution. Full-resolution captures are available on demand.

Implementation checkpoint: local tests/build and the 1440p browser route pass. Deliver these verified changes to main, then finish timing readback. Performance is improved, but frame-time consistency and broad production qualification remain open; report every workload and residual spike.
