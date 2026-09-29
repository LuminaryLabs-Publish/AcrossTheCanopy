# Maintainer memory

## Product facts

- slice: `The Upward Signal`
- package version: `0.1.0-greybox.0`
- five authored locations
- seven routes
- 2,300 default procedural trees
- forest seed 41731
- no conventional visible ground
- initial FOV 78; clamped 60–120

## Route memory

`Starter Perch → Branch & Trunk Route → Hanging Rows → Low Market → Old Descent Station → station return to Hanging Rows`.
High Glide and Market Glide are optional alternate traversal routes between existing locations.

## Completion memory

Success requires reaching the station, verifying the fresh signal, choosing either answer/recover path, returning to Hanging Rows, completing Sela's response, and persisting the completion state. The story tests exercise both consequence branches.

## Nexus memory

- dependency: `github:LuminaryLabs-Dev/NexusEngine#8a60167fc945109408851c586a9355b1147438d5`
- package line documented as `nexusengine@0.0.4`
- product story Kit path: `n:product:across-the-canopy`
- engine API exposed by product runtime includes Nexus-owned domain services plus `engine.n.acrossTheCanopy` for story meaning

## Deployment memory

- editable source: `source/`
- root `index.html`/`assets/`: committed build snapshot
- Pages workflow: `npm ci` → `npm test` → Vite build from `source/` with `/AcrossTheCanopy/` base → deploy `source/dist`

## Capture memory

- duration: 300 seconds
- ten 30-second beats
- actual runtime/session/provider path
- final capture consequence is the `answer_signal` path
- framebuffer capture intentionally excludes browser DOM input
- audio is intentionally silent in this greybox capture

## Documentation trap

`docs/NEXUS_COMPOSITION_LEDGER.md` began as a pre-implementation build gate. Historical `Partial — proof pending` row statuses are not current proof authority after implementation. Use current source/tests/capture for live implementation evidence unless the ledger row is explicitly re-certified.
