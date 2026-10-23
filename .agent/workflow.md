# Workflow

## Before editing

1. verify exact remote `main` and fetch the latest `LuminaryLabs-Dev/NexusEngine` `main`
2. read `AGENTS.md`, `.agent/start-here.md`, and the two canonical docs
3. run `cd source && npm update nexusengine` before validation or implementation so the lockfile resolves the latest engine branch head
4. edit application source only under `source/`
5. preserve stable IDs and Nexus/product ownership boundaries
6. do not hand-edit root hashed build output as a substitute for rebuilding

## Local setup and validation

```bash
cd source
npm update nexusengine
npm ci
npm test
npm run build
npm run validate
```

`npm run validate` already includes tests and build, so running all commands separately is useful only when their individual evidence matters.

## Evidence by change type

- docs only → paths/commands/source claims + documentation-only diff
- story/state → story-model/story-Kit tests, save/hydrate, completion branches
- Nexus runtime composition → runtime tests + composition audit
- presentation/provider → packet/provider tests and replacement proof
- storage → adapter tests + browser transport when relevant
- authored content/routes → content tests + no-soft-lock/reachability evidence
- capture → capture-director tests + 300-second adapter evidence
- deployment → Pages workflow build/deploy evidence
- final player/visual quality → real browser/human review, not inferred from unit tests

## Root build snapshot

When intentionally refreshing committed root static output, generate it from `source/` and verify the resulting deployment. Do not manually patch hashed root assets.

## Closeout

Race-check `main`, fast-forward with `force=false`, re-read every changed doc from live GitHub, and record source findings in `.agent/feedback.md`.

## NexusGL migration loop

At each iteration, reread `AGENTS.md`, `.agent/goal.md`, `.agent/start-here.md`, this workflow, the newest `.agent/change-log.md` entry and relevant `.agent/feedback.md` findings. Check `git status`, `HEAD`, remote `main`, and repository Actions state before selecting one unblocked task.

Implement one narrow migration task under this repository. Run the existing `cd source && npm run validate` gate plus a real browser check for changed rendering or interaction. Capture the observed result and exact revision in `.agent/change-log.md`; update goal and start-here status; keep failures and unresolved requirements in `.agent/feedback.md`. Pass advances to the next task. Failure records evidence, permits up to three focused attempts, then requires a revised hypothesis or a documented blocker.

Before pushing, verify every repository Actions workflow is disabled and there are no runs queued or in progress. Do not use workflow skip annotations as a substitute. Push validated commits only to `origin main`, then verify remote SHA and workflow state. Never force-push.

## Active NexusGL checkpoint

- Run `cd source && npm ci && npm run validate`; `npm run verify:wasm` checks the actual WASM story/capture path and budget recovery. `npm run snapshot` validates then regenerates root output.
- `scripts/verify-browser-migration.mjs` accepts a caller-supplied Playwright page. Run its stages `open`, `starter`, `branch`, `rows`, `market`, `puzzle`, `station`, `answer`, `recover`, `controls`, `optional`, `host` against the production/root server. Use real events for story actions and public save/load commands for restoration.
- Preserve completed progress before alternate-route tests. The driver aims using rendered geometry, avoids tiny drags that count as clicks, and walks around the console to see the recover-cell choice.
- Read the evidence index for current results and limits. Compare completed-presentation intervals, raw render time, memory and resolution separately.
- The earlier migration was delivered. Current performance/third-person work must regenerate the root snapshot and verify its module worker and WASM on the production/root server before pushing. Keep repository Actions disabled.

## Performance and camera acceptance

Use `docs/PERFORMANCE_AND_THIRD_PERSON.md` for the current commands and boundary. Run the real browser checker with caller-provided Playwright, and record completed-presentation intervals, raster/geometry phase times, main-thread rAF, resolution, resource count and warm-up separately. Verify third-person movement and V toggling with real keys, both endings, save/load, resize, failed WASM boot and repeated readiness. Keep historical migration evidence intact. Source pushes update main only; no workflow or Pages deployment is authorized.

For 1440p acceptance, verify the canvas backing size and owned capture are 2560×1440, record the separate world raster size, and compare displayed Canvas pixels against the CPU-composed capture. The current checker allows at most two channel levels for browser alpha rounding. Do not use CSS width alone as resolution proof.

Push each verified major AcrossTheCanopy change to the actual default `main` as a checkpoint. Keep Actions disabled; do not wait to accumulate unrelated major changes, create branches/PRs, or deploy.
