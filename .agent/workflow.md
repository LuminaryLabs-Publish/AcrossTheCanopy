# Workflow

## Before editing

1. verify exact remote `main`
2. read `AGENTS.md`, `.agent/start-here.md`, and the two canonical docs
3. edit application source only under `source/`
4. preserve stable IDs and Nexus/product ownership boundaries
5. do not hand-edit root hashed build output as a substitute for rebuilding

## Local setup and validation

```bash
cd source
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
- The disk and pointer blockers are resolved. The root snapshot is current. Remaining delivery task is committing and verifying the push to `main`, with repository Actions disabled.
