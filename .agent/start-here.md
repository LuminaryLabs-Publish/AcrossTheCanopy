# Start here

Across the Canopy is a Vite first-person 3D story adventure using NexusGL through NexusEngine's Graphics Language Kit. This repository contains the greybox vertical slice **The Upward Signal** inside a procedural forest with no visible conventional ground.

## Snapshot

- Repository: `LuminaryLabs-Publish/AcrossTheCanopy`
- Default branch: `main`
- Documentation baseline: `c5f610e69fd77466368b10b5366a63d8fa8eb241`
- Package: `across-the-canopy@0.1.0-greybox.0`
- NexusEngine pin: `5a4da3eba6ac95d2d8c74a008bb12caff0d6b0e8`
- NexusEngine package line: `0.0.4`
- Renderer: NexusGL WASM via the Graphics Language Kit
- Vite: `6.4.5`
- Upkeep pass: `MNT-367`

## Authored route

```text
Starter Perch
  ↓
Branch & Trunk Route
  ↓
Hanging Rows
  ↓
Low Market
  ↓
Old Descent Station
  ↓
Counterweight return to Hanging Rows / changed consequence
```

The current content defines five authored locations and seven routes. Optional glides provide alternate links; they do not add locations.

## Repository map

- `source/` — editable Vite application and tests
- `source/src/game/` — Nexus runtime composition, story model/Kit, content, session, capture director
- `source/src/adapters/` — browser input, stable-ID picking, storage
- `source/src/providers/` — NexusGL and mock render providers
- `source/test/` — current deterministic/unit integration tests
- `scripts/gameplay-video-adapter.mjs` — deterministic 300-second capture adapter
- `docs/GREYBOX_VERTICAL_SLICE.md` — authored gameplay/world contract
- `docs/NEXUS_COMPOSITION_LEDGER.md` — Nexus ownership/build-gate ledger
- `.github/workflows/deploy.yml` — test/build/Pages deployment
- root `index.html` + `assets/` — committed built snapshot, not the source edited by developers

## Immediate warnings

- The composition ledger originated as a pre-implementation build gate. Its old row-status labels are historical planning state, not current live validation status.
- GitHub Pages deploys a fresh `source/dist`, not the committed root snapshot.
- A deterministic capture replay is not a browser-DOM input test and intentionally has silent audio/greybox art.
- Final visual quality and long-form player experience are separate acceptance concerns.

## Active work

- The NexusGL migration is verified locally and ready for a `main` push. See `.agent/goal.md` and the evidence index.
- Production: NexusGL WASM world 320×180; bitmap HUD and presentation 640×360. Three.js is absent from the package and runtime; the root snapshot is generated from `source/dist`.
- Passed: 29 checks/build, clean install, zero npm audit findings, full browser adventure and both endings, all seven routes, save restoration, controls/resize, failed boot recovery, navigation and repeated reloads, real 300-second WASM replay and allocation-budget recovery.
- Save/load uses the existing public application command API. Restore clears stale input queues, local navigation/focus and derived Sela placement. This fixes the old actions replaying after load.
- The app mounts no Sequence Nodes; its unused automatic Sequence Node frame driver is disabled. Runtime scheduling and the Story Kit remain active.
- Actual browser presentation in this recorded host run was roughly 4–13 FPS. Raw rendering times must not be labeled browser FPS. Fog, glow, shadows, final art/audio, production performance and other hosts remain qualification work.
- Actions are disabled at repository level and the Pages workflow is disabled manually. Recheck before and after pushing. Do not enable a workflow or deploy.
- Next: review/stage migration files, fetch remote `main`, commit/push without force, verify content and workflow state, and record the exact source revision in the change log.
