import {
  CHECKPOINTS,
  DIALOGUE,
  JOURNAL_ENTRIES,
  OBJECT_BY_ID,
  SAVE_SCHEMA,
  STORY_FLAGS,
  routeAvailable
} from './content.js';

const clone = (value) => value === undefined ? undefined : structuredClone(value);
const DIAL_VALUES = Object.freeze(['Ring', 'Bough', 'Lantern']);
const SOLUTION = Object.freeze(['Bough', 'Lantern', 'Ring']);

function flagDefaults() {
  return Object.fromEntries(STORY_FLAGS.map((flag) => [flag, false]));
}

export function createInitialStoryState() {
  return {
    schema: SAVE_SCHEMA,
    revision: 0,
    mode: 'intro',
    locationId: 'atc:location/starter-perch',
    focusId: 'atc:trigger/spawn/starter-perch',
    objective: 'Begin The Upward Signal',
    checkpoint: CHECKPOINTS.starter.id,
    flags: flagDefaults(),
    choice: null,
    world: {
      rows_light_level: 0.25,
      deep_beacon_active: false,
      returned_to_rows: false
    },
    journal: [],
    dialogue: null,
    puzzle: {
      dials: ['Ring', 'Bough', 'Lantern'],
      attempts: 0
    },
    choicePrompt: null,
    feedback: 'Click the cyan start ring to begin.',
    traversal: null,
    navigation: null,
    paused: false,
    completed: false,
    completedAtRevision: null,
    lastAction: null
  };
}

function revise(state, patch, actionType) {
  return {
    ...state,
    ...clone(patch),
    revision: state.revision + 1,
    lastAction: actionType
  };
}

function appendJournal(state, entry) {
  return state.journal.includes(entry) ? state.journal : [...state.journal, entry];
}

function withFlag(state, flag, value = true) {
  return { ...state.flags, [flag]: value };
}

function dialogueState(dialogueId, onComplete = null) {
  const lines = DIALOGUE[dialogueId];
  if (!lines) throw new RangeError(`Unknown dialogue: ${dialogueId}`);
  return { id: dialogueId, lines: clone(lines), index: 0, onComplete };
}

function unavailable(state, message, actionType = 'unavailable') {
  return {
    state: revise(state, { feedback: message }, actionType),
    effects: [{ type: 'feedback', message }],
    accepted: false,
    reason: message
  };
}

function openDialogue(state, dialogueId, patch = {}, onComplete = null, actionType = 'dialogue') {
  return {
    state: revise(state, {
      ...clone(patch),
      mode: 'dialogue',
      dialogue: dialogueState(dialogueId, onComplete),
      feedback: 'Click, Space, or E to advance. Escape cancels.'
    }, actionType),
    effects: [{ type: 'dialogue-opened', dialogueId }],
    accepted: true
  };
}

function finishDialogue(state) {
  const onComplete = state.dialogue?.onComplete;
  let patch = { mode: 'movement', dialogue: null, feedback: 'Movement restored.' };
  const effects = [{ type: 'dialogue-closed' }];
  if (onComplete === 'slice-complete') {
    const journalEntry = state.choice === 'answer_signal' ? JOURNAL_ENTRIES.answer : JOURNAL_ENTRIES.recover;
    patch = {
      ...patch,
      checkpoint: CHECKPOINTS.complete.id,
      flags: withFlag(state, 'return_dialogue_complete'),
      journal: appendJournal(state, journalEntry),
      objective: state.choice === 'answer_signal' ? 'Prepare the Rows. Find another way to reach Edda.' : 'Keep the Rows safe. Decide whether silence can stand.',
      completed: true,
      completedAtRevision: state.revision + 1,
      feedback: 'Vertical slice complete. Autosave written.'
    };
    effects.push({ type: 'save', slotId: 'autosave' }, { type: 'slice-complete', choice: state.choice });
  }
  return { state: revise(state, patch, 'advance-dialogue'), effects, accepted: true };
}

