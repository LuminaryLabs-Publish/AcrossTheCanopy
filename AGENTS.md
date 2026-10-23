# Across the Canopy agent operating contract

Across the Canopy is a third-person point-and-click (optional first-person) 3D story greybox. The editable application lives under `source/`; the repository also contains committed root build output, while GitHub Pages CI rebuilds and deploys `source/dist`.

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

## Architecture

- Build gameplay and rendering features through NexusEngine’s semantic domain architecture. Put reusable state, lifecycle, and contracts under the existing domain/DSK that owns them; let the game composition assemble those services. Keep story and product-specific rules in the AcrossTheCanopy product Kit. Use public domain services and avoid parallel registries or duplicate state owners. Check the latest NexusEngine `main` before choosing an owner or API.

## Hard boundaries

- `source/` is the editable source authority. Do not hand-edit root hashed build assets as product source.
- GitHub Pages normally rebuilds `source/dist`. Repository Actions and its workflow are disabled for this migration; keep them disabled and validate locally. A push must not trigger deployment.
- The current product is **The Upward Signal**, version `0.1.0-greybox.0`.
- Current authored world has five locations and seven traversal routes; the return consequence comes back to Hanging Rows rather than adding a sixth authored location.
- The deterministic 2,300-tree forest uses cell visibility and LOD for atmosphere/streaming context and must not own authored story route placement.
- Preserve the no-visible-conventional-ground rule.
- Gameplay logic targets stable IDs and roles, not primitive mesh names/colors.
- NexusEngine is consumed from its latest `main` branch; refresh the dependency before validation and record the resolved commit in `.agent` evidence. See `.agent/goal.md` and `docs/NEXUSGL_RENDERING.md` for integration status and proof limits.
- Product-specific story/dialogue/puzzle/choice behavior remains in the AcrossTheCanopy story Kit; do not move it into reusable engine ownership casually.
- Test/build/capture evidence tiers must remain distinct from subjective final-art/gameplay-quality approval.

## Validation

Refresh the NexusEngine Git dependency from upstream `main` before validation or implementation. The package manifest tracks `#main`; the lockfile records the exact commit used for the install.

```bash
cd source
npm update nexusengine
npm ci
npm run validate
```

`npm run validate` runs the Node test suite and a Vite build. The five-minute capture adapter is a separate deterministic replay/evidence path.

## Scope discipline

Documentation findings may be corrected during Upkeep. Engine/runtime/product behavior findings belong in `.agent/feedback.md` unless separately authorized.

Push each verified major AcrossTheCanopy change to the actual default `main` as a checkpoint. Keep Actions disabled; do not wait to accumulate unrelated major changes, create branches/PRs, or deploy.
