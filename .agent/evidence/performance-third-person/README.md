# Performance, procedural forest and third-person evidence

## Scope

AcrossTheCanopy only. NexusEngine remains pinned to `5a4da3eba6ac95d2d8c74a008bb12caff0d6b0e8`; no NexusGL source changes were needed. Pre-existing NexusGL audit work was preserved. No new runtime dependencies or GitHub workflows were added.

The selected browser output is **2560×1440**, with **320×180 NexusGL world pixels upscaled** and a bitmap HUD rendered at output resolution. This is not native 1440p geometry. Canvas stages/presents completed pixels; NexusGL still draws the world.

## Current proof

- `validation.json`: final source/build digests, test and build gate, root/dist comparison and dependency boundary.
- `acceptance.json`: real browser route, both endings, all seven traversal routes, save restoration, third-person movement/view toggle, pause/journal/FOV/look/resize, boot failure/recovery, navigation and five readiness/reload cycles. Each successful stage records `passed:true`; `storyCompleted` describes narrative state, not whether the check passed.
- `browser-migration-proof.json`: detailed route and restoration observations, including the portable station save used by the motion benchmark.
- `motion.json`: actual alternating W/S and drag-orbit input; 12-second cold turns and 60-second warm movement; bounded movement state, resources and WASM heap. Includes resolution and Canvas/capture pixel comparison.
- `comparison.json`: independent final-canvas image-submission timestamps for the old committed first-person build and the optimized first-/third-person views. Five-second warm-up, 30-second measurement per workload. Baseline output is 640×360; new output is 2560×1440. World rasters are both 320×180, with intentional forest LOD changes. This measures browser image submission, not physical display refresh.
- `wasm-proof.json`: real 300-second semantic replay, selected 640×360 capture output, independent pixel ownership, real renderer-budget rejection/recovery and disposal. Whole Node-process RSS is not renderer allocation. One earlier invocation timed out during startup; a repeat and final invocation passed. Do not erase that retry history or infer universal startup timing from the pass.
- `delivery.json`: exact implementation commit, remote/tree readback and disabled-workflow/deployment observations, written after source delivery.

Hardware: Apple M2, 8 GiB RAM, macOS 14.5, installed Chrome 155, Node 25.8.1. These are local desktop observations. Concurrent system activity was present and not controlled; compare distributions, not a universal FPS promise. The compiler build retains its large-JavaScript-chunk warning. No Quest/mobile/native/device acceptance is claimed.

## Visuals

- `output-1440p.png`: actual 2560×1440 canvas bitmap, not a CSS-only resize.
- `final-spawn.png`, `third-person-walking.png`, `moving-camera.png`: default framing, real movement and moving-camera workload.
- `nexusgl-*.png`: route views, both endings, optional glides, look/resize and failure/recovery. Browser viewport screenshots are separate from the 1440p backing bitmap.

Reviewed for readable routes and HUD, visible avatar/stride, distinct primitive colors, no camera entry into route cables, and a hidden avatar when a close obstruction retracts the boom. The scene remains greybox: block avatar, canopy silhouettes and authored primitive assets. Fog, additive glow and shadows remain absent. Some frame spikes and cold resource admission remain; this is not locked 60 FPS or AAA qualification.

## Historical and diagnostic artifacts

`*-640p-output.json` retain earlier output measurements. `motion-before-continuous-fix.json` records the intermediate sub-1-FPS receipt-growth failure. `motion-before-close-camera-hide.json` predates the final close-camera visibility fix. `intermediate-1440p-dev-contended.json`, `baseline-wasm.json`, `baseline.cpuprofile`, `before.png`, `spawn.png`, `latest.png`, `failure.png` and `third-person-pass*.png` are intermediate investigations, not final acceptance captures. Keep their provenance separate from current proof. Logs remain local ignored files.

## Reproduce

See `docs/PERFORMANCE_AND_THIRD_PERSON.md`. Use the existing `source` test/build commands, caller-provided Playwright and installed Chrome. Run timing workloads sequentially. No workflow or deployment is required or authorized.

## Final observed timings

| Workload | Presented FPS | p95 interval ms | Maximum ms |
|---|---:|---:|---:|
| baseline-first-person | 10.9 | 110.8 | 175.5 |
| optimized-first-person | 25.3 | 97.4 | 200.9 |
| optimized-third-person | 26.6 | 88.7 | 196.5 |
| 60-second stationary route-check follow-up | 20.1 | 111.0 | 809.0 |
| 60-second movement and orbit | 11.0 | 249.7 | 1254.1 |

The 30 FPS target is not consistent across these workloads. The implementation fixes are delivered; **full smoothness remains open**. The final-build JS entry is `assets/index-188Q1F72.js`. Both the comparison and motion reports identify it. Canvas/capture comparison had zero differing channels. Sampled movement state ended at 2723 bytes with no per-sample receipts; WASM heap stayed at 24,248,320 bytes at the recorded endpoints. These do not account for every browser allocation or prove unlimited-session leak freedom.

`host-load.json` records uncontrolled host load after the motion run. It is not proof of causation. The earlier comparison/motion before close-camera and text-fit polish are retained by the implementation commit; `*-640p-output.json` and `motion-before-close-camera-hide.json` are explicitly historical.
