import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AUTHORED_OBJECTS,
  CAPTURE_BEATS,
  DEFAULT_TREE_COUNT,
  FOREST_SEED,
  PRIMITIVE_COLORS,
  createForestInstances
} from '../src/game/content.js';

const isInsideAuthoredRegion = ([x, , z]) => x > -44 && x < 84 && z > -142 && z < 82;

test('the forest is deterministic and contains the promised 2,300 trees', () => {
  const first = createForestInstances();
  const replay = createForestInstances();
  const alternate = createForestInstances({ seed: FOREST_SEED + 1 });

  assert.equal(first.length, DEFAULT_TREE_COUNT);
  assert.equal(first.length, 2300);
  assert.deepEqual(replay, first);
  assert.notDeepEqual(alternate, first);
  assert.equal(new Set(first.map((tree) => tree.id)).size, first.length);
  assert.equal(first[0].id, 'atc:tree/0000');
  assert.equal(first.at(-1).id, 'atc:tree/2299');

  for (const tree of first) {
    assert.equal(tree.position.every(Number.isFinite), true, `${tree.id} has a finite position`);
    assert.equal(tree.scale.every((value) => Number.isFinite(value) && value > 0), true, `${tree.id} has a positive scale`);
  }
});

test('procedural trees leave the authored adventure region clear', () => {
  const trees = createForestInstances();
  const intruders = trees.filter((tree) => isInsideAuthoredRegion(tree.position));

  assert.deepEqual(intruders, []);
});

test('authored primitives have stable unique IDs and cover the complete color language', () => {
  const ids = AUTHORED_OBJECTS.map((entry) => entry.id);
  const roles = new Set(AUTHORED_OBJECTS.map((entry) => entry.colorRole));

  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.every((id) => id.startsWith('atc:')), true);
  assert.deepEqual(
    [...roles].sort(),
    Object.keys(PRIMITIVE_COLORS).sort()
  );
});

test('the capture contract is exactly ten 30-second beats over five minutes', () => {
  assert.equal(CAPTURE_BEATS.length, 10);
  CAPTURE_BEATS.forEach((beat, index) => {
    assert.equal(beat.start, index * 30);
    assert.equal(beat.end, (index + 1) * 30);
    assert.equal(beat.end - beat.start, 30);
    assert.equal(AUTHORED_OBJECTS.some((entry) => entry.id === beat.targetId), true, `${beat.id} targets an authored object`);
  });
  assert.equal(CAPTURE_BEATS.at(-1).end, 300);
});
