# Goal

Across the Canopy should prove one complete authored first-person story route inside a much larger procedural canopy while using NexusEngine for reusable runtime/domain responsibilities and keeping product-specific narrative logic owned by the game.

## Success conditions

- authored route remains readable inside the procedural forest
- no conventional visible ground appears
- procedural generation never decides or obstructs authored story placement
- stable object IDs survive replacement of greybox primitives with final assets
- click-to-move and keyboard traversal update the same player/world authority
- unsafe/invalid traversal recovers rather than creating irreversible failure
- story/puzzle/choice/save behavior remains deterministic
- both final choices complete with distinct consequences
- NexusEngine ownership and product-owned extensions stay explicit
- rendering provider can be validated/replaced without changing authoritative game state
- the five-minute replay remains deterministic and bounded
- build/test/deploy/capture evidence stays distinct from final art and human experience approval

## Current milestone boundary

This repository documents and implements the greybox vertical slice. Final assets, audio, broad production content, and subjective AAA-quality acceptance are outside the current proven scope.
