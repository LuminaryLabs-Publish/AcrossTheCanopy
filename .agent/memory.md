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

- current dependency: `github:LuminaryLabs-Dev/NexusEngine#5a4da3eba6ac95d2d8c74a008bb12caff0d6b0e8`
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

## NexusGL renderer migration

- Current authorization allows AcrossTheCanopy and NexusGL performance work. NexusEngine remains read-only. This pass needed only game-local source changes; preserve NexusGL's pre-existing audit work.
- The runtime installs the optional Graphics Language Kit. Camera lives at `n:camera`; batches at `n:render:batch`. The game provider translates immutable packets; the game remains the authority for story and placement.
- All 2,300 deterministic tree identities remain. Seeded stands and species are projected through cached 96-unit cells, sparse nearby details and grouped distant canopy silhouettes. The renderer is CPU WASM, not a GPU backend.
- World pixels are 320×180; browser output and bitmap HUD are 2560×1440; Canvas upscales the world and stages the complete image. Bitmap colors are premultiplied and must not be multiplied by alpha twice. Completed captures own their pixel copies.
- Routes use absolute world coordinates. Their entrance markers sit away from the player origin. The lock submit plate was raised above the deck; the market visual deck was lowered 0.3 to clear the unchanged authored camera path.
- Keep fixed simulation steps, but prepare only one presentation per catch-up batch. Coalesce packet references instead of copying the tree set every tick. The app mounts no Sequence Nodes, so `driveSequenceNodesWithTick` is false; the ordinary scheduler and Story Kit still run. Revisit that choice if the app actually mounts Sequence Nodes later.
- Player saves remain `atc.storage-envelope/1` containing `atc.greybox.v1`, with portable game state rather than renderer handles. Restoring must reset Interaction/Input activations before loading Story state, then clear local movement/navigation/focus and reconcile Sela's placement in either direction. Otherwise historical input replays into the loaded save.
- Keep the last completed frame on render failure; expose `lastError` and allow a valid later frame. Failed startup displays a useful message. Page restoration reloads a disposed renderer; public save restoration is independently checked.
- Browser proof covers all seven routes and both endings; WASM proof covers the 300-second semantic replay, pixel ownership, real budget rejection/recovery and disposal. See evidence files for measurements and exact boundaries.
- The historical migration browser run measured roughly 4–13 FPS (superseded by the performance continuation); do not call raw rendering time FPS. Fog, additive glow and shadow casting are absent, and production/mobile/Quest/native/full accessibility remain unqualified.
- Drive's six production scene packages span the repo's five locations: the lock is within Market and Changed Return revisits Rows. Reviewed read-only on 2026-10-22; no new location or tracker write belongs in this migration.
- Repository Actions are disabled and Pages workflow `347958793` is manually disabled. Pushing does not deploy. Do not enable Actions without a new user instruction.

## Third-person and performance decisions

- The game chooses a worker-backed provider through the kit's existing selection contract. It does not create another Core registry. Completed pixels and the corresponding picking packet have the same lifetime/generation boundary.
- A pinned game-local execution specialization caches one last transformed stream per immutable geometry declaration and unchanged scene settings. Pixel parity with the original provider is an explicit gate; update this specialization deliberately when changing the engine pin.
- Presentation updates request `snapshot:false` when their return value is unused. The full API snapshot remains available; static forest data must not be copied every displayed frame.
- Third-person is the ordinary default. Capture stays first person. V switches views without changing player position or saves. Camera obstruction is limited to supported authored solid bounds; a broad physics/collision claim would be incorrect.
- Browser checkers must wait for simulation ticks after clicking. A focus revision is not proof that a navigation or dialogue action ran. The faster asynchronous renderer exposed that old checker race.

- Continuous input is not a stream of durable remote commands. The application coordinates Nexus's exported locomotion solver once per engine tick and commits through the owning services; ordinary `step()` keeps its explicit receipt semantics. Never trim/delete command history to hide a performance problem. The 3,600-tick regression keeps a real command receipt intact while sampled movement stays bounded.
- Per-frame placement updates must not restore a full locomotion snapshot or reset velocity. Use synchronization only for explicit warps/navigation/load, and read lightweight placement state in the hot path. Compare moving and rotating runs as well as stationary FPS; the first motion soak exposed a severe growth bug that idle sampling missed.

- User selected 1440p output with a lower-resolution world. Keep the actual browser canvas at 2560×1440 and world raster capped at 320×180; do not describe that as native 1440p fidelity. Preserve owned captures and verify Canvas/capture alpha agreement.

Push each verified major AcrossTheCanopy change to the actual default `main` as a checkpoint. Keep Actions disabled; do not wait to accumulate unrelated major changes, create branches/PRs, or deploy.
