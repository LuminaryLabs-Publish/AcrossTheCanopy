# Start here

Across the Canopy is a Three.js/Vite first-person 3D story adventure. This repository contains the greybox vertical slice **The Upward Signal** inside a procedural forest with no visible conventional ground.

## Snapshot

- Repository: `LuminaryLabs-Publish/AcrossTheCanopy`
- Default branch: `main`
- Documentation baseline: `c5f610e69fd77466368b10b5366a63d8fa8eb241`
- Package: `across-the-canopy@0.1.0-greybox.0`
- NexusEngine pin: `8a60167fc945109408851c586a9355b1147438d5`
- NexusEngine package line: `0.0.4`
- Three.js: `0.165.0`
- Vite: `6.4.3`
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
- `source/src/providers/` — Three.js and mock render providers
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
