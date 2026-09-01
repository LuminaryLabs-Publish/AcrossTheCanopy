import assert from 'node:assert/strict';
import test from 'node:test';

import { NEXUS_COMMIT } from '../src/game/content.js';
import { createAcrossTheCanopyRuntime } from '../src/game/nexus-runtime.js';

test('the pinned Nexus composition owns the complete greybox authority graph', () => {
  const runtime = createAcrossTheCanopyRuntime({ treeCount: 2300, surface: { width: 640, height: 360, pixelRatio: 1 } });

  assert.equal(runtime.capabilities.nexus.commit, NEXUS_COMMIT);
  assert.equal(runtime.capabilities.nexus.installedKitIds.length, 32);
  assert.equal(runtime.getTrees().length, 2300);
  assert.equal(runtime.getPlacements().length, 31);
  assert.equal(runtime.getTreeBatch().capacity, 2300);
  assert.equal(runtime.engine.n.renderProviderContract.validateProvider instanceof Function, true);
  assert.equal(runtime.worldInitialization.navmesh.schema, 'nexusengine.navigation-graph-3d/1');
  assert.ok(runtime.worldInitialization.navmesh.waypoints.length > 100);

  runtime.dispatchAction({ operationId: 'test:runtime/begin', sequence: 1, type: 'begin', targetId: 'atc:trigger/spawn/starter-perch' });
  runtime.tick(1 / 60);
  assert.equal(runtime.getStory().dialogue.id, 'opening');

  runtime.setPresentation({ fov: 120 });
  assert.equal(runtime.getPlayer().fov, 120);
  const save = runtime.save('test-slot');
  assert.equal(save.schema, 'atc.nexus-runtime/1');
  runtime.reset();
  assert.equal(runtime.getStory().mode, 'intro');
  runtime.load('test-slot');
  assert.equal(runtime.getStory().dialogue, null);
  assert.equal(runtime.getPlayer().fov, 120);
});
