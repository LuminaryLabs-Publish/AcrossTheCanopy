# Start here

Across the Canopy is a Vite third-person/optional first-person 3D story adventure using NexusGL through NexusEngine's Graphics Language Kit. This repository contains the greybox vertical slice **The Upward Signal** inside a procedural forest with no visible conventional ground.

## Snapshot

- Repository: `LuminaryLabs-Publish/AcrossTheCanopy`
- Default branch: `main`
- Performance baseline: `077160f7de6b354749d20957ae90b28b1dc42626`
- Package: `across-the-canopy@0.1.0-greybox.0`
- NexusEngine source: latest `main`; last verified `081fea1cdd9ca1662bc15116e7174d9c27821630`
- NexusEngine package line: `0.0.4` (package metadata at the verified main revision)
- Refresh before work: `cd source && npm update nexusengine`; `package-lock.json` records the resolved SHA for that install
- Renderer: NexusGL WASM via the Graphics Language Kit
- Vite: `6.4.5`
- Upkeep pass: `MNT-367`

## Architecture rule

Build new capabilities through NexusEngine’s semantic domains and their owning DSKs, then assemble those services in the game. AcrossTheCanopy keeps its story rules in its product Kit. Avoid duplicate state owners; check the latest NexusEngine `main` before selecting a domain service.

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

## Historical migration

The functional migration was delivered at `a502c0f7f9105483de6f9459da5b40ead3b7b717`, followed by continuity commit `077160f7de6b354749d20957ae90b28b1dc42626`. Its 29-check, 640×360-output and 4–13 FPS observations are historical. Preserve `.agent/evidence/README.md` and `delivery.json`; use the performance continuation for current acceptance.

Save restoration resets Interaction/Input activations and transient navigation/focus. The app mounts no Sequence Nodes; its automatic node driver is disabled while normal Runtime and Story scheduling remain active. Actions and the Pages workflow must remain disabled. Do not deploy.

## Active performance and third-person continuation

Authorized scope is AcrossTheCanopy plus NexusGL performance changes if needed; NexusEngine stays unchanged. Browser execution uses a worker selection of NexusGL through the same Graphics Language Kit, with a game-local execution cache. Procedural data retains all 2,300 stable tree IDs; cells and grouped canopy LOD reduce submitted geometry. Third-person is default; V restores first-person. See `docs/PERFORMANCE_AND_THIRD_PERSON.md` and the dedicated evidence folder. The implementation passes local test/build and browser gates; timing results and delivery observations belong in the dedicated evidence. Do not infer universal smoothness or AAA qualification from an isolated FPS sample.

Resolution: user selected actual 2560×1440 browser output with an upscaled 320×180 world and native-size bitmap HUD. Canvas stages and scales pixels; it does not render game geometry. Current measurements belong to the dedicated continuation evidence, separate from historical 640×360 output.

Current source delivery: `c7be124d1364f83ca1351a212aef0feb7f2fa567`; all 138 tracked remote blobs matched. Functional gates pass. Final-build timing varies: stationary 20.1 FPS, moving 11.0 FPS in the latest uncontrolled-load samples. The smoothness target remains open; inspect distributions and historical samples before deciding what to optimize. See the continuation evidence and delivery record.

Delivery readback: implementation `c7be124d1364f83ca1351a212aef0feb7f2fa567` matched all 138 remote tracked blobs. Actions remain disabled, with no new run or deployment. Final comparison and movement evidence is recorded; frame-time consistency remains OPEN.
