import assert from 'node:assert/strict';
import test from 'node:test';

import { createEngine } from 'nexusengine';

import { createAcrossTheCanopyStoryKit } from '../src/game/story-kit.js';

function createStoryEngine() {
  return createEngine({ kits: [createAcrossTheCanopyStoryKit()] });
}

test('the product Kit applies an operation ID exactly once', () => {
  const engine = createStoryEngine();
  const story = engine.n.acrossTheCanopy;
  const first = story.applyAction({ operationId: 'test:begin-once', sequence: 1, type: 'begin' });
  const revision = story.getState().revision;
  const effectCount = story.listEffects().length;

  const duplicate = story.applyAction({
    operationId: 'test:begin-once',
    sequence: 2,
    type: 'inspect',
    targetId: 'atc:story/echo-spindle'
  });

  assert.equal(first.accepted, true);
  assert.equal(duplicate.duplicate, true);
  assert.equal(story.getState().revision, revision);
  assert.equal(story.getState().flags.spindle_inspected, false);
  assert.equal(story.listEffects().length, effectCount);
  assert.deepEqual(story.getRuntimeState().processedOperationIds, ['test:begin-once']);
});

test('the product Kit snapshots, resets, and restores through its public API', () => {
  const engine = createStoryEngine();
  const story = engine.n.acrossTheCanopy;
  story.applyAction({ operationId: 'test:begin', type: 'begin' });
  story.applyInternal({ type: 'cancel' });
  story.applyAction({ operationId: 'test:inspect', type: 'inspect', targetId: 'atc:story/echo-spindle' });

  const payload = story.createSavePayload({ position: [2, 85, 47], fov: 92 });
  assert.equal(payload.story.spindle_inspected, true);

  story.reset();
  assert.equal(story.getState().revision, 0);
  assert.equal(story.getState().flags.spindle_inspected, false);
  assert.deepEqual(story.getRuntimeState().processedOperationIds, []);
  assert.deepEqual(story.listEffects(), []);

  story.loadSavePayload(payload);
  assert.equal(story.getState().mode, 'movement');
  assert.equal(story.getState().flags.spindle_inspected, true);
  assert.equal(story.getState().revision, 1);
});

test('acknowledging effects removes only the named records', () => {
  const engine = createStoryEngine();
  const story = engine.n.acrossTheCanopy;
  story.applyAction({ operationId: 'test:begin', type: 'begin' });
  story.applyAction({ operationId: 'test:advance', type: 'advance' });
  const effects = story.listEffects();
  assert.ok(effects.length >= 2);

  story.acknowledgeEffects([effects[0].effectId]);
  const remaining = story.listEffects();
  assert.equal(remaining.some((effect) => effect.effectId === effects[0].effectId), false);
  for (const effect of effects.slice(1)) {
    assert.equal(remaining.some((candidate) => candidate.effectId === effect.effectId), true);
  }
});
