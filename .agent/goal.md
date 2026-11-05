# Goal

## Active requests — 2026-11-05

Build toward the full third-person Across the Canopy game described in the
Drive [development plan](https://docs.google.com/document/d/1wZ7xYkWhCGRQU6dVlnl5lFD7PBiuX7HwcXnEc0uvw10/edit),
[world master](https://docs.google.com/document/d/1pi4fk9zkCX_nK4uNyxgWkgSiX_1GwYS211B4sx7qvAY/edit), and
[generation rules](https://docs.google.com/document/d/1AK1u2FFCgpIWvjbNCH8b955jW8TmOgJdocvunFtL7s4/edit).
This is the tracker for the Across the Canopy requests in the current chat;
it does not claim to inventory every company conversation.

| Priority | Outcome | Current status |
| --- | --- | --- |
| 1 | Restore the required latest-main NexusEngine integration and validate the game. | **BLOCKED:** latest Engine `c674a53e054640f5acc035180a2f3fe1d7d4fe03` throws a duplicate Authoring public-subpath error at startup. See `.agent/feedback.md` ATC-019. Engine changes are outside this task's scope. |
| 2 | Make player-visible trees read as giant, structurally convincing trees and connect reviewed model assets to the game. | **OPEN:** a giant-tree GLB exists and was reviewed separately; it is not connected to gameplay, and its traversal/collision behavior is not proven. |
| 3 | Create an expansive, layered canopy consistent with the Drive's volumetric world and no-visible-ground rules. | **OPEN:** the current 2,300-tree backdrop is a procedural greybox, not the full world. Preserve authored routes and stable IDs. |
| 4 | Raise actual game graphics to 1024 or higher. | **OPEN:** the current world framebuffer is 320×180, enlarged for presentation. At least 1024 pixels of real rendered width is the initial interpretation; confirm height/texture targets during visual acceptance. Measure performance rather than treating output upscaling as higher-resolution geometry. |
| 5 | Add many meaningful interactions across the world. | **OPEN:** existing dialogue, story, routes and puzzle are a starting slice. The Drive plan also calls for things such as pickup, inventory, trade, rest, repair and environmental actions; each needs playable state and evidence. |
| 6 | Preserve third-person play while building toward the full AAA title. | **IN PROGRESS:** third-person is the existing default; final art, interactions, performance, content and human acceptance remain open. |
| 7 | Clean up, validate and push the completed Across the Canopy work to actual default `main`. | **OPEN:** preserve unrelated files, keep Actions/Pages disabled, and distinguish source/build/browser proof from final game acceptance. |

Current work is limited to this repository. No changes to Google Drive or other
repositories are authorized in this pass. The scope of the full game is larger
than the present greybox; do not mark the full goal complete from a single
asset, a passing test suite or a pushed checkpoint.

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

The playable story route remains a greybox vertical slice. Separate asset authoring is now authorized, beginning with the giant world tree. This first authored hero asset does not by itself qualify the runtime, final art set, audio, broad production content, or AAA-quality acceptance.

## Active asset milestone — giant tree

The first tree revision is saved as a Nexus Engine Kit Project and exported as a content-addressed GLB. It has a wind-curved, tapering trunk with a pointed crown, longer horizontal branch tiers, and two-sided leaf cards attached to finer branchlets. The source assembly contains 16 primary limbs, 32 secondary limbs, and 48 foliage placements. Kit validation and asset readiness passed; a six-view visual review is retained. The GLB is an authored asset artifact and is not yet wired into the game runtime or traversal colliders.

Evidence and exact artifact details are indexed in `.agent/evidence/README.md` and `.agent/change-log.md`.

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