function inspect(state, targetId) {
  switch (targetId) {
    case 'atc:story/echo-spindle':
      return openDialogue(state, 'spindle', {
        flags: withFlag(state, 'spindle_inspected'),
        journal: appendJournal(state, JOURNAL_ENTRIES.spindle),
        objective: 'Ask Sela about the spindle',
        focusId: targetId
      }, null, 'inspect-spindle');
    case 'atc:clue/crew-notch':
      if (!state.flags.sela_warning_heard) return unavailable(state, 'Sela may know why this old route matters.');
      return openDialogue(state, 'crewNotch', {
        flags: withFlag(state, 'crew_code_recorded'),
        journal: appendJournal(state, JOURNAL_ENTRIES.crewCode),
        objective: 'Reach the Hanging Rows',
        focusId: targetId
      }, null, 'inspect-crew-notch');
    case 'atc:interact/rows-lantern':
      return openDialogue(state, 'rowsLantern', {
        flags: withFlag(state, 'rows_need_known'),
        journal: appendJournal(state, JOURNAL_ENTRIES.rows),
        checkpoint: CHECKPOINTS.rows.id,
        objective: 'Find the descent route through Low Market',
        focusId: targetId
      }, null, 'inspect-rows-lantern');
    case 'atc:landmark/hanging-food':
      return openDialogue(state, 'hangingFood', { focusId: targetId }, null, 'inspect-hanging-food');
    case 'atc:clue/market-route-board':
      if (!state.flags.crew_code_recorded) return unavailable(state, 'The worn symbols mean nothing without the crew notch clue.');
      return openDialogue(state, 'marketBoard', {
        flags: withFlag(state, 'market_board_read'),
        objective: 'Open the descent lock',
        focusId: targetId
      }, null, 'inspect-market-board');
    case 'atc:story/station-console':
      if (!state.flags.station_reached) return unavailable(state, 'Reach the station platform before using its console.');
      return openDialogue(state, 'station', {
        flags: withFlag(state, 'station_signal_verified'),
        journal: appendJournal(state, JOURNAL_ENTRIES.station),
        objective: 'Choose: answer the signal or recover the sun-cell',
        focusId: targetId
      }, null, 'inspect-station-console');
    default:
      return unavailable(state, 'There is nothing more to inspect here.');
  }
}

function talk(state, targetId) {
  if (targetId !== 'atc:npc/sela-oren') return unavailable(state, 'No one answers.');
  if (state.choice && state.world.returned_to_rows) {
    return openDialogue(
      state,
      state.choice === 'answer_signal' ? 'selaAnswer' : 'selaRecover',
      { focusId: targetId },
      'slice-complete',
      'talk-sela-return'
    );
  }
  if (!state.flags.spindle_inspected) return unavailable(state, 'Inspect the orange echo spindle first.');
  return openDialogue(state, 'selaOpening', {
    flags: withFlag(state, 'sela_warning_heard'),
    objective: 'Follow the old crew route',
    focusId: targetId
  }, null, 'talk-sela-opening');
}

function startRoute(state, routeId) {
  const availability = routeAvailable(routeId, state);
  if (!availability.available) return unavailable(state, availability.reason);
  const mode = routeId === 'atc:route/descent-line' ? 'zipline' : routeId.includes('glide') ? 'glide' : routeId.includes('return') ? 'lift' : routeId.includes('trunk') ? 'climb' : 'walk';
  const next = revise(state, {
    mode: 'traversal',
    traversal: { routeId, mode, progress: 0, startedAtRevision: state.revision + 1 },
    navigation: null,
    feedback: `${mode.toUpperCase()} — Escape returns to the route start.`
  }, 'start-traversal');
  return { state: next, effects: [{ type: 'start-traversal', routeId, mode }], accepted: true };
}

