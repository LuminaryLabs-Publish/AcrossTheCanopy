# Across the Canopy — NexusEngine Composition Ledger

## Current reconciliation

This document originated as the **pre-implementation build gate** for The Upward Signal. The repository now contains the implemented Nexus composition, story Kit, adapters/providers, deterministic tests, persistence tests, provider-replacement tests, and the 300-second capture path.

The detailed responsibility table below is preserved because it records the intended ownership split and original proof requirements. Its per-row `Partial — proof pending` values are **historical pre-implementation status labels**, not the current live validation authority. Do not mechanically reinterpret them as current failures or upgrade them to Pass without a dedicated row-by-row certification.

Current implementation evidence lives in `source/src/`, `source/test/`, `scripts/gameplay-video-adapter.mjs`, `README.md`, and `.agent/`. This documentation pass does not re-certify every ledger row.

## Binding

- Canonical repository: `https://github.com/LuminaryLabs-Dev/NexusEngine`
- Resolved commit: `8a60167fc945109408851c586a9355b1147438d5`
- Package: `nexusengine@0.0.4`
- Dependency: `github:LuminaryLabs-Dev/NexusEngine#8a60167fc945109408851c586a9355b1147438d5`
- Operating mode: build gate / ownership ledger
- Historical pre-implementation status: `partial-ready` before runtime implementation

The executable package and its exports remain authoritative for the pinned engine dependency.

## Composition decision

Existing public Kits cover runtime, semantic input, locomotion, object identity and placement, authored/procedural world meaning, navigation, affordances, presentation, persistence contracts and portable rendering contracts. Across the Canopy adds only the smallest product-owned extensions that are absent from NexusEngine:

1. An installed story-state service Kit for this game's dialogue, clues, journal, puzzle and choice.
2. A bounded browser device adapter that emits semantic input descriptors.
3. A stable-ID Three.js raycast adapter that emits Interaction activations.
4. A Presentation-to-Render projection adapter that creates immutable provider packets.
5. A validated Three.js provider implementing the public Render provider contract.
6. A localStorage transport adapter behind the public Persistence contract.

No new reusable Nexus domain or engine Kit is justified for this slice.

## Mandatory responsibility ledger

