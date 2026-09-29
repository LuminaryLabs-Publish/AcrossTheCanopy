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