function beginChoice(state, choice) {
  if (!state.flags.station_signal_verified) return unavailable(state, 'Verify the station signal before choosing.');
  if (state.choice) return unavailable(state, 'The sun-cell decision is already saved.');
  const prompt = choice === 'answer_signal'
    ? { choice, title: 'ANSWER THE SIGNAL', consequence: 'Leave the sun-cell in the beacon. The Rows remain on emergency light.' }
    : { choice, title: 'RECOVER THE SUN-CELL', consequence: 'Power the Hanging Rows for a season. The fresh signal will be silenced.' };
  return {
    state: revise(state, { mode: 'choice', choicePrompt: prompt, feedback: 'Confirm the consequence, or cancel.' }, 'begin-choice'),
    effects: [{ type: 'choice-opened', choice }],
    accepted: true
  };
}

function confirmChoice(state) {
  const choice = state.choicePrompt?.choice;
  if (!choice) return unavailable(state, 'No choice is waiting for confirmation.');
  const answer = choice === 'answer_signal';
  return openDialogue(state, answer ? 'answerSignal' : 'recoverCell', {
    choice,
    choicePrompt: null,
    world: {
      ...state.world,
      rows_light_level: answer ? 0.5 : 1,
      deep_beacon_active: answer
    },
    objective: 'Use the counterweight return to reach Sela',
    journal: appendJournal(state, answer ? JOURNAL_ENTRIES.answer : JOURNAL_ENTRIES.recover)
  }, null, 'confirm-choice');
}

function cycleDial(state, targetId) {
  if (!state.flags.market_board_read) return unavailable(state, 'Find the route code before turning the crew lock.');
  const index = ['atc:puzzle/descent-lock/dial-a', 'atc:puzzle/descent-lock/dial-b', 'atc:puzzle/descent-lock/dial-c'].indexOf(targetId);
  if (index < 0) return unavailable(state, 'That is not a lock dial.');
  const dials = [...state.puzzle.dials];
  dials[index] = DIAL_VALUES[(DIAL_VALUES.indexOf(dials[index]) + 1) % DIAL_VALUES.length];
  return {
    state: revise(state, { mode: 'puzzle', puzzle: { ...state.puzzle, dials }, feedback: `DIALS: ${dials.join(' / ')}` }, 'turn-dial'),
    effects: [{ type: 'dial-turned', index, value: dials[index] }],
    accepted: true
  };
}

function submitPuzzle(state) {
  if (!state.flags.market_board_read) return unavailable(state, 'The route board may explain this lock.');
  const solved = state.puzzle.dials.every((value, index) => value === SOLUTION[index]);
  if (!solved) {
    return openDialogue(state, 'puzzleWrong', {
      puzzle: { dials: ['Ring', 'Bough', 'Lantern'], attempts: state.puzzle.attempts + 1 },
      objective: 'Use the journal clue: Bough / Lantern / Ring'
    }, null, 'puzzle-wrong');
  }
  return openDialogue(state, 'puzzleSolved', {
    puzzle: { ...state.puzzle, attempts: state.puzzle.attempts + 1 },
    flags: withFlag(state, 'descent_lock_open'),
    objective: 'Ride the gravity line to the Old Descent Station'
  }, null, 'puzzle-solved');
}

function traversalComplete(state, routeId) {
  const patch = { mode: 'movement', traversal: null, feedback: 'Traversal complete. Movement restored.' };
  const effects = [{ type: 'traversal-complete', routeId }, { type: 'save', slotId: 'autosave' }];
  if (routeId === 'atc:route/descent-line') {
    patch.flags = withFlag(state, 'station_reached');
    patch.checkpoint = CHECKPOINTS.station.id;
    patch.objective = 'Inspect the station signal console';
    patch.locationId = 'atc:location/old-descent-station';
    patch.dialogue = dialogueState('descent');
    patch.mode = 'dialogue';
  }
  if (routeId === 'atc:route/station-return') {
    patch.world = { ...state.world, returned_to_rows: true };
    patch.checkpoint = CHECKPOINTS.rows.id;
    patch.objective = 'Speak with Sela and face the consequence';
    patch.locationId = 'atc:location/hanging-rows';
    patch.focusId = 'atc:npc/sela-oren';
  }
  return { state: revise(state, patch, 'traversal-complete'), effects, accepted: true };
}