| Responsibility | Materiality | Authoritative owner / public import | Kit, path and API | Sole writer and readers | Adapter / provider | Lifecycle, snapshot and proof | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Startup and deterministic ticks | Required | Runtime; `createEngine` from `nexusengine` | default Runtime lifecycle/realtime/sequence Kits; `n:runtime`; `engine.tick(1/60)` | Runtime writes clock and tick commit; installed systems read tick context | Host frame adapter only accumulates fixed time | Two identical traces must produce identical snapshots; start/stop twice must return resources to baseline | Partial — proof pending |
| Raw keyboard, pointer and touch | Required | Host adapter; semantic authority is Input from `nexusengine/domains/interaction/input` | `input-contract-kit`; `n:interaction:input`; `engine.n.input` descriptor API | Bounded device buffer is sole raw-event writer; game systems read immutable semantic descriptors | `BrowserInputAdapter` | Dispose listeners; device-free semantic trace must produce the same result | Partial — proof pending |
| Targets, prompts and activations | Required | Interaction from `nexusengine/domains/interaction/runtime`; affordances from `nexusengine/domains/interaction/environmental-affordance` | `interaction-kit`, `environmental-affordance-kit`; `n:interaction*`; `interaction`, `environmentalAffordances` | Interaction APIs own targets/activation receipts; story coordinator consumes completed activations | `ThreePickAdapter` emits stable IDs only | Raycast must resolve expected ID and change downstream story/UI state; cancel always restores explore mode | Partial — proof pending |
| Player movement, gliding and recovery | Required | Simulation/Motion/Locomotion from `nexusengine/domains/simulation/runtime`, `/motion`, `/motion/locomotion` | `simulation-state-kit`, `motion-contract-kit`, `action-locomotion-kit`; `n:simulation*`; `simulation`, `motion`, `actionLocomotion` | Locomotion API writes kinematic frame; Object Placement receives the approved position | Product movement coordinator translates Input to locomotion and contact | Fixed traces, kill-boundary recovery, cancel/restore and snapshot round-trip | Partial — proof pending |
| Climbing and zipline traversal | Required | Product route rules coordinate verified Locomotion and Object Placement | Product story Kit plus `actionLocomotion` and `objectPlacement` | Route command is product-owned; Locomotion/Placement remain transform authorities | Stateless traversal projection | Both routes must start only from valid affordances and end at declared anchors without soft lock | Partial — proof pending |
| Stable identities and world placement | Required | Object from `nexusengine/domains/object/registry` and `/placement` | `object-registry-kit`, `object-placement-kit`; `n:object*`; `object`, `objectPlacement` | Object/Placement APIs are sole identity/transform writers; render projection reads snapshots | Presentation projection | Unique-ID audit; placement snapshot mutate/reset/load must deep-equal | Partial — proof pending |
| Authored locations, routes and transitions | Required | World from `nexusengine/domains/world`, scene from `/world/scene`, route field from `/world/navigation/route-field`, landmarks from `/world/navigation/landmark-guidance` | `world-state-kit`, `scene-kit`, `route-field-kit`, `landmark-guidance-kit`; `n:world*`; `world`, `scene`, `routeField`, `landmarkGuidance` | World/Scene own location graph; product story Kit owns exact narrative requirements | World-to-Object placement adapter | Route graph reachability, blocked exits and changed return state must be proven | Partial — proof pending |
| Click-to-move path | Required | Procedural Generation, NavMesh and Pathfinding from `nexusengine/domains/world/generation`, `/navigation/navmesh`, `/navigation/pathfinding` | `procedural-generation-kit`, `navmesh-kit`, `pathfinding-kit`; `n:world:generation`, `n:world:navigation:*` | Navigation APIs own walkability graph and resolved path; locomotion consumes route | Click target adapter | Valid destination resolves a path; invalid/red boundary returns an explicit unavailable result | Partial — proof pending |
| Procedural 1,000+ tree context | Required | World Generation owns seed/output; Object owns active identity/placement; Presentation Graphics owns instance batches | generation + object + graphics Kits | Domain APIs own generated descriptors; provider owns derived InstancedMesh cache only | World/Object-to-Graphics projection; Three provider | Tree count >= 1,000, deterministic seed, bounded batches, provider cache disposable/rebuildable | Partial — proof pending |
| Story, dialogue, clue, puzzle, journal and choice | Required | AcrossTheCanopy installed product service via `defineDomainServiceKit` from `nexusengine/domain-service-kit` | `across-the-canopy-story-kit`; `n:product:across-the-canopy`; `engine.n.acrossTheCanopy` | Product Kit is sole narrative writer; Presentation and Persistence receive snapshots | Story projection adapter | Both choices complete, invalid ordering is rejected, reset/load round-trip deep-equals, BFS finds no soft lock | Partial — proof pending |
| Camera, FOV and inspection framing | Required | Camera from `nexusengine/domains/presentation/camera` | `camera-descriptor-kit`; `n:presentation:camera`; `camera` | Camera descriptors are authoritative; provider camera is derived | Presentation projection; Three provider | Descriptor-only FOV 60/90/120 changes projection pixels; inspect/dialogue cancel restores previous descriptor | Partial — proof pending |
| HUD, reticle, prompts, dialogue, journal, puzzle and settings | Required | Presentation UI from `nexusengine/domains/presentation/ui`; registry from `/presentation/registry`; UI scale from `/presentation/ui/scale` | Presentation/UI Kits; `n:presentation`, `n:presentation:ui`; `presentation`, `ui`, `uiScale` | UI descriptors are sole semantic UI state; provider consumes immutable descriptors | Generic WebGL UI realization in Three provider | Every visible UI item has stable descriptor ID; source audit finds no product HTML/CSS UI | Partial — proof pending |
| Surface, safe area and resolution | Required | Presentation Output from `nexusengine/domains/presentation/output`; Host from `nexusengine/domains/host/capabilities` | output and host Kits; `n:presentation:output`, `n:host`; `presentationOutput`, `host` | Output descriptor owns viewport/render policy; provider owns Canvas/WebGL handles | Browser host adapter; Three provider | Resize/output-policy change must alter actual viewport and provider receipt | Partial — proof pending |
| Visual meaning and instance batches | Required | Presentation Graphics from `nexusengine/domains/presentation/graphics` | `graphics-descriptor-kit`; `n:presentation:graphics`; `graphics` | Graphics descriptors own color/material/light/batch meaning; provider owns GPU realization | Presentation projection | Descriptor revision must change pixels; provider replacement leaves authoritative snapshot equal | Partial — proof pending |
| Portable render boundary | Required | Render contract/frame/provider Kits from `nexusengine/domains/render/contract`, `/frame-schema`, `/provider-contract` | `render-domain-contract-kit`, `render-frame-schema-kit`, `render-provider-contract-kit`; `n:render*` | Render frame schema owns packet validity; provider owns execution only | `PresentationRenderProjection`; validated `ThreeRenderProvider` | Provider must implement all required methods; frame validation, receipts, reset/dispose and mock replacement must pass | Partial — proof pending |
| Save slots and reload | Required | Persistence from `nexusengine/domains/runtime/persistence`; state schemas remain with owning Kits | `persistence-contract-kit`; `n:runtime:persistence`; `persistence` | Owning Kits write snapshots; Persistence descriptors own slots; storage adapter only transports bytes | `LocalStoragePersistenceAdapter` / memory adapter in tests | Save, mutate, reset, load and deep-compare; corrupt/unknown version fails to usable new game | Partial — proof pending |
| Pause, restart, failure and completion | Required | AcrossTheCanopy product Kit; UI descriptors project state | product story Kit and Presentation UI | Product API is sole mode/progression writer | Input-to-product coordinator | Pause/resume, red-boundary recovery, restart and both completion branches | Partial — proof pending |
| External assets | Not applicable | None: the slice intentionally uses generated colored primitives and provider-generated text textures | No Asset Kit installed | Immutable product content describes primitives; provider textures are derived caches | Three provider | Source audit confirms no fetched models/textures/audio | Pass — not applicable by design |
| Audio | Not applicable | Silent greybox; no audio meaning is claimed in this milestone | No Audio Kit installed | None | None | Video is intentionally silent | Pass — not applicable by scope |
| Dynamic physics | Not applicable | Locomotion + authored contact surfaces are sufficient; no dynamic rigid bodies are claimed | No Physics provider installed | Route/contact rules approve deterministic kinematic motion | Product contact adapter | Red boundaries and route anchors are tested; no claim of general physics | Pass — not applicable by scope |

