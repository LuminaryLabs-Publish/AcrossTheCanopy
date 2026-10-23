# Performance and third-person movement

The default play camera is third person. `WASD` moves Ryn within the existing authored walkability; drag to orbit/look and press `V` to switch to the preserved first-person view. The fixed-step simulation, seven traversal routes, story, saves and both endings retain their existing owners. Capture playback remains first person.

## Changes

- Presentation updates can request a small receipt instead of copying the entire forest batch snapshot. Explicit snapshot callers still receive the full snapshot.
- Continuous movement uses Nexus's exported `advanceActionLocomotion` solver, then writes approved results through Action Locomotion and Object Placement's public APIs. Each engine tick can integrate only one matching sample. Durable `step()` commands keep their existing receipt/idempotency behavior. The old per-tick command path accumulated thousands of receipts, and repeated snapshot synchronization copied that history. A 3,600-tick check proves bounded sampled state and preservation of an explicit command receipt. Input release now settles through the existing drag model instead of resetting velocity every tick.
- The browser installs a worker-backed NexusGL selection through the existing Graphics Language Kit. The kit still owns installation, portable resource identities and lifecycle; the worker owns one execution provider. Only completed owned RGBA frames cross back to the presentation host. Worker messages have operation IDs, bounded timeouts and explicit errors; disposal terminates the worker.
- `cached-execution-provider.js` is a narrowly maintained specialization of the NexusEngine execution provider from the current `main` dependency. It caches one transformed vertex stream per live immutable geometry declaration, skips unchanged view/light/background uploads, and records phase times. Resource replacement naturally invalidates the weak cache. Shared normalization, validation, material translation, resource limits and lifecycle remain in use. A pixel parity check compares it with the original provider across repeated frames, transforms, changed resources and changed view/light/background values. NexusEngine itself is unchanged.
- All 2,300 tree identities remain in deterministic generated data. Generation now creates seeded stands, broadleaf/spire variation and a guaranteed authored exclusion even if rejection sampling exhausts its retries. It never places story content.
- Forest geometry is cached in 96-unit cells. Nearby cells combine individual silhouettes with sparse detailed trunks/crowns; distant groups of up to eight trees use two-triangle canopy silhouettes. This is deliberate LOD, not a claim that every tree remains a detailed rendered mesh. Conservative cell bounds, frustum rejection and nearer-first ordering limit submitted work. Optional detail is cached only when used; retained capacity is bounded by this finite forest.
- Authored geometry receives conservative view rejection, and small rings/route tubes use appropriate segment counts for the existing software-rendered image. Rail openings keep the route and avatar visible. Raised entrance markers stay above market controls.
- The avatar has a coat, backpack, head and swinging limbs driven by actual movement. Heading uses shortest-angle rotation; diagonal input is normalized. The follow camera eases outward and retracts against supported authored solid boxes and swept route-cable capsules. This is a bounded authored-space camera, not general physics or arbitrary-mesh collision. When an obstruction retracts the camera close to Ryn, the avatar hides rather than filling the view with the back of its head. Camera selection does not teleport the player. Reset/load clear follow history and stale input, and losing window focus releases movement.
- Picking uses the same completed packet that produced the visible pixels. A newer queued camera cannot redirect a click on an older displayed image. The third-person focus prompt stays below the avatar's head.

## Reproduce

```sh
cd source
npm ci
npm run validate
npm run verify:wasm
npm run snapshot
```

Serve the repository root locally. With a caller-provided Playwright module and installed Chrome:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  node scripts/run-browser-checks.mjs http://127.0.0.1:4188/
```

`scripts/benchmark-browser.mjs` reconstructs the prior committed snapshot inside ignored `evidence/performance-baseline/` and compares three 30-second workloads after five seconds of warm-up. It timestamps actual final-canvas `putImageData`/`drawImage` completions for the world canvas, independently of the FPS label. This measures completed browser image submission, not physical display refresh. The baseline output is 640×360 and the new output is 2560×1440; both world rasters are 320×180, with different forest LOD. Read those workload differences alongside the timings.

`scripts/benchmark-motion.mjs` restores the observed station save, then measures 12 seconds of cold camera turns and 60 seconds of real W/S plus orbit input. Keep these movement results separate from stationary measurements. The pre-fix stress result is retained as evidence of the receipt-growth failure.

The browser check writes under `.agent/evidence/performance-third-person/`. It uses real mouse/keyboard input for the adventure and public save/load for restoration. It waits for fixed-step processing after clicks, then checks the resulting scene/mode rather than accepting a focus revision as the gameplay action. A separate 60-second presentation sample reads lightweight diagnostics. Full snapshots are intentionally excluded from the per-frame sampler because they copy state.

## Scope and limits

Browser output and bitmap HUD are 2560×1440. NexusGL rasterizes the world at 320×180, which Canvas upscales with nearest-neighbor sampling. This is 1440p output, not native 1440p geometry rendering. The game stages the complete world-plus-HUD image before presentation; it retains the completed world and UI for an owned full-resolution RGBA capture on demand. Cached HUD pixels are converted from premultiplied to straight alpha before Canvas upload. The nonbrowser capture path still composes its selected output on the CPU. Browser resize preserves the fixed 1440p backing surface and fits it within the viewport. The CPU renderer is still NexusGL WASM; Canvas presents pixels. No GPU backend, third-party renderer, final art, audio, broad physics, mobile/Quest qualification or AAA certification is introduced. Fog, glow and shadow casting remain earlier visual gaps. The application retains the pinned engine/runtime artifacts and adds no runtime package dependency. Worker delivery increases total script bytes; startup and sustained frame times must be reported separately.

Only AcrossTheCanopy source needed changing in this pass. Pre-existing NexusGL audit edits were preserved. GitHub Actions remain disabled; source pushes do not deploy the site. Current observed results, screenshots and remaining limits are indexed in `.agent/evidence/performance-third-person/README.md`.
