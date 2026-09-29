# Feedback and deferred findings

These findings are outside the documentation-only pass.

## ATC-001 — Composition ledger status column is historical/stale

- Type: documentation-history / validation authority
- Evidence: `docs/NEXUS_COMPOSITION_LEDGER.md`, implemented source/tests
- Observation: the ledger was written as a pre-implementation build gate and many rows still say `Partial — proof pending` even though current source/tests now exercise substantial portions of the graph.
- Impact: readers can mistake planning status for current implementation state.
- Documentation action in this pass: add an explicit reconciliation note; preserve individual historical row statuses instead of silently re-certifying every subsystem.
- Suggested future action: run a dedicated current composition certification and update each row with exact current evidence if needed.
- Status: recommended later

## ATC-002 — Root committed build is not the Pages deployment authority

- Type: deployment clarity
- Evidence: root build files, `.github/workflows/deploy.yml`
- Observation: root contains built assets, but Pages workflow rebuilds `source/` and uploads `source/dist`.
- Impact: maintainers could edit/depend on the wrong artifact.
- Documentation action in this pass: clarify source vs snapshot vs CI deployment ownership.
- Status: informational

## ATC-003 — Greybox evidence is not final experience proof

- Type: acceptance boundary
- Evidence: capture adapter review metadata, greybox spec, current primitive content
- Observation: capture intentionally uses colored primitive greybox art and silent audio; deterministic logic is stronger than final audiovisual proof.
- Impact: passing capture/tests should not be labeled final-quality acceptance.
- Suggested future action: preserve separate final-art/audio/human review gates.
- Status: informational

## ATC-004 — Ledger should not be upgraded piecemeal without certification

- Type: evidence hygiene
- Evidence: ledger responsibility table vs varied current tests
- Observation: some rows have strong tests while others would require broader browser/provider/lifecycle proof to call fully current.
- Impact: mechanically changing every old `Partial` to `Pass` would overstate evidence.
- Suggested future action: update table statuses only through a bounded proof/certification pass.
- Status: required evidence discipline
