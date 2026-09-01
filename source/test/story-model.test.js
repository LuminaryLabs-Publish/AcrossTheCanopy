import assert from 'node:assert/strict';
import test from 'node:test';

import {
  JOURNAL_ENTRIES,
  SAVE_SCHEMA
} from '../src/game/content.js';
import {
  applyStoryAction,
  createInitialStoryState,
  hydrateStoryState,
  storySavePayload
} from '../src/game/story-model.js';

function act(state, type, properties = {}) {
  return applyStoryAction(state, { type, ...properties });
}

function accepted(state, type, properties = {}) {
  const result = act(state, type, properties);
  assert.equal(result.accepted, true, `${type} should be accepted: ${result.reason ?? ''}`);
  return result.state;
}

function closeDialogue(state) {
  assert.equal(state.mode, 'dialogue');
  let next = state;
  let advances = 0;
  while (next.dialogue) {
    next = accepted(next, 'advance');
    advances += 1;
    assert.ok(advances < 20, 'dialogue should terminate');
  }
  assert.equal(next.mode, 'movement');
  return next;
}

function reachMarketBoard() {
  let state = createInitialStoryState();
  state = closeDialogue(accepted(state, 'begin'));
  state = closeDialogue(accepted(state, 'inspect', { targetId: 'atc:story/echo-spindle' }));
  state = closeDialogue(accepted(state, 'talk', { targetId: 'atc:npc/sela-oren' }));

  state = accepted(state, 'traverse', { targetId: 'atc:route/starter-branch' });
  state = accepted(state, 'traversal-complete', { routeId: 'atc:route/starter-branch' });
  state = accepted(state, 'climb', { targetId: 'atc:route/trunk-switchback' });
  state = accepted(state, 'traversal-complete', { routeId: 'atc:route/trunk-switchback' });

  state = closeDialogue(accepted(state, 'inspect', { targetId: 'atc:clue/crew-notch' }));
  state = closeDialogue(accepted(state, 'inspect', { targetId: 'atc:interact/rows-lantern' }));
  state = accepted(state, 'traverse', { targetId: 'atc:route/rows-market-bridge' });
  state = accepted(state, 'traversal-complete', { routeId: 'atc:route/rows-market-bridge' });
  state = closeDialogue(accepted(state, 'inspect', { targetId: 'atc:clue/market-route-board' }));
  return state;
}

function solveDescentLock(state) {
  let next = state;
  next = accepted(next, 'turn', { targetId: 'atc:puzzle/descent-lock/dial-a' });
  next = accepted(next, 'turn', { targetId: 'atc:puzzle/descent-lock/dial-b' });
  next = accepted(next, 'turn', { targetId: 'atc:puzzle/descent-lock/dial-c' });
  next = closeDialogue(accepted(next, 'submit'));
  assert.equal(next.flags.descent_lock_open, true);
  return next;
}

function reachStationChoice() {
  let state = solveDescentLock(reachMarketBoard());
  state = accepted(state, 'zipline', { targetId: 'atc:route/descent-line' });
  state = accepted(state, 'traversal-complete', { routeId: 'atc:route/descent-line' });
  state = closeDialogue(state);
  state = closeDialogue(accepted(state, 'inspect', { targetId: 'atc:story/station-console' }));
  return state;
}

function completeSlice(choiceTargetId) {
  let state = reachStationChoice();
  state = accepted(state, 'choose', { targetId: choiceTargetId });
  state = closeDialogue(accepted(state, 'confirm-choice'));
  state = accepted(state, 'return', { targetId: 'atc:route/station-return' });
  state = accepted(state, 'traversal-complete', { routeId: 'atc:route/station-return' });
  state = closeDialogue(accepted(state, 'talk', { targetId: 'atc:npc/sela-oren' }));
  return state;
}

test('answering Edda completes the full slice and changes the Rows', () => {
  const state = completeSlice('atc:choice/answer-beacon');

  assert.equal(state.completed, true);
  assert.equal(state.choice, 'answer_signal');
  assert.equal(state.world.rows_light_level, 0.5);
  assert.equal(state.world.deep_beacon_active, true);
  assert.equal(state.world.returned_to_rows, true);
  assert.equal(state.flags.return_dialogue_complete, true);
  assert.equal(Object.values(state.flags).every(Boolean), true);
  assert.equal(state.journal.includes(JOURNAL_ENTRIES.answer), true);
  assert.match(state.objective, /Prepare the Rows/);
  assert.equal(state.completedAtRevision, state.revision);
});

