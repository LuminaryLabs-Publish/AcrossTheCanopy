import assert from 'node:assert/strict';
import test from 'node:test';

import { NEXUS_COMMIT } from '../src/game/content.js';
import { createAcrossTheCanopyRuntime } from '../src/game/nexus-runtime.js';
import { createGameSession, FIXED_DELTA } from '../src/game/game-session.js';
import { createMockRenderProvider } from '../src/providers/mock-provider.js';

test('the pinned Nexus composition owns the complete greybox authority graph', () => {
  const runtime = createAcrossTheCanopyRuntime({ treeCount: 2300, surface: { width: 640, height: 360, pixelRatio: 1 } });

  assert.equal(runtime.capabilities.nexus.commit, NEXUS_COMMIT);
  assert.equal(runtime.engine.driveSequenceNodesWithTick, false);
  assert.ok(runtime.capabilities.nexus.installedKitIds.length >= 40);
  assert.equal(runtime.getTrees().length, 2300);
  assert.equal(runtime.getPlacements().length, 31);
  assert.equal(runtime.getTreeBatch().capacity, 2300);
  assert.equal(runtime.engine.n.renderProviderContract.validateProvider instanceof Function, true);
  assert.ok(runtime.capabilities.nexus.domainPaths.includes('n:render:graphics-language'));
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

test('fixed simulation steps can share one presentation and restored saves clear transient focus', async () => {
  const runtime = createAcrossTheCanopyRuntime({ treeCount: 8 });
  const provider = createMockRenderProvider();
  const session = createGameSession({ runtime, provider, width: 640, height: 360 });
  try {
    await session.initialize();
    const count = () => provider.getSnapshot().receipts.filter(receipt => receipt.type === 'execute-pass').length;
    const before = count();
    session.dispatch({ type: 'begin', targetId: 'atc:trigger/spawn/starter-perch' });
    const yaw = session.getCamera().yaw;
    session.step(FIXED_DELTA, { present: false });
    session.step(FIXED_DELTA, { present: false });
    assert.equal(count(), before);
    session.step(FIXED_DELTA);
    assert.equal(count(), before + 1);
    assert.equal(session.getPacket().revision, 3);
    assert.equal(session.getSnapshot().elapsed, FIXED_DELTA * 3);
    assert.equal(session.getCamera().yaw, yaw, 'opening at the current position must not turn the camera backwards');
    const save = session.save('migration-test').payload;
    session.dispatch({ type: 'inspect', targetId: 'atc:story/echo-spindle' });
    session.step(FIXED_DELTA);
    assert.equal(session.getStory().flags.spindle_inspected, true);
    session.load(save);
    session.step(FIXED_DELTA);
    assert.equal(session.getStory().flags.spindle_inspected, false, 'old input must not replay into the restored save');
    assert.equal(session.getStory().focusId, null);
    assert.equal(session.getStory().dialogue, null);
  } finally {
    await provider.dispose();
    await runtime.graphicsLanguage.dispose();
  }
});
