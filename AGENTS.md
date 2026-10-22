# Across the Canopy agent operating contract

Across the Canopy is a first-person point-and-click 3D story greybox. The editable application lives under `source/`; the repository also contains committed root build output, while GitHub Pages CI rebuilds and deploys `source/dist`.

## Read order

1. `AGENTS.md`
2. `.agent/start-here.md`
3. `.agent/repository-profile.md`
4. `.agent/memory.md`
5. `.agent/workflow.md`
6. `README.md`
7. `docs/GREYBOX_VERTICAL_SLICE.md`
8. `docs/NEXUS_COMPOSITION_LEDGER.md`
9. relevant `source/src/` and tests

## Hard boundaries

- `source/` is the editable source authority. Do not hand-edit root hashed build assets as product source.
- GitHub Pages normally rebuilds `source/dist`. Repository Actions and its workflow are disabled for this migration; keep them disabled and validate locally. A push must not trigger deployment.
- The current product is **The Upward Signal**, version `0.1.0-greybox.0`.
- Current authored world has five locations and seven traversal routes; the return consequence comes back to Hanging Rows rather than adding a sixth authored location.
- The procedural 2,300-tree forest is atmosphere/streaming context and must not own authored story route placement.
- Preserve the no-visible-conventional-ground rule.
- Gameplay logic targets stable IDs and roles, not primitive mesh names/colors.
- NexusEngine is pinned by the active migration to `5a4da3eba6ac95d2d8c74a008bb12caff0d6b0e8` / package line `0.0.4`; see `.agent/goal.md` and `docs/NEXUSGL_RENDERING.md` for current status and proof limits.
- Product-specific story/dialogue/puzzle/choice behavior remains in the AcrossTheCanopy story Kit; do not move it into reusable engine ownership casually.
- Test/build/capture evidence tiers must remain distinct from subjective final-art/gameplay-quality approval.

## Validation

```bash
cd source
npm ci
npm run validate
```

`npm run validate` runs the Node test suite and a Vite build. The five-minute capture adapter is a separate deterministic replay/evidence path.

## Scope discipline

Documentation findings may be corrected during Upkeep. Engine/runtime/product behavior findings belong in `.agent/feedback.md` unless separately authorized.