export function applyStoryAction(current, action = {}) {
  const state = clone(current);
  const type = String(action.type ?? 'unknown');
  if (state.paused && !['toggle-pause', 'cancel', 'load-state'].includes(type)) return unavailable(state, 'The game is paused.');

  switch (type) {
    case 'begin':
      if (state.mode !== 'intro') return unavailable(state, 'The story has already begun.');
      return openDialogue(state, 'opening', {
        flags: withFlag(state, 'tutorial_movement_complete'),
        objective: 'Inspect the orange echo spindle'
      }, null, 'begin');
    case 'focus': {
      const targetId = action.targetId && OBJECT_BY_ID[action.targetId] ? action.targetId : null;
      return { state: revise(state, { focusId: targetId, feedback: targetId ? `${OBJECT_BY_ID[targetId].label} · ${OBJECT_BY_ID[targetId].interaction?.verb?.toUpperCase() ?? 'LOOK'}` : '' }, 'focus'), effects: [], accepted: true };
    }
    case 'inspect':
      return inspect(state, action.targetId);
    case 'talk':
      return talk(state, action.targetId);
    case 'traverse':
    case 'climb':
    case 'glide':
    case 'zipline':
    case 'return':
      return startRoute(state, action.targetId);
    case 'travel':
      return startRoute(state, action.routeId ?? 'atc:route/trunk-switchback');
    case 'turn':
      return cycleDial(state, action.targetId);
    case 'submit':
      return submitPuzzle(state);
    case 'choose':
      return beginChoice(state, action.targetId === 'atc:choice/answer-beacon' ? 'answer_signal' : 'recover_cell');
    case 'confirm-choice':
      return confirmChoice(state);
    case 'advance':
      if (!state.dialogue) return unavailable(state, 'There is no dialogue to advance.');
      if (state.dialogue.index >= state.dialogue.lines.length - 1) return finishDialogue(state);
      return {
        state: revise(state, { dialogue: { ...state.dialogue, index: state.dialogue.index + 1 } }, 'advance-dialogue'),
        effects: [{ type: 'dialogue-advanced', index: state.dialogue.index + 1 }],
        accepted: true
      };
    case 'toggle-journal':
      return {
        state: revise(state, { mode: state.mode === 'journal' ? 'movement' : 'journal', dialogue: state.mode === 'journal' ? state.dialogue : null, feedback: state.mode === 'journal' ? 'Movement restored.' : 'Journal open. Press J or Escape to close.' }, 'toggle-journal'),
        effects: [], accepted: true
      };
    case 'cancel':
      if (state.mode === 'traversal') {
        return { state: revise(state, { mode: 'movement', traversal: null, feedback: 'Traversal cancelled. Returned to its start.' }, 'cancel-traversal'), effects: [{ type: 'cancel-traversal' }], accepted: true };
      }
      return { state: revise(state, { mode: state.mode === 'intro' ? 'intro' : 'movement', dialogue: null, choicePrompt: null, traversal: null, navigation: null, feedback: state.mode === 'intro' ? state.feedback : 'Movement restored.' }, 'cancel'), effects: [{ type: 'interaction-cancelled' }], accepted: true };
    case 'toggle-pause':
      return { state: revise(state, { paused: !state.paused, feedback: state.paused ? 'Movement restored.' : 'Paused. Press P or Escape to resume.' }, 'toggle-pause'), effects: [], accepted: true };
    case 'traversal-progress':
      if (!state.traversal) return unavailable(state, 'No traversal is active.');
      return { state: revise(state, { traversal: { ...state.traversal, progress: Math.max(0, Math.min(1, Number(action.progress) || 0)) } }, 'traversal-progress'), effects: [], accepted: true };
    case 'traversal-complete':
      return traversalComplete(state, action.routeId ?? state.traversal?.routeId);
    case 'location-entered': {
      const checkpoint = action.locationId === 'atc:location/hanging-rows' ? CHECKPOINTS.rows.id : state.checkpoint;
      return { state: revise(state, { locationId: action.locationId, checkpoint }, 'location-entered'), effects: checkpoint !== state.checkpoint ? [{ type: 'save', slotId: 'autosave' }] : [], accepted: true };
    }
    case 'move-to':
      return { state: revise(state, { mode: 'navigation', navigation: { targetId: action.targetId, points: clone(action.points ?? []), segment: 0, progress: 0 }, feedback: 'Following a validated point-and-click route. Escape cancels.' }, 'move-to'), effects: [{ type: 'navigation-started', targetId: action.targetId }], accepted: true };
    case 'navigation-progress':
      if (!state.navigation) return unavailable(state, 'No click route is active.');
      return { state: revise(state, { navigation: { ...state.navigation, segment: action.segment, progress: action.progress } }, 'navigation-progress'), effects: [], accepted: true };
    case 'navigation-complete':
      return { state: revise(state, { mode: 'movement', navigation: null, feedback: 'Destination reached.' }, 'navigation-complete'), effects: [{ type: 'navigation-complete', targetId: state.navigation?.targetId }], accepted: true };
    case 'recover':
      return { state: revise(state, { mode: 'movement', traversal: null, navigation: null, dialogue: null, feedback: `Recovered to ${state.checkpoint}. Story state preserved.` }, 'recover'), effects: [{ type: 'recover', checkpoint: state.checkpoint }], accepted: true };
    default:
      return unavailable(state, action.reason ?? `Unavailable action: ${type}.`);
  }
}

