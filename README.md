# Across the Canopy

Across the Canopy is a first-person, point-and-click 3D story adventure set in a forest with no visible ground. This repository contains the playable greybox vertical slice **The Upward Signal**.

The authored route is:

`Starter Perch → Branch & Trunk Route → Hanging Rows → Low Market → Old Descent Station → changed return`

The surrounding 2,300-tree procedural forest remains an atmosphere and streaming stress test. Authored objects use stable IDs and a color language so final assets can replace primitives without changing their gameplay roles.

## Play

- `WASD` or arrow keys — move on authored routes
- Drag — look
- Click or `E` — focus and interact
- `Space` — advance dialogue
- `Escape` — cancel any interaction safely
- `J` — journal
- `P` — pause
- `[` / `]` or the on-screen control — FOV from 60–120

## Development

```bash
cd source
npm ci
npm run dev
```

Run the local checks, real WASM replay, and generated snapshot update with:

```bash
cd source
npm run validate
npm run verify:wasm
npm run snapshot
```

The editable Vite application lives in `source/`. NexusEngine's Graphics Language Kit loads NexusGL WASM and presents its RGBA framebuffer through the browser canvas. The game adapter owns packet-to-resource conversion and stable-ID picking; Three.js is not a runtime dependency. See [NexusGL rendering](docs/NEXUSGL_RENDERING.md) for supported mappings, measured limits and known visual gaps.

The repository root contains a generated build snapshot. GitHub Pages normally runs tests, rebuilds `source/`, and deploys `source/dist`; Actions are currently disabled for this migration, so a push will not publish the site. See `docs/GREYBOX_VERTICAL_SLICE.md` for the authored contract and `docs/NEXUS_COMPOSITION_LEDGER.md` for ownership history.

## Capture

`scripts/gameplay-video-adapter.mjs` runs the real Nexus runtime, story Kit, presentation projection, and NexusGL WASM provider through a deterministic 300-second replay. It contains ten exact 30-second beats and finishes the `answer_signal` consequence. The adapter returns completed RGBA frames instead of a Three.js scene.

## Migration evidence

The [evidence index](.agent/evidence/README.md) records 29 checks, all seven browser routes, both endings, save restoration, controls, failure recovery and the real WASM replay. The world is 320×180 with a 640×360 bitmap HUD. Recorded browser presentation was roughly 4–13 FPS on the tested Mac; this software-rendered greybox is not production-performance qualification. Fog, additive glow and shadows are not reproduced. See [rendering notes](docs/NEXUSGL_RENDERING.md) for the exact boundaries.
