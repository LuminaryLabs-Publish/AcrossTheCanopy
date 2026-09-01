import assert from 'node:assert/strict';
import test from 'node:test';

import { createStorageAdapter } from '../src/adapters/storage.js';

test('the memory storage adapter saves, loads, detects, and removes a slot', () => {
  const storage = createStorageAdapter({ storage: null, prefix: 'test:atc:' });
  const payload = {
    schema: 'atc.greybox.v1',
    checkpoint: 'atc:checkpoint/rows',
    story: { choice: null, flags: { spindle_inspected: true } },
    player: { position: [14, 57, -31], fov: 92 }
  };

  assert.equal(storage.has('autosave'), false);
  const envelope = storage.save('autosave', payload);
  assert.equal(envelope.schema, 'atc.storage-envelope/1');
  assert.equal(envelope.slotId, 'autosave');
  assert.deepEqual(envelope.payload, payload);
  assert.equal(storage.has('autosave'), true);
  assert.deepEqual(storage.load('autosave'), payload);

  assert.equal(storage.remove('autosave'), true);
  assert.equal(storage.has('autosave'), false);
  assert.equal(storage.load('autosave'), null);
  assert.equal(storage.remove('autosave'), false);
});

test('memory saves and loads are structured clones rather than shared references', () => {
  const storage = createStorageAdapter({ storage: null });
  const original = {
    story: { journal: ['Spindle knot recorded.'] },
    player: { position: [0, 87.62, 56], fov: 78 }
  };

  const envelope = storage.save('clone-proof', original);
  original.story.journal.push('Mutation after save.');
  original.player.position[0] = 999;
  envelope.payload.story.journal.push('Mutation through returned envelope.');

  const firstLoad = storage.load('clone-proof');
  assert.deepEqual(firstLoad, {
    story: { journal: ['Spindle knot recorded.'] },
    player: { position: [0, 87.62, 56], fov: 78 }
  });

  firstLoad.story.journal.push('Mutation after load.');
  firstLoad.player.position[1] = -999;
  assert.deepEqual(storage.load('clone-proof'), {
    story: { journal: ['Spindle knot recorded.'] },
    player: { position: [0, 87.62, 56], fov: 78 }
  });
});

test('separate memory adapters and prefixes do not leak save slots', () => {
  const first = createStorageAdapter({ storage: null, prefix: 'test:first:' });
  const second = createStorageAdapter({ storage: null, prefix: 'test:second:' });

  first.save('autosave', { owner: 'first' });
  assert.deepEqual(first.load('autosave'), { owner: 'first' });
  assert.equal(second.has('autosave'), false);
  assert.equal(second.load('autosave'), null);
});
