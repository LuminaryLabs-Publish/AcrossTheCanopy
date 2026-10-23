# NexusGL migration evidence

This records the functional greybox migration tested on 2026-10-22. It does not certify final art, production performance, mobile/Quest, native hosting or the full Phase 1 release. Delivery revision is recorded in the newest `.agent/change-log.md` entry.

| Gate | Result | Evidence |
| --- | --- | --- |
| Clean dependency install | Passed | Final continuation log; pinned package/lock |
| Numerical/gameplay/adapter checks | 29 passed | `npm run validate`; [validation record](validation.json) |
| Production build/root snapshot | Passed | Generated-file hashes in validation record |
| Three.js removal | Passed | Package/lock absent; build rejects Three modules |
| Seven authored routes | Passed with real browser events | [browser record](browser-migration-proof.json) |
| Both endings and same-session save restoration | Passed | Browser record, answer/recover images |
| Pause, journal/cancel, FOV, look and resize | Passed | Browser record and view captures |
| Boot failure, navigation, recovery and five ready cycles | Passed | Browser host record and error/restored images |
| Real WASM 300-second replay | Passed | [WASM record](wasm-migration-proof.json) |
| Owned pixels, budget rejection/recovery, disposal | Passed | WASM record and adapter checks |
| Development server and browser reset | Passed | Validation record |
| npm audit | Zero reported vulnerabilities | Validation record; not a complete renderer security audit |
| Production performance and full visual parity | Not qualified | Limits below and `.agent/feedback.md` |

The browser checker uses mouse/keyboard events for story actions. It uses the game's existing public save/load API to restore the station and an observed earlier chapter for optional routes, then restores completed progress. Save fixtures use the unchanged legacy serializer/schema; they are observations from this run, not claimed captures of a prior user's Three.js save.

## Current NexusEngine main integration (2026-10-23)

The game dependency now tracks `github:LuminaryLabs-Dev/NexusEngine#main`. The last validated main head was `081fea1cdd9ca1662bc15116e7174d9c27821630`; refresh with `cd source && npm update nexusengine` before future work. This newer proof supersedes the old pinned dependency for current integration status while leaving historical migration evidence intact. See [latest-main validation](nexusengine-main/validation.json) and the newest `.agent/change-log.md` entry.

## Current views

- [Starter Perch](nexusgl-starter-perch.png), [walking](nexusgl-movement.png), [spindle](nexusgl-spindle.png)
- [Branch/trunk arrival](nexusgl-branch-and-trunk.png), [crew inspection](nexusgl-crew-notch.png), [Rows](nexusgl-hanging-rows.png)
- [Low Market](nexusgl-low-market.png), [visible lock controls](nexusgl-lock-open.png), [station](nexusgl-station.png)
- [Signal ending](nexusgl-answer-ending.png), [sun-cell ending](nexusgl-recover-ending.png)
- [High Glide](nexusgl-high-glide.png), [Market Glide](nexusgl-market-glide.png)
- [Look left](nexusgl-look-left.png), [look right](nexusgl-look-right.png), [resized view](nexusgl-resized.png)
- [Expected failed WASM boot](nexusgl-boot-failure.png), [restored completed game](nexusgl-host-restored.png)

Visual review: readable text, colored targets, route cues and completion state in the intended primitive greybox. Inspection framing and the low-resolution world are not final presentation quality. The initial converted frame before HUD/geometry corrections is [historical](nexusgl-production-before.png); `production-spawn` and `low-market-corrected` images are intermediate records, not stronger acceptance than the final route captures.

## Measurements and limits

Host: Apple M2 MacBook Air, 8 GB RAM, macOS arm64; Chrome 155 and Node 25.8.1. World 320×180; presentation and bitmap HUD 640×360; 2,300 tree placements retained.

The final Node replay advances 300 simulated seconds in about 32.8 wall seconds. After 20 warm-up frames, rendering/composition measured 53.6 ms median and 59.7 ms p95. Sampled peak RSS was about 495 MiB and process high-water about 499 MiB. These are whole-process Node observations, not a 48 MiB or 192 MiB total application cap. The budget failure probe bounds renderer admission separately and demonstrates retained pixels plus a successful smaller frame.

The recorded browser run presented roughly 4–13 FPS. Raw render duration is not browser frame rate; the counter now measures completed-presentation intervals. [The isolated tick comparison](tick-driving-comparison.json) supports disabling the unused automatic Sequence Node driver, not a claim that overall FPS increased by the same ratio.

Fog, additive glow, shadow casting and exact GPU-renderer visual parity are not delivered. Picking retains the baseline interactive-mesh policy. Broad accessibility, physical-device coverage, all browser-cache cases and whole-process leak freedom remain unverified. The FPS HUD makes final frame hashes timing-dependent; the replay hash identifies one observed run rather than a byte-exact image regression threshold.

## Reproduce

```bash
cd source
npm ci
npm run validate
npm run verify:wasm
npm run snapshot
npm run preview
```

Run `verifyBrowserMigration(page, {stage, url})` from `scripts/verify-browser-migration.mjs` with a caller-supplied Playwright page. Stages: `open`, `starter`, `branch`, `rows`, `market`, `puzzle`, `station`, `answer`, `recover`, `controls`, `optional`, `host`. Use the actual production server URL for `open`. GitHub Actions stay disabled; these checks do not deploy.
