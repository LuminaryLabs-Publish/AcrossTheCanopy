import assert from 'node:assert/strict';
import test from 'node:test';

import { createCaptureDirector } from '../src/game/capture-director.js';
import { applyStoryAction, createInitialStoryState } from '../src/game/story-model.js';

test('the five-minute director completes the real story with ten readable beats', () => {
  let story = createInitialStoryState();
  let player = null;
  let camera = null;
  let fov = null;
  const rejected = [];
  const director = createCaptureDirector({
    dispatch(action) {
      const result = applyStoryAction(story, action);
      if (!result.accepted) rejected.push({ action, reason: result.reason });
      story = result.state;
    },
    setPlayer(value) { player = structuredClone(value); },
    setCamera(value) { camera = structuredClone(value); },
    setFov(value) { fov = value; },
    getStory: () => structuredClone(story)
  });

  for (let frame = 0; frame <= 3000; frame += 1) director.update(frame / 10, 0.1);
  const snapshot = director.snapshot();

  assert.deepEqual(rejected, []);
  assert.equal(story.completed, true);
  assert.equal(story.choice, 'answer_signal');
  assert.equal(Object.values(story.flags).every(Boolean), true);
  assert.equal(snapshot.duration, 300);
  assert.equal(snapshot.beatIndex, 9);
  assert.equal(snapshot.pendingActionCount, 0);
  assert.equal(snapshot.completed, true);
  assert.equal(snapshot.dispatchedOperationIds.length, 86);
  assert.equal(player.captureTime, 300);
  assert.equal(camera.captureTime, 300);
  assert.ok(fov >= 60 && fov <= 120);
});
