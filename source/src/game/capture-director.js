import {
  CAPTURE_BEATS,
  CHECKPOINTS,
  OBJECT_BY_ID,
  ROUTES
} from './content.js';

const CAPTURE_DURATION = 300;
const EPSILON = 1e-6;
const clone = (value) => value === undefined ? undefined : structuredClone(value);
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, Number(value)));

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function lerpVector(start, end, amount) {
  return [
    lerp(start[0], end[0], amount),
    lerp(start[1], end[1], amount),
    lerp(start[2], end[2], amount)
  ];
}

function addVector(left, right) {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function subtractVector(left, right) {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function scaleVector(value, scalar) {
  return [value[0] * scalar, value[1] * scalar, value[2] * scalar];
}

function timedPoint(time, position) {
  return Object.freeze({ time, position: Object.freeze([...position]) });
}

/*
 * The route points below are the authored paths from content.js. Extra points only
 * join an interaction stance to the next route anchor. The track is absolute, so
 * a capture produces the same framing at 10 fps, 30 fps, or after a seek.
 */
const POSITION_TRACK = Object.freeze([
  timedPoint(0, CHECKPOINTS.starter.position),
  timedPoint(25, CHECKPOINTS.starter.position),
  timedPoint(30, [1.2, 86, 51]),
  timedPoint(55, [1.2, 86, 51]),
  timedPoint(60, [-1.5, 86, 49]),
  timedPoint(89, [-1.5, 86, 49]),
  timedPoint(90.2, ROUTES['atc:route/starter-branch'].path[0]),
  timedPoint(93.4, ROUTES['atc:route/starter-branch'].path[1]),
  timedPoint(96.2, ROUTES['atc:route/starter-branch'].path[2]),
  timedPoint(97, ROUTES['atc:route/trunk-switchback'].path[0]),
  timedPoint(100, ROUTES['atc:route/trunk-switchback'].path[1]),
  timedPoint(103.2, ROUTES['atc:route/trunk-switchback'].path[2]),
  timedPoint(104.4, [13.6, 78.4, 7]),
  timedPoint(116.2, [13.6, 78.4, 7]),
  timedPoint(117.7, ROUTES['atc:route/trunk-switchback'].path[3]),
  timedPoint(119.7, ROUTES['atc:route/trunk-switchback'].path[4]),
  timedPoint(121, [6.5, 72, -20]),
  timedPoint(145, [6.5, 72, -20]),
  timedPoint(149.5, ROUTES['atc:route/rows-market-bridge'].path[0]),
  timedPoint(153, ROUTES['atc:route/rows-market-bridge'].path[1]),
  timedPoint(156, ROUTES['atc:route/rows-market-bridge'].path[2]),
  timedPoint(159, ROUTES['atc:route/rows-market-bridge'].path[3]),
  timedPoint(160, [26, 62, -56.5]),
  timedPoint(176, [26, 62, -56.5]),
  timedPoint(181.5, [33, 61.2, -59.5]),
  timedPoint(209, [33, 61.2, -59.5]),
  timedPoint(210.3, ROUTES['atc:route/descent-line'].path[0]),
  timedPoint(216.2, ROUTES['atc:route/descent-line'].path[1]),
  timedPoint(222.5, ROUTES['atc:route/descent-line'].path[2]),
  timedPoint(229, ROUTES['atc:route/descent-line'].path[3]),
  timedPoint(240, [48, 34.2, -104]),
  timedPoint(269.7, [48, 34.2, -104]),
  timedPoint(270.2, [48, 34.2, -104]),
  timedPoint(272, ROUTES['atc:route/station-return'].path[0]),
  timedPoint(276.5, ROUTES['atc:route/station-return'].path[1]),
  timedPoint(282.5, ROUTES['atc:route/station-return'].path[2]),
  timedPoint(300, ROUTES['atc:route/station-return'].path[2])
]);

const FOV_TRACK = Object.freeze([
  [0, 72],
  [30, 78],
  [60, 82],
  [90, 86],
  [120, 76],
  [150, 80],
  [180, 84],
  [210, 96],
  [240, 72],
  [270, 82],
  [300, 78]
]);

const CAMERA_TARGETS = Object.freeze({
  opening: [0, 86.2, 54],
  spindle: [3, 86.1, 47],
  sela: [-4, 86.2, 45],
  notch: [13, 79, 5],
  rows: [4, 73.1, -24],
  market: [24, 63, -58],
  puzzle: [33, 61.2, -64],
  descent: [46, 36, -96],
  station: [50, 35.2, -109],
  consequence: [7, 72.2, -22]
});

const MOVING_INTERVALS = Object.freeze([
  [25, 30, null],
  [55, 60, null],
  [89, 96.2, 'atc:route/starter-branch'],
  [97, 104.4, 'atc:route/trunk-switchback'],
  [116.2, 121, 'atc:route/trunk-switchback'],
  [145, 159, 'atc:route/rows-market-bridge'],
  [176, 181.5, null],
  [209, 229, 'atc:route/descent-line'],
  [229, 240, null],
  [269.7, 282.5, 'atc:route/station-return']
]);

function sampleTrack(track, time, valueIndex = null) {
  const firstTime = valueIndex === null ? track[0].time : track[0][0];
  const firstValue = valueIndex === null ? track[0].position : track[0][1];
  if (time <= firstTime) return clone(firstValue);
  for (let index = 1; index < track.length; index += 1) {
    const previousTime = valueIndex === null ? track[index - 1].time : track[index - 1][0];
    const currentTime = valueIndex === null ? track[index].time : track[index][0];
    if (time <= currentTime) {
      const previousValue = valueIndex === null ? track[index - 1].position : track[index - 1][1];
      const currentValue = valueIndex === null ? track[index].position : track[index][1];
      const amount = clamp((time - previousTime) / Math.max(EPSILON, currentTime - previousTime), 0, 1);
      return Array.isArray(previousValue)
        ? lerpVector(previousValue, currentValue, amount)
        : lerp(previousValue, currentValue, amount);
    }
  }
  const last = track.at(-1);
  return clone(valueIndex === null ? last.position : last[1]);
}

function positionAt(time) {
  return sampleTrack(POSITION_TRACK, clamp(time, 0, CAPTURE_DURATION));
}

function velocityAt(time) {
  const before = positionAt(Math.max(0, time - 0.05));
  const after = positionAt(Math.min(CAPTURE_DURATION, time + 0.05));
  return scaleVector(subtractVector(after, before), 10);
}

function routeAt(time) {
  return MOVING_INTERVALS.find(([start, end]) => time >= start && time < end)?.[2] ?? null;
}

function beatAt(time) {
  const safeTime = clamp(time, 0, CAPTURE_DURATION);
  if (safeTime >= CAPTURE_DURATION) return CAPTURE_BEATS.at(-1);
  return CAPTURE_BEATS.find((beat) => safeTime >= beat.start && safeTime < beat.end) ?? CAPTURE_BEATS[0];
}

function cameraAt(time, playerPosition) {
  const beat = beatAt(time);
  const moving = MOVING_INTERVALS.some(([start, end]) => time >= start && time < end);
  const ahead = positionAt(Math.min(CAPTURE_DURATION, time + 1.35));
  const authoredTarget = CAMERA_TARGETS[beat.id] ?? OBJECT_BY_ID[beat.targetId]?.position ?? ahead;
  const target = moving && Math.hypot(ahead[0] - playerPosition[0], ahead[2] - playerPosition[2]) > 0.35
    ? addVector(ahead, [0, 1.25, 0])
    : authoredTarget;
  const position = addVector(playerPosition, [0, 1.62, 0]);
  const direction = subtractVector(target, position);
  const horizontal = Math.max(EPSILON, Math.hypot(direction[0], direction[2]));
  const sway = Math.sin(time * 0.37) * 0.012 + Math.sin(time * 0.113) * 0.007;
  return {
    position,
    yaw: Math.atan2(-direction[0], -direction[2]) + sway,
    pitch: clamp(Math.atan2(direction[1], horizontal) + Math.sin(time * 0.29) * 0.006, -1.15, 0.82),
    focusId: beat.targetId,
    captureTime: time
  };
}

function event(time, id, action, ready = () => true) {
  return Object.freeze({ time, id, action: Object.freeze(clone(action)), ready });
}

function storyIsDialogue(story, id, index) {
  return story?.mode === 'dialogue' && story.dialogue?.id === id && story.dialogue?.index === index;
}

function advance(time, dialogueId, index) {
  return event(time, `${dialogueId}/advance/${index}`, { type: 'advance' }, (story) => storyIsDialogue(story, dialogueId, index));
}

const TIMELINE = Object.freeze([
  event(0.5, 'opening/focus', { type: 'focus', targetId: 'atc:trigger/spawn/starter-perch' }),
  event(2, 'opening/begin', { type: 'begin', targetId: 'atc:trigger/spawn/starter-perch' }, (story) => story?.mode === 'intro'),
  advance(12, 'opening', 0),
  advance(21, 'opening', 1),

  event(30.2, 'spindle/focus', { type: 'focus', targetId: 'atc:story/echo-spindle' }, (story) => story?.mode === 'movement'),
  event(31, 'spindle/inspect', { type: 'inspect', targetId: 'atc:story/echo-spindle' }, (story) => story?.mode === 'movement' && !story.flags.spindle_inspected),
  advance(39, 'spindle', 0),
  advance(47, 'spindle', 1),
  advance(56, 'spindle', 2),

  event(60.2, 'sela/focus', { type: 'focus', targetId: 'atc:npc/sela-oren' }, (story) => story?.mode === 'movement'),
  event(61, 'sela/talk', { type: 'talk', targetId: 'atc:npc/sela-oren' }, (story) => story?.mode === 'movement' && story.flags.spindle_inspected && !story.flags.sela_warning_heard),
  advance(64.5, 'selaOpening', 0),
  advance(68, 'selaOpening', 1),
  advance(71.5, 'selaOpening', 2),
  advance(75, 'selaOpening', 3),
  advance(78.5, 'selaOpening', 4),
  advance(82, 'selaOpening', 5),
  advance(85.5, 'selaOpening', 6),
  advance(89, 'selaOpening', 7),

  event(90, 'starter-branch/focus', { type: 'focus', targetId: 'atc:route/starter-branch' }, (story) => story?.mode === 'movement'),
  event(90.2, 'starter-branch/start', { type: 'traverse', targetId: 'atc:route/starter-branch' }, (story) => story?.mode === 'movement' && story.flags.sela_warning_heard),
  event(93.4, 'starter-branch/progress', { type: 'traversal-progress', progress: 0.55 }, (story) => story?.traversal?.routeId === 'atc:route/starter-branch'),
  event(96.2, 'starter-branch/complete', { type: 'traversal-complete', routeId: 'atc:route/starter-branch' }, (story) => story?.traversal?.routeId === 'atc:route/starter-branch'),
  event(96.4, 'trunk/location', { type: 'location-entered', locationId: 'atc:location/trunk-route' }, (story) => story?.mode === 'movement'),
  event(96.7, 'trunk-switchback/focus', { type: 'focus', targetId: 'atc:route/trunk-switchback' }, (story) => story?.mode === 'movement'),
  event(97, 'trunk-switchback/start', { type: 'climb', targetId: 'atc:route/trunk-switchback' }, (story) => story?.mode === 'movement'),
  event(103.2, 'trunk-switchback/progress', { type: 'traversal-progress', progress: 0.52 }, (story) => story?.traversal?.routeId === 'atc:route/trunk-switchback'),
  event(104.2, 'crew-notch/focus', { type: 'focus', targetId: 'atc:clue/crew-notch' }, (story) => story?.traversal?.routeId === 'atc:route/trunk-switchback'),
  event(104.5, 'crew-notch/inspect', { type: 'inspect', targetId: 'atc:clue/crew-notch' }, (story) => story?.flags.sela_warning_heard && !story.flags.crew_code_recorded),
  advance(110, 'crewNotch', 0),
  advance(116, 'crewNotch', 1),
  event(117.8, 'trunk-switchback/progress-final', { type: 'traversal-progress', progress: 0.88 }, (story) => story?.traversal?.routeId === 'atc:route/trunk-switchback'),
  event(119.7, 'trunk-switchback/complete', { type: 'traversal-complete', routeId: 'atc:route/trunk-switchback' }, (story) => story?.traversal?.routeId === 'atc:route/trunk-switchback' && story.flags.crew_code_recorded),

  event(120.1, 'rows/location', { type: 'location-entered', locationId: 'atc:location/hanging-rows' }, (story) => story?.mode === 'movement'),
  event(120.4, 'rows-lantern/focus', { type: 'focus', targetId: 'atc:interact/rows-lantern' }, (story) => story?.mode === 'movement'),
  event(121, 'rows-lantern/inspect', { type: 'inspect', targetId: 'atc:interact/rows-lantern' }, (story) => story?.mode === 'movement' && !story.flags.rows_need_known),
  advance(129, 'rowsLantern', 0),
  advance(137, 'rowsLantern', 1),
  advance(145, 'rowsLantern', 2),

  event(149.2, 'market-bridge/focus', { type: 'focus', targetId: 'atc:route/rows-market-bridge' }, (story) => story?.mode === 'movement'),
  event(149.5, 'market-bridge/start', { type: 'traverse', targetId: 'atc:route/rows-market-bridge' }, (story) => story?.mode === 'movement' && story.flags.rows_need_known),
  event(154.5, 'market-bridge/progress', { type: 'traversal-progress', progress: 0.55 }, (story) => story?.traversal?.routeId === 'atc:route/rows-market-bridge'),
  event(159, 'market-bridge/complete', { type: 'traversal-complete', routeId: 'atc:route/rows-market-bridge' }, (story) => story?.traversal?.routeId === 'atc:route/rows-market-bridge'),
  event(159.2, 'market/location', { type: 'location-entered', locationId: 'atc:location/low-market' }, (story) => story?.mode === 'movement'),
  event(159.5, 'market-board/focus', { type: 'focus', targetId: 'atc:clue/market-route-board' }, (story) => story?.mode === 'movement'),
  event(160, 'market-board/inspect', { type: 'inspect', targetId: 'atc:clue/market-route-board' }, (story) => story?.mode === 'movement' && story.flags.crew_code_recorded && !story.flags.market_board_read),
  advance(168, 'marketBoard', 0),
  advance(176, 'marketBoard', 1),

  event(181, 'dial-a/focus', { type: 'focus', targetId: 'atc:puzzle/descent-lock/dial-a' }, (story) => story?.mode === 'movement'),
  event(182, 'dial-a/turn', { type: 'turn', targetId: 'atc:puzzle/descent-lock/dial-a' }, (story) => story?.flags.market_board_read && story.puzzle.dials.join('/') === 'Ring/Bough/Lantern'),
  event(186, 'dial-b/turn', { type: 'turn', targetId: 'atc:puzzle/descent-lock/dial-b' }, (story) => story?.puzzle.dials.join('/') === 'Bough/Bough/Lantern'),
  event(190, 'dial-c/turn', { type: 'turn', targetId: 'atc:puzzle/descent-lock/dial-c' }, (story) => story?.puzzle.dials.join('/') === 'Bough/Lantern/Lantern'),
  event(193.5, 'lock-submit/focus', { type: 'focus', targetId: 'atc:puzzle/descent-lock/submit' }, (story) => story?.puzzle.dials.join('/') === 'Bough/Lantern/Ring'),
  event(194, 'lock-submit', { type: 'submit', targetId: 'atc:puzzle/descent-lock/submit' }, (story) => !story?.flags.descent_lock_open && story?.puzzle.dials.join('/') === 'Bough/Lantern/Ring'),
  advance(199, 'puzzleSolved', 0),
  advance(204, 'puzzleSolved', 1),

  event(210, 'descent-line/focus', { type: 'focus', targetId: 'atc:route/descent-line' }, (story) => story?.mode === 'movement'),
  event(210.3, 'descent-line/start', { type: 'zipline', targetId: 'atc:route/descent-line' }, (story) => story?.mode === 'movement' && story.flags.descent_lock_open),
  event(219.5, 'descent-line/progress', { type: 'traversal-progress', progress: 0.52 }, (story) => story?.traversal?.routeId === 'atc:route/descent-line'),
  event(225, 'descent-line/progress-final', { type: 'traversal-progress', progress: 0.84 }, (story) => story?.traversal?.routeId === 'atc:route/descent-line'),
  event(229, 'descent-line/complete', { type: 'traversal-complete', routeId: 'atc:route/descent-line' }, (story) => story?.traversal?.routeId === 'atc:route/descent-line'),
  advance(234, 'descent', 0),
  advance(239, 'descent', 1),

  event(240, 'station-console/focus', { type: 'focus', targetId: 'atc:story/station-console' }, (story) => story?.mode === 'movement'),
  event(240.2, 'station-console/inspect', { type: 'inspect', targetId: 'atc:story/station-console' }, (story) => story?.mode === 'movement' && story.flags.station_reached && !story.flags.station_signal_verified),
  advance(243.3, 'station', 0),
  advance(246.4, 'station', 1),
  advance(249.5, 'station', 2),
  advance(252.6, 'station', 3),
  advance(255.7, 'station', 4),
  event(256.1, 'answer-beacon/focus', { type: 'focus', targetId: 'atc:choice/answer-beacon' }, (story) => story?.mode === 'movement'),
  event(256.2, 'answer-beacon/choose', { type: 'choose', targetId: 'atc:choice/answer-beacon' }, (story) => story?.mode === 'movement' && story.flags.station_signal_verified && !story.choice),
  event(256.8, 'answer-beacon/confirm', { type: 'confirm-choice' }, (story) => story?.mode === 'choice' && story.choicePrompt?.choice === 'answer_signal'),
  advance(260, 'answerSignal', 0),
  advance(263.2, 'answerSignal', 1),
  advance(266.4, 'answerSignal', 2),
  advance(269.6, 'answerSignal', 3),

  event(270, 'station-return/focus', { type: 'focus', targetId: 'atc:route/station-return' }, (story) => story?.mode === 'movement'),
  event(270.2, 'station-return/start', { type: 'return', targetId: 'atc:route/station-return' }, (story) => story?.mode === 'movement' && story.choice === 'answer_signal'),
  event(276.5, 'station-return/progress', { type: 'traversal-progress', progress: 0.55 }, (story) => story?.traversal?.routeId === 'atc:route/station-return'),
  event(282.5, 'station-return/complete', { type: 'traversal-complete', routeId: 'atc:route/station-return' }, (story) => story?.traversal?.routeId === 'atc:route/station-return'),
  event(282.8, 'sela-return/focus', { type: 'focus', targetId: 'atc:npc/sela-oren' }, (story) => story?.mode === 'movement' && story.world.returned_to_rows),
  event(283, 'sela-return/talk', { type: 'talk', targetId: 'atc:npc/sela-oren' }, (story) => story?.mode === 'movement' && story.world.returned_to_rows && !story.completed),
  advance(288, 'selaAnswer', 0),
  advance(293, 'selaAnswer', 1),
  advance(298.5, 'selaAnswer', 2)
]);

function validateCaptureContract() {
  if (CAPTURE_BEATS.length !== 10) throw new Error('The capture director requires exactly ten beats.');
  CAPTURE_BEATS.forEach((beat, index) => {
    if (beat.start !== index * 30 || beat.end !== (index + 1) * 30) {
      throw new Error(`Capture beat ${beat.id} must occupy exactly 30 seconds.`);
    }
  });
  if (CAPTURE_BEATS.at(-1).end !== CAPTURE_DURATION) throw new Error('The capture must be exactly 300 seconds.');
  for (let index = 1; index < TIMELINE.length; index += 1) {
    if (TIMELINE[index].time < TIMELINE[index - 1].time) throw new Error('Capture timeline actions must be chronological.');
  }
}

export function createCaptureDirector({ dispatch, setPlayer, setCamera, setFov, getStory }) {
  if (typeof dispatch !== 'function') throw new TypeError('Capture director requires dispatch(action).');
  if (typeof setPlayer !== 'function') throw new TypeError('Capture director requires setPlayer(descriptor).');
  if (typeof setCamera !== 'function') throw new TypeError('Capture director requires setCamera(descriptor).');
  if (typeof setFov !== 'function') throw new TypeError('Capture director requires setFov(value).');
  if (typeof getStory !== 'function') throw new TypeError('Capture director requires getStory().');
  validateCaptureContract();

  const dispatched = new Set();
  let currentTime = 0;
  let previousTime = -EPSILON;
  let lastFov = null;
  let lastPlayer = null;
  let lastCamera = null;

  function applyVisualTrack(time) {
    const position = positionAt(time);
    const velocity = velocityAt(time);
    const routeId = routeAt(time);
    const camera = cameraAt(time, position);
    const fov = clamp(sampleTrack(FOV_TRACK, time, 1), 60, 120);

    lastPlayer = {
      position,
      velocity,
      routeId,
      captureTime: time
    };
    lastCamera = camera;
    setPlayer(clone(lastPlayer));
    setCamera(clone(lastCamera));
    if (lastFov === null || Math.abs(lastFov - fov) >= 0.025 || time >= CAPTURE_DURATION) {
      lastFov = fov;
      setFov(fov);
    }
  }

  function emitReadyActions(time) {
    for (let sequence = 0; sequence < TIMELINE.length; sequence += 1) {
      const cue = TIMELINE[sequence];
      if (cue.time > time + EPSILON || dispatched.has(cue.id)) continue;
      const story = getStory();
      if (!cue.ready(story)) break;
      const action = {
        operationId: `atc:capture/${cue.id}`,
        sequence: sequence + 1,
        captureTime: cue.time,
        ...clone(cue.action)
      };
      dispatched.add(cue.id);
      dispatch(action);
    }
  }

  function update(time, delta = 0) {
    const requestedTime = Number(time);
    if (!Number.isFinite(requestedTime)) throw new TypeError('Capture time must be finite.');
    const safeDelta = Math.max(0, Number(delta) || 0);
    const nextTime = clamp(requestedTime, 0, CAPTURE_DURATION);

    if (nextTime + EPSILON < previousTime) reset();
    currentTime = nextTime;
    applyVisualTrack(currentTime);
    emitReadyActions(currentTime);
    previousTime = currentTime;
    return snapshot(safeDelta);
  }

  function snapshot(delta = 0) {
    const beat = beatAt(currentTime);
    const story = getStory();
    return {
      schema: 'atc.capture-director/1',
      enabled: true,
      time: currentTime,
      delta: Math.max(0, Number(delta) || 0),
      duration: CAPTURE_DURATION,
      beatIndex: CAPTURE_BEATS.indexOf(beat),
      beat: clone(beat),
      completed: currentTime >= CAPTURE_DURATION && story?.completed === true,
      dispatchedOperationIds: TIMELINE
        .filter((cue) => dispatched.has(cue.id))
        .map((cue) => `atc:capture/${cue.id}`),
      pendingActionCount: TIMELINE.length - dispatched.size,
      player: clone(lastPlayer),
      camera: clone(lastCamera),
      fov: lastFov,
      storyRevision: Number(story?.revision ?? 0),
      storyCompleted: story?.completed === true
    };
  }

  function reset() {
    dispatched.clear();
    currentTime = 0;
    previousTime = -EPSILON;
    lastFov = null;
    lastPlayer = null;
    lastCamera = null;
    return snapshot(0);
  }

  return Object.freeze({ update, snapshot, reset });
}

export default createCaptureDirector;
