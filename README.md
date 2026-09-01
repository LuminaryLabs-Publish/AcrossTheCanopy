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
npm install
npm run dev
```

Run the full local gate with:

```bash
cd source
npm run validate
```

The editable Vite application lives in `source/`. The repository root contains the built static deployment. See `docs/GREYBOX_VERTICAL_SLICE.md` for the authored contract and `docs/NEXUS_COMPOSITION_LEDGER.md` for ownership and dependency proof.

## Capture

`scripts/gameplay-video-adapter.mjs` runs the real Nexus runtime, story Kit, presentation projection, and Three.js provider through a deterministic 300-second replay. It contains ten exact 30-second beats and finishes the `answer_signal` consequence.