test('recovering the cell completes the full slice with the alternate consequence', () => {
  const state = completeSlice('atc:choice/recover-cell');

  assert.equal(state.completed, true);
  assert.equal(state.choice, 'recover_cell');
  assert.equal(state.world.rows_light_level, 1);
  assert.equal(state.world.deep_beacon_active, false);
  assert.equal(state.world.returned_to_rows, true);
  assert.equal(state.flags.return_dialogue_complete, true);
  assert.equal(Object.values(state.flags).every(Boolean), true);
  assert.equal(state.journal.includes(JOURNAL_ENTRIES.recover), true);
  assert.match(state.objective, /Keep the Rows safe/);
  assert.equal(state.completedAtRevision, state.revision);
});

test('a wrong lock attempt gives a recoverable hint and preserves the correct solution path', () => {
  let state = reachMarketBoard();
  state = accepted(state, 'submit');

  assert.equal(state.dialogue.id, 'puzzleWrong');
  assert.equal(state.puzzle.attempts, 1);
  assert.deepEqual(state.puzzle.dials, ['Ring', 'Bough', 'Lantern']);
  assert.equal(state.flags.descent_lock_open, false);
  assert.match(state.objective, /Bough \/ Lantern \/ Ring/);

  state = closeDialogue(state);
  state = solveDescentLock(state);
  assert.equal(state.puzzle.attempts, 2);
  assert.equal(state.flags.descent_lock_open, true);
});

test('save and hydrate preserve durable story state while clearing transient modes', () => {
  let state = reachStationChoice();
  state = accepted(state, 'choose', { targetId: 'atc:choice/answer-beacon' });
  state = closeDialogue(accepted(state, 'confirm-choice'));
  const payload = storySavePayload(state, { position: [50, 34, -109], fov: 140 });

  assert.equal(payload.schema, SAVE_SCHEMA);
  assert.equal(payload.player.fov, 120);
  assert.deepEqual(payload.player.position, [50, 34, -109]);

  const hydrated = hydrateStoryState(payload);
  assert.equal(hydrated.mode, 'movement');
  assert.equal(hydrated.dialogue, null);
  assert.equal(hydrated.traversal, null);
  assert.equal(hydrated.navigation, null);
  assert.equal(hydrated.choice, 'answer_signal');
  assert.deepEqual(hydrated.flags, state.flags);
  assert.deepEqual(hydrated.world, state.world);
  assert.deepEqual(hydrated.journal, state.journal);

  const lowFovPayload = storySavePayload(state, { fov: 1 });
  assert.equal(lowFovPayload.player.fov, 60);
  assert.throws(() => hydrateStoryState({ schema: 'atc.unknown' }), /Unsupported save schema/);
});

test('dialogue, traversal, choice, puzzle, journal, and navigation can all be cancelled safely', () => {
  let state = accepted(createInitialStoryState(), 'begin');
  state = accepted(state, 'cancel');
  assert.equal(state.mode, 'movement');
  assert.equal(state.dialogue, null);

  state = accepted(state, 'traverse', { targetId: 'atc:route/starter-branch' });
  state = accepted(state, 'cancel');
  assert.equal(state.mode, 'movement');
  assert.equal(state.traversal, null);

  state = accepted(state, 'toggle-journal');
  state = accepted(state, 'cancel');
  assert.equal(state.mode, 'movement');

  state = accepted(state, 'move-to', { targetId: 'atc:story/echo-spindle', points: [[0, 86, 56], [3, 85.2, 47]] });
  state = accepted(state, 'cancel');
  assert.equal(state.mode, 'movement');
  assert.equal(state.navigation, null);

  state = reachMarketBoard();
  state = accepted(state, 'turn', { targetId: 'atc:puzzle/descent-lock/dial-a' });
  state = accepted(state, 'cancel');
  assert.equal(state.mode, 'movement');
  assert.equal(state.dialogue, null);

  state = reachStationChoice();
  state = accepted(state, 'choose', { targetId: 'atc:choice/answer-beacon' });
  state = accepted(state, 'cancel');
  assert.equal(state.mode, 'movement');
  assert.equal(state.choicePrompt, null);
  assert.equal(state.choice, null);

  state = accepted(state, 'choose', { targetId: 'atc:choice/answer-beacon' });
  assert.equal(state.mode, 'choice');
});

test('pause can always be toggled off without losing durable state', () => {
  let state = closeDialogue(accepted(createInitialStoryState(), 'begin'));
  const objective = state.objective;
  state = accepted(state, 'toggle-pause');
  assert.equal(state.paused, true);

  const blocked = act(state, 'inspect', { targetId: 'atc:story/echo-spindle' });
  assert.equal(blocked.accepted, false);
  assert.equal(blocked.state.flags.spindle_inspected, false);

  state = accepted(blocked.state, 'toggle-pause');
  assert.equal(state.paused, false);
  assert.equal(state.objective, objective);
  state = accepted(state, 'inspect', { targetId: 'atc:story/echo-spindle' });
  assert.equal(state.mode, 'dialogue');
});
