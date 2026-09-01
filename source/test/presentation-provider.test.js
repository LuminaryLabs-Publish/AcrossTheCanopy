import assert from 'node:assert/strict';
import test from 'node:test';

import { validateRenderProvider } from 'nexusengine/domains/render/provider-contract';

import {
  AUTHORED_OBJECTS,
  DEFAULT_TREE_COUNT,
  PRIMITIVE_COLORS,
  createForestInstances
} from '../src/game/content.js';
import {
  assertPresentationPacket,
  buildPresentationConfig,
  createPresentationPacket
} from '../src/game/presentation-projection.js';
import { createInitialStoryState } from '../src/game/story-model.js';
import { createMockRenderProvider } from '../src/providers/mock-provider.js';

function makePresentation({ fov = 78, treeCount = DEFAULT_TREE_COUNT } = {}) {
  const story = createInitialStoryState();
  return {
    story,
    presentation: buildPresentationConfig({
      story,
      player: { position: [0, 87.62, 56] },
      camera: {
        position: [0, 87.62, 56],
        yaw: -0.18,
        pitch: -0.045,
        fov
      },
      focusId: story.focusId,
      treeCount,
      fps: 60
    })
  };
}

function makePacket({ fov = 78 } = {}) {
  const trees = createForestInstances();
  const { story, presentation } = makePresentation({ fov, treeCount: trees.length });
  const objects = AUTHORED_OBJECTS.map((object) => ({
    id: object.id,
    objectType: `greybox-${object.visual.shape}`,
    lifecycle: { status: 'active' },
    metadata: {
      label: object.label,
      colorRole: object.colorRole,
      visual: object.visual
    }
  }));
  const placements = AUTHORED_OBJECTS.map((object) => ({
    objectId: object.id,
    transform: {
      position: object.position,
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1]
    }
  }));
  return createPresentationPacket({
    revision: 7,
    elapsed: 12.5,
    output: { width: 854, height: 480, pixelRatio: 1 },
    presentation,
    objects,
    placements,
    trees,
    story
  });
}

test('presentation configuration clamps FOV and publishes a complete UI contract', () => {
  const belowMinimum = makePresentation({ fov: -20 }).presentation;
  const aboveMaximum = makePresentation({ fov: 240 }).presentation;

  assert.equal(belowMinimum.schema, 'atc.presentation-config/1');
  assert.equal(belowMinimum.camera.fov, 60);
  assert.equal(aboveMaximum.camera.fov, 120);
  assert.equal(belowMinimum.treeCount, 2300);

  const ids = new Set(belowMinimum.ui.map((descriptor) => descriptor.id));
  for (const requiredId of [
    'hud-location-panel',
    'hud-objective-panel',
    'hud-legend-panel',
    'hud-reticle',
    'hud-fov-panel',
    'hud-fov-bar',
    'hud-fov-value',
    'hud-stats'
  ]) {
    assert.equal(ids.has(requiredId), true, `missing UI descriptor ${requiredId}`);
  }

  const fovPanel = belowMinimum.ui.find((descriptor) => descriptor.id === 'hud-fov-panel');
  const fovBarAtMinimum = belowMinimum.ui.find((descriptor) => descriptor.id === 'hud-fov-bar');
  const fovBarAtMaximum = aboveMaximum.ui.find((descriptor) => descriptor.id === 'hud-fov-bar');
  assert.deepEqual(fovPanel.interaction, {
    type: 'set-fov',
    minimum: 60,
    maximum: 120,
    barX: 81,
    barWidth: 14.5
  });
  assert.equal(fovBarAtMinimum.value, 0);
  assert.equal(fovBarAtMaximum.value, 1);

  const legendSwatches = belowMinimum.ui.filter((descriptor) => descriptor.id.startsWith('legend-swatch-'));
  assert.equal(legendSwatches.length, Object.keys(PRIMITIVE_COLORS).length);
});

test('presentation packets preserve authored transforms and all 2,300 procedural trees', () => {
  const packet = makePacket();

  assert.equal(assertPresentationPacket(packet), packet);
  assert.equal(Object.isFrozen(packet), true);
  assert.equal(packet.schema, 'atc.presentation-packet/1');
  assert.equal(packet.revision, 7);
  assert.equal(packet.elapsed, 12.5);
  assert.equal(packet.camera.fov, 78);
  assert.equal(packet.trees.length, DEFAULT_TREE_COUNT);
  assert.equal(packet.trees.length, 2300);
  assert.equal(new Set(packet.trees.map((tree) => tree.id)).size, 2300);
  assert.equal(packet.objects.length, AUTHORED_OBJECTS.length);
  assert.deepEqual(packet.objects[0].transform.position, AUTHORED_OBJECTS[0].position);
  assert.deepEqual(packet.primitiveColors, PRIMITIVE_COLORS);

  assert.throws(
    () => assertPresentationPacket({ ...packet, camera: { ...packet.camera, fov: 59.99 } }),
    { name: 'RangeError', message: 'Presentation packet FOV must be between 60 and 120.' }
  );
  assert.throws(
    () => assertPresentationPacket({ ...packet, camera: { ...packet.camera, fov: 120.01 } }),
    { name: 'RangeError', message: 'Presentation packet FOV must be between 60 and 120.' }
  );
});

test('a validated mock provider snapshot can be restored into a replacement and continue rendering', async () => {
  const packet = makePacket();
  const primary = createMockRenderProvider();

  assert.doesNotThrow(() => validateRenderProvider(primary));
  await primary.initialize({ width: 854, height: 480 });
  await primary.beginFrame({ frame: 1 });
  const primaryPass = await primary.executePass({ packet });
  const primarySubmit = await primary.submitFrame();

  assert.equal(primaryPass.type, 'execute-pass');
  assert.equal(primaryPass.revision, 7);
  assert.equal(primaryPass.trees, 2300);
  assert.equal(primaryPass.objects, AUTHORED_OBJECTS.length);
  assert.equal(primarySubmit.revision, 7);

  const replacement = createMockRenderProvider();
  assert.doesNotThrow(() => validateRenderProvider(replacement));
  await replacement.loadSnapshot(primary.getSnapshot());
  await replacement.beginFrame({ frame: 2 });
  const replacementPass = await replacement.executePass({ packet });
  const replacementSubmit = await replacement.submitFrame();
  const replacementSnapshot = replacement.getSnapshot();

  assert.equal(replacementPass.type, 'execute-pass');
  assert.equal(replacementPass.revision, primaryPass.revision);
  assert.equal(replacementPass.trees, primaryPass.trees);
  assert.equal(replacementPass.objects, primaryPass.objects);
  assert.equal(replacementSubmit.frame, 2);
  assert.equal(replacementSubmit.revision, 7);
  assert.equal(replacementSnapshot.initialized, true);
  assert.equal(replacementSnapshot.frame, 2);
  assert.deepEqual(replacementSnapshot.packet, packet);
});