export function storySavePayload(state, player = {}) {
  return {
    schema: SAVE_SCHEMA,
    checkpoint: state.checkpoint,
    player: {
      position: clone(player.position ?? CHECKPOINTS.starter.position),
      fov: Math.max(60, Math.min(120, Number(player.fov ?? 78)))
    },
    story: clone(state.flags),
    choice: state.choice,
    world: clone(state.world),
    objective: state.objective,
    journal: clone(state.journal),
    puzzle: clone(state.puzzle),
    completed: state.completed
  };
}

export function hydrateStoryState(payload) {
  if (!payload || payload.schema !== SAVE_SCHEMA) throw new TypeError(`Unsupported save schema: ${payload?.schema ?? 'missing'}.`);
  const initial = createInitialStoryState();
  const flags = { ...initial.flags, ...(payload.story ?? {}) };
  const checkpoint = Object.values(CHECKPOINTS).some((entry) => entry.id === payload.checkpoint) ? payload.checkpoint : CHECKPOINTS.starter.id;
  return {
    ...initial,
    revision: 1,
    mode: 'movement',
    checkpoint,
    flags,
    choice: payload.choice === 'answer_signal' || payload.choice === 'recover_cell' ? payload.choice : null,
    world: { ...initial.world, ...(payload.world ?? {}) },
    objective: String(payload.objective ?? initial.objective),
    journal: Array.isArray(payload.journal) ? [...new Set(payload.journal.map(String))] : [],
    puzzle: { ...initial.puzzle, ...(payload.puzzle ?? {}) },
    completed: payload.completed === true,
    completedAtRevision: payload.completed === true ? 1 : null,
    feedback: 'Save restored at a safe checkpoint.'
  };
}

export function activeDialogueLine(state) {
  return state.dialogue?.lines?.[state.dialogue.index] ?? null;
}

export function currentInteractionHint(state) {
  if (state.mode === 'intro') return 'CLICK THE CYAN RING TO BEGIN';
  if (state.mode === 'dialogue') return 'CLICK / SPACE / E — ADVANCE   ·   ESC — LEAVE';
  if (state.mode === 'choice') return 'CLICK CONFIRM OR ESCAPE';
  if (state.mode === 'journal') return 'J / ESC — CLOSE JOURNAL';
  if (state.mode === 'traversal' || state.mode === 'navigation') return 'ESC — CANCEL ROUTE';
  const target = state.focusId && OBJECT_BY_ID[state.focusId];
  return target?.interaction ? `${target.interaction.verb.toUpperCase()} · ${target.label}` : 'WASD MOVE · DRAG LOOK · CLICK TARGET · J JOURNAL';
}