## Required causal chains

```text
DOM device event
→ Input descriptor revision
→ Action Locomotion / product-rule revision
→ Object Placement / World revision
→ Presentation UI, Camera and Graphics revisions
→ normalized Render frame
→ immutable provider packet
→ validated Three.js provider receipt
→ pixels
```

```text
Three pick adapter
→ stable Object ID
→ Interaction target / affordance activation
→ AcrossTheCanopy story command
→ story, journal, route or choice snapshot revision
→ Presentation descriptor revision
→ provider receipt and changed pixels
```

## Installation order

1. Runtime defaults and Persistence.
2. Host.
3. World, Generation, Route Field and Landmark Guidance.
4. Object Registry and Placement.
5. Interaction, Input and Environmental Affordances.
6. Simulation, Motion and Action Locomotion.
7. Presentation Registry, Output, UI, UI Scale, Camera and Graphics.
8. Render domain, frame schema and provider contract.
9. AcrossTheCanopy story Kit.
10. Two-phase NavMesh and Pathfinding installation after authored walkability exists.

## Completion gate

The implementation may be called NexusEngine-composed only after the static import audit, runtime discovery, causal differentials, deterministic replay, snapshot/reset, lifecycle cleanup, provider validation/replacement, exact-source render, real interaction and no-product-HTML checks pass. A visually working build alone is insufficient.

