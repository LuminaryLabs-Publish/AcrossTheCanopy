# Intention

## Author the story route; generate the atmosphere

The forest generator supplies large-scale canopy atmosphere and streaming load. Story locations, routes, clues, NPCs, puzzle objects, hazards and choices are authored and stable.

## Preserve a world with no ordinary ground

Downward depth should reveal more forest structure, fog, branches and suspended infrastructure rather than a conventional terrain floor.

## Keep gameplay IDs independent of greybox meshes

Stable object IDs and semantic roles allow primitive geometry to be replaced later without rewriting story/interaction logic.

## Compose NexusEngine rather than duplicate it

Reusable runtime, world, object, interaction, simulation, presentation, persistence and render contracts remain NexusEngine responsibilities. The game's exact story state and product coordination remain local.

## Keep the source/deployment split explicit

Developers edit `source/`. Root build output is a committed snapshot. GitHub Pages uses a fresh CI build from `source/`; no one should mistake root hashed assets for the authoring source.

## Keep evidence tiered

Node tests, Vite build, provider tests, deterministic capture, GitHub Pages deployment, real browser interaction, and human story/visual review are different forms of evidence.
