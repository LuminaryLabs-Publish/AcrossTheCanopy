# NexusGL rendering migration

## Ownership

The game keeps its existing story, inventory, save, object, camera and input owners. `presentation-projection.js` publishes game packets. `nexusgl-provider.js` consumes those packets through NexusEngine's optional Graphics Language Kit and NexusGL WASM. Camera imports use `nexusengine/domains/camera`; instance descriptions use `nexusengine/domains/render/batch`.

NexusGL renders the world at 320×180. The provider scales the completed world frame and composites the existing bitmap HUD at 640×360, then presents an independently owned RGBA frame through the kit's canvas host. The capture adapter returns the same composed pixels. The UI rasterizer stores premultiplied colors; the compositor converts to straight RGBA when combining with the world. The browser maintains a 16:9 view when resized. These explicit resolution limits suit a software-rendered greybox and do not match the former GPU renderer's full viewport resolution.

No Three.js package, provider, picker or texture helper remains in the application. The build rejects bundled modules from `node_modules/three`. The pinned engine may contain historical Three adapter names in its metadata; those strings do not load Three.js.

## Rendering mapping

| Content | Migration path |
| --- | --- |
| Authored geometry | Game-owned triangles, portable transforms and materials; complete box faces |
| Routes | Absolute path geometry, without a second object translation |
| Camera/FOV | Column-major world-to-clip matrix, right-handed view toward −Z, depth 0..1 |
| Picking | Nearest interactive-mesh intersection using the same triangle geometry and model transform |
| 2,300 trees | All placements retained as triangles; 96 additional trunk/crown models |
| Opaque content | Standard materials, directional lighting and fill |
| Translucent boundary | NexusGL blend-alpha material, opacity 0.34 |
| Dialogue, journal, puzzle, focus and controls | Existing bitmap UI descriptors, composited at presentation resolution |
| Failed render | Keep the last completed image, expose `lastError`, accept a later valid frame |
| Reset/disposal | Ignore obsolete generations; retain a completed image during reset; release provider/host resources at disposal |

Geometry resources are immutable for this authored slice. Only transforms, story visibility and the presentation packet change. The provider coalesces game-owned immutable packet references rather than copying all tree descriptions every simulation tick. Fixed simulation catch-up prepares a single presentation. The unused automatic Sequence Node driver is disabled because this app mounts no nodes; its scheduler and Story Kit remain active.

Fog, additive bloom, per-point vertex colors and instancing have no direct replacement in the selected NexusGL contract. Tree triangles, flat sky and the existing HUD communicate the greybox route; atmosphere, glow and foliage differ visibly from the former provider. Shadow casting is disabled in this adapter. These are recorded rendering differences, not claims of final-art parity. The baseline picker considers interactive meshes; general noninteractive occlusion remains outside this migration.

## Local commands

```bash
cd source
npm ci
npm run validate
npm run verify:wasm
npm run snapshot
npm run preview
```

`validate` runs numerical/gameplay/adapter checks and builds the browser package. `verify:wasm` executes the real 300-second game/capture route, checks completed-frame ownership and disposal, and writes measured evidence. `snapshot` reruns validation and refreshes the root `index.html` and generated `assets/` from `source/dist`. Never edit hashed bundles by hand.

Vite serves the pinned runtime assets in development and copies only `manifest.json`, `nexusgl.mjs` and `nexusgl.wasm` for production. The engine checks artifact byte counts and SHA-256 hashes before initialization. Native addons are not shipped in this browser snapshot.

`scripts/verify-browser-migration.mjs` exports `verifyBrowserMigration(page, {stage, url})` for a caller-supplied Playwright page. In order, run `open`, `starter`, `branch`, `rows`, `market`, `puzzle`, `station`, `answer`, `recover`, `controls`, `optional`, and `host`. It uses real mouse/keyboard events for story actions. The alternate ending restores the station save through the application's existing save API. Optional-route checks restore an observed chapter snapshot and then restore the completed save. Host checks deliberately block WASM loading and prove recovery. The script adds no browser package to the runtime. Use the production preview URL actually printed by Vite.

## Evidence and limits

Current acceptance records and images live in [the evidence index](../.agent/evidence/README.md). Keep tests, deterministic playback, browser input, screenshots and physical-device evidence distinct. The replay advances 300 simulated seconds; its wall duration is measured separately. Its final image hash is evidence of that run, not a promise that a timing-dependent FPS HUD has identical bytes in every run.

The CPU renderer's world resolution and local frame times remain production limits. Measurements name Apple M2 MacBook Air / 8 GB RAM, Chrome 155 or the recorded Node version, and exact resolutions. `renderDurationMs` covers rendering and composition. The displayed FPS uses completed-presentation intervals, including scheduling; it is not an assumed 60 Hz simulation rate.

Final art/audio, broader accessibility, mobile, Quest/XR, native hosts, GPU performance and a full production release remain outside this migration's proven scope. GitHub Actions remain disabled; pushing this migration does not deploy the site.

## Reference reconciliation

Reviewed read-only on 2026-10-22:

- [Phase 1 production plan](https://docs.google.com/document/d/1IKEtu4qd_rOlMvi7rolRgabSozCpkqnpO2Bt2zsvpTE/edit), modified 2026-09-05: authored browser adventure, intentional destination interaction, save/restore and both endings. Its final-art and approximately 60-minute targets are broader production milestones.
- [Development tracker](https://docs.google.com/spreadsheets/d/1k1ZrYJB4Um4xbD8v1uQQHcE5Bjqr34yYT79bbahojIM/edit), modified 2026-09-05: historical backlog and evidence, including start-marker raycast failure. Current repository checks supersede stale implementation-status rows for this migration; Drive was not edited.
- [Development plan](https://docs.google.com/document/d/1wZ7xYkWhCGRQU6dVlnl5lFD7PBiuX7HwcXnEc0uvw10/edit), modified 2026-09-02: product/engine ownership and future direction. Open-world expansion is outside the work.
- NexusEngine `docs/GRAPHICS-LANGUAGE.md` at dependency `5a4da3eba6ac95d2d8c74a008bb12caff0d6b0e8`: runtime, material, matrix, ownership and host contracts.

The six production scene packages cover Starter Perch, Rows, Market, Descent Lock, Station and Changed Return. The repository has five geographic locations, including Branch & Trunk Route. The lock is within the market and Changed Return revisits Rows. This migration preserves those representations and adds no location.
