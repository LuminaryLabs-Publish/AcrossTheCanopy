# Repository profile

## Identity

- Owner: `LuminaryLabs-Publish`
- Repository: `AcrossTheCanopy`
- Visibility: public
- Default branch: `main`
- Audit baseline: `c5f610e69fd77466368b10b5366a63d8fa8eb241`
- Package: `across-the-canopy@0.1.0-greybox.0`
- Title/slice: `The Upward Signal`

## Source and deployment

The editable application is under `source/`. `source/package.json` defines `dev`, `build`, `preview`, `test`, and `validate`. The root contains a committed built snapshot, but `.github/workflows/deploy.yml` installs from `source/`, runs tests, builds with Pages base `/AcrossTheCanopy/`, uploads `source/dist`, and deploys that artifact.

## World/content constants

Current source defines:
- save schema `atc.greybox.v1`
- NexusEngine source: latest `main`; current verified revision `081fea1cdd9ca1662bc15116e7174d9c27821630`
- forest seed `41731`
- default tree count `2300`
- five authored locations
- seven authored traversal routes
- eight primitive color roles
- four checkpoints including slice completion

Five locations:
1. Starter Perch
2. Branch & Trunk Route
3. Hanging Rows
4. Low Market
5. Old Descent Station

Seven routes:
- starter branch
- trunk switchback
- high glide
- rows-market bridge
- rows-market glide
- descent line
- station return

## Gameplay/state

The story model owns dialogue, clue progression, journal, puzzle, final choice, consequence and completion state. Tests prove both final choices, recoverable wrong-puzzle behavior, save/hydrate, cancellation across interaction modes, and pause/resume behavior.
The current completion path returns to Hanging Rows, completes Sela's response, and records branch-specific consequence state.

## Nexus composition

`source/src/game/nexus-runtime.js` imports and composes NexusEngine runtime, persistence, host, spatial, world/generation/navigation, object, interaction/input/affordance, simulation/motion/locomotion, presentation, and render contracts, then installs the product-owned AcrossTheCanopy story Kit.
The runtime test asserts the pinned commit, 46 installed Kit IDs including Graphics Language, 2,300 trees, 31 placements, valid render-provider contract, generated navmesh, story dispatch, FOV behavior, save/reset/load.

## Rendering

Presentation descriptors are projected into immutable packets consumed by a provider. Tests verify FOV clamping, semantic UI descriptors, all 2,300 tree instances, authored transforms, immutable packet shape, provider validation, snapshot restore, and provider replacement with the mock provider.

## Persistence

The storage adapter supports browser storage and an in-memory test mode. Storage tests prove save/load/remove, structured-clone behavior, and prefix isolation. Story save payloads use versioned schema and clear transient modes during hydrate.

## Capture

`scripts/gameplay-video-adapter.mjs` uses the actual Nexus runtime, game session, story Kit, presentation projection and NexusGL WASM provider. `CAPTURE_BEATS` contains ten exact 30-second beats from 0 through 300 seconds.
The capture review explicitly identifies browser DOM input as outside the framebuffer capture and intentional stubs as silent audio plus colored greybox art.

## Validation commands

```bash
cd source
npm test
npm run build
npm run validate
```

`validate` = 34 checks plus build. `verify:wasm` runs the actual replay/budget-recovery proof; `snapshot` validates and refreshes root output. Repository Actions are disabled; no Pages CI or deployment should run for this migration.

## Performance and default camera

Third-person is default; V preserves optional first-person. The browser executes NexusGL in a module worker selected through the existing Graphics Language Kit. A game-local pinned execution specialization caches transforms and unchanged state. The same engine/renderer artifacts and material contract are retained. Sampled locomotion uses the existing pure solver and owned service updates; it must not grow the durable command receipt ledger. Forest seed/IDs/count remain stable, with new stand/species distribution and visible cell/LOD realization. See `docs/PERFORMANCE_AND_THIRD_PERSON.md`.

Current browser presentation: 2560×1440 output, upscaled 320×180 NexusGL world and native-size bitmap HUD. Third-person is default and V selects first-person. Browser execution runs in a worker; see the continuation evidence for workload-specific measurements.
