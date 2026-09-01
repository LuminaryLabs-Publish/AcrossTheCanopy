export const GAME_ID = 'across-the-canopy';
export const SAVE_SCHEMA = 'atc.greybox.v1';
export const NEXUS_COMMIT = '8a60167fc945109408851c586a9355b1147438d5';
export const FOREST_SEED = 41731;
export const DEFAULT_TREE_COUNT = 2300;

export const PRIMITIVE_COLORS = Object.freeze({
  structure: '#7B8087',
  traversal: '#2D8CFF',
  safe: '#35C76F',
  interactable: '#FFD23F',
  story: '#FF8A2A',
  npc: '#A767E5',
  hazard: '#E5484D',
  trigger: '#32D5FF'
});

export const STORY_FLAGS = Object.freeze([
  'tutorial_movement_complete',
  'spindle_inspected',
  'sela_warning_heard',
  'crew_code_recorded',
  'rows_need_known',
  'market_board_read',
  'descent_lock_open',
  'station_reached',
  'station_signal_verified',
  'return_dialogue_complete'
]);

export const LOCATIONS = Object.freeze([
  { id: 'atc:location/starter-perch', label: 'Starter Perch', center: [0, 84, 48], radius: 24, elevation: 'L0 · HIGH CANOPY' },
  { id: 'atc:location/trunk-route', label: 'Branch & Trunk Route', center: [6, 78, 8], radius: 34, elevation: 'L1 · UPPER TRUNK' },
  { id: 'atc:location/hanging-rows', label: 'Hanging Rows', center: [8, 70, -24], radius: 26, elevation: 'L2 · SAFE CANOPY' },
  { id: 'atc:location/low-market', label: 'Low Market', center: [28, 60, -60], radius: 30, elevation: 'L3 · LOWER HUB' },
  { id: 'atc:location/old-descent-station', label: 'Old Descent Station', center: [50, 32, -105], radius: 26, elevation: 'L4 · SERVICE DEPTH' }
]);

export const CHECKPOINTS = Object.freeze({
  starter: { id: 'atc:trigger/spawn/starter-perch', position: [0, 86, 56] },
  rows: { id: 'atc:checkpoint/hanging-rows', position: [8, 71, -20] },
  station: { id: 'atc:checkpoint/descent-station', position: [46, 36, -96] },
  complete: { id: 'atc:checkpoint/slice-complete', position: [8, 71, -20] }
});

export const ROUTES = Object.freeze({
  'atc:route/starter-branch': {
    id: 'atc:route/starter-branch', label: 'Starter Branch', mode: 'walk', colorRole: 'traversal',
    path: [[0, 86, 56], [0, 85, 42], [0, 84, 32]]
  },
  'atc:route/trunk-switchback': {
    id: 'atc:route/trunk-switchback', label: 'Trunk Switchback', mode: 'climb', colorRole: 'traversal',
    path: [[0, 84, 32], [8, 82, 22], [16, 78, 10], [13, 75, -2], [8, 72, -12]]
  },
  'atc:route/high-glide': {
    id: 'atc:route/high-glide', label: 'High Glide', mode: 'glide', colorRole: 'traversal',
    path: [[-5, 79, 9], [-8, 76, -2], [-8, 72, -14]]
  },
  'atc:route/rows-market-bridge': {
    id: 'atc:route/rows-market-bridge', label: 'Market Bridge', mode: 'walk', colorRole: 'traversal',
    path: [[8, 72, -12], [18, 68, -40], [22, 64, -50], [28, 61, -56]]
  },
  'atc:route/rows-market-glide': {
    id: 'atc:route/rows-market-glide', label: 'Market Glide', mode: 'glide', colorRole: 'traversal',
    path: [[4, 70, -40], [8, 66, -46], [14, 61, -52]]
  },
  'atc:route/descent-line': {
    id: 'atc:route/descent-line', label: 'Gravity Descent Line', mode: 'zipline', colorRole: 'traversal',
    requires: 'descent_lock_open', path: [[38, 59, -76], [42, 50, -84], [46, 42, -91], [46, 36, -96]]
  },
  'atc:route/station-return': {
    id: 'atc:route/station-return', label: 'Counterweight Return', mode: 'lift', colorRole: 'traversal',
    requires: 'choice', path: [[44, 35, -94], [32, 52, -66], [6, 71, -18]]
  }
});

const object = (id, label, position, colorRole, visual, interaction = null, extra = {}) => Object.freeze({
  id, label, position, colorRole, visual, interaction, ...extra
});

export const AUTHORED_OBJECTS = Object.freeze([
  object('atc:player/ryn', 'Ryn', [0, 86, 56], 'trigger', { shape: 'capsule', size: [0.8, 1.8, 0.8], hidden: true }),
  object('atc:structure/starter-perch', 'Starter Perch', [0, 84, 48], 'structure', { shape: 'platform', size: [19, 2.2, 22], rotation: [0, 0.08, 0] }),
  object('atc:trigger/spawn/starter-perch', 'Begin The Upward Signal', [0, 86, 56], 'trigger', { shape: 'ring', size: [3.2, 0.25, 3.2] }, { verb: 'begin', range: 20 }),
  object('atc:story/echo-spindle', 'Echo Spindle', [3, 85.2, 47], 'story', { shape: 'spindle', size: [1.2, 2.1, 1.2], pulse: true }, { verb: 'inspect', range: 18 }),
  object('atc:npc/sela-oren', 'Sela Oren · Rows Keeper', [-4, 85, 45], 'npc', { shape: 'character', size: [1.1, 2.3, 1.1] }, { verb: 'talk', range: 18 }),
  object('atc:route/starter-branch', 'Starter Branch', [0, 85, 34], 'traversal', { shape: 'route', path: ROUTES['atc:route/starter-branch'].path, width: 2.8 }, { verb: 'traverse', range: 60 }),
  object('atc:structure/split-trunk', 'Split Trunk', [12, 78, 4], 'structure', { shape: 'trunk', size: [7, 31, 7], rotation: [0.12, 0, -0.18] }),
  object('atc:route/trunk-switchback', 'Trunk Switchback', [8, 82, 22], 'traversal', { shape: 'route', path: ROUTES['atc:route/trunk-switchback'].path, width: 2.25 }, { verb: 'climb', range: 80 }),
  object('atc:route/high-glide', 'High Glide', [-5, 79, 9], 'traversal', { shape: 'route', path: ROUTES['atc:route/high-glide'].path, width: 0.55, dashed: true }, { verb: 'glide', range: 55 }),
  object('atc:clue/crew-notch', 'Descent Crew Notch', [13, 78.2, 5], 'story', { shape: 'tablet', size: [2.6, 1.6, 0.35], rotation: [0, -0.8, 0] }, { verb: 'inspect', range: 18 }),
  object('atc:zone/hanging-rows', 'Hanging Rows · Safe Zone', [8, 70, -24], 'safe', { shape: 'zone', size: [31, 1.4, 25] }, { verb: 'travel', range: 80 }),
  object('atc:interact/rows-lantern', 'Failing Rows Lantern', [4, 72.5, -24], 'interactable', { shape: 'lantern', size: [1.6, 2.4, 1.6] }, { verb: 'inspect', range: 18 }),
  object('atc:landmark/hanging-food', 'Hanging Food Rows', [10, 72, -28], 'safe', { shape: 'hanging-rows', size: [14, 9, 12] }, { verb: 'inspect', range: 22 }),
  object('atc:route/rows-market-bridge', 'Low Market Bridge', [18, 68, -40], 'traversal', { shape: 'route', path: ROUTES['atc:route/rows-market-bridge'].path, width: 2.4 }, { verb: 'traverse', range: 70 }),
  object('atc:route/rows-market-glide', 'Market Glide', [4, 70, -40], 'traversal', { shape: 'route', path: ROUTES['atc:route/rows-market-glide'].path, width: 0.55, dashed: true }, { verb: 'glide', range: 55 }),
  object('atc:structure/low-market', 'Low Market', [28, 60, -60], 'structure', { shape: 'market', size: [31, 2.2, 29] }),
  object('atc:clue/market-route-board', 'Old Crew Route Board', [24, 62, -58], 'story', { shape: 'board', size: [5.5, 3.2, 0.55], rotation: [0, 0.35, 0] }, { verb: 'inspect', range: 20 }),
  object('atc:puzzle/descent-lock/dial-a', 'Lock Dial A', [31, 61, -64], 'interactable', { shape: 'dial', size: [1.4, 1.4, 0.5] }, { verb: 'turn', range: 18 }),
  object('atc:puzzle/descent-lock/dial-b', 'Lock Dial B', [33, 61, -64], 'interactable', { shape: 'dial', size: [1.4, 1.4, 0.5] }, { verb: 'turn', range: 18 }),
  object('atc:puzzle/descent-lock/dial-c', 'Lock Dial C', [35, 61, -64], 'interactable', { shape: 'dial', size: [1.4, 1.4, 0.5] }, { verb: 'turn', range: 18 }),
  object('atc:puzzle/descent-lock/submit', 'Crew Lock Plate', [33, 59.5, -64], 'interactable', { shape: 'plate', size: [4.8, 0.65, 1.1] }, { verb: 'submit', range: 20 }),
  object('atc:blocker/descent-shutter', 'Sealed Descent Shutter', [38, 59, -76], 'hazard', { shape: 'shutter', size: [9, 8, 1.1] }, { verb: 'unavailable', range: 24 }),
  object('atc:route/descent-line', 'Gravity Descent Line', [38, 59, -76], 'traversal', { shape: 'route', path: ROUTES['atc:route/descent-line'].path, width: 0.65 }, { verb: 'zipline', range: 24 }),
  object('atc:structure/old-descent-station', 'Old Descent Station', [50, 32, -105], 'structure', { shape: 'station', size: [25, 3, 24] }),
  object('atc:story/station-console', 'Station Signal Console', [50, 34, -109], 'story', { shape: 'console', size: [4.3, 2.7, 2.1] }, { verb: 'inspect', range: 20 }),
  object('atc:choice/answer-beacon', 'Answer Edda\'s Signal', [47.5, 33, -111], 'interactable', { shape: 'beacon', size: [1.6, 2.4, 1.6] }, { verb: 'choose', range: 18 }),
  object('atc:choice/recover-cell', 'Recover the Sun-cell', [52.5, 33, -111], 'interactable', { shape: 'cell', size: [1.5, 2.2, 1.5] }, { verb: 'choose', range: 18 }),
  object('atc:hazard/deep-boundary', 'Deep Route · Sealed', [56, 18, -116], 'hazard', { shape: 'boundary', size: [16, 21, 3] }, { verb: 'unavailable', range: 32 }),
  object('atc:route/station-return', 'Counterweight Return', [44, 35, -94], 'traversal', { shape: 'route', path: ROUTES['atc:route/station-return'].path, width: 0.85 }, { verb: 'return', range: 22 }),
  object('atc:trigger/return-rows', 'Rows Return Trigger', [6, 71, -18], 'trigger', { shape: 'ring', size: [3, 0.22, 3] }, null),
  object('atc:checkpoint/slice-complete', 'Slice Complete', [8, 71, -20], 'trigger', { shape: 'ring', size: [4.2, 0.24, 4.2], hidden: true }, null)
]);

export const OBJECT_BY_ID = Object.freeze(Object.fromEntries(AUTHORED_OBJECTS.map((entry) => [entry.id, entry])));

export const DIALOGUE = Object.freeze({
  opening: [
    ['RYN', 'I trade routes, repair markers, and leave before any perch starts calling me theirs.'],
    ['RYN', 'Edda taught me that. Then she went below.']
  ],
  spindle: [
    ['RYN', 'This spindle is climbing against the wind.'],
    ['RECORDED VOICE', "Ryn—old station—don’t let the line—"],
    ['RYN', 'Edda’s knot. Fresh wax. Three days old.']
  ],
  selaOpening: [
    ['SELA', 'That is Edda’s knot.'],
    ['RYN', 'You said the descent crew vanished.'],
    ['SELA', 'I said the station closed. Some truths keep people alive.'],
    ['RYN', 'This truth is three days old.'],
    ['SELA', 'Then either Edda lives, or something below learned her hands.'],
    ['SELA', 'The Rows have one night of light left. Bring back the station’s sun-cell.'],
    ['RYN', 'And if the cell can answer her?'],
    ['SELA', 'Then you will finally know what your answer costs.']
  ],
  crewNotch: [
    ['RYN', 'Old descent-crew marks. Split Bough. Lantern. Open Ring.'],
    ['RYN', 'Edda made me repeat route codes until I could see them with my eyes closed.']
  ],
  rowsLantern: [
    ['ROWS GAUGE', 'LIGHT RESERVE: ONE NIGHT'],
    ['RYN', 'Food keeps people here. Light lets them believe here is safe.'],
    ['RYN', 'The station cell could buy the Rows a season.']
  ],
  hangingFood: [['RYN', 'Root fruit, cloud beans, and saltleaf. A safe place is something people keep feeding.']],
  marketBoard: [
    ['ROUTE BOARD', 'DESCENT CREW — SPLIT BOUGH / LANTERN / OPEN RING'],
    ['RYN', 'The notch was not a warning. It was the lock combination.']
  ],
  puzzleWrong: [
    ['LOCK', 'ROUTE NOT RECOGNIZED'],
    ['RYN', 'Not that order. The trunk mark is in my journal.']
  ],
  puzzleSolved: [
    ['LOCK', 'CREW ROUTE RECOGNIZED'],
    ['RYN', 'Down is cheap. Deep is dangerous. Edda always said the second part softer.']
  ],
  descent: [
    ['RYN', 'Gravity never asks why you are going.'],
    ['RYN', 'It leaves that question for the climb back.']
  ],
  station: [
    ['STATION', 'SOURCE: BELOW SERVICE DEPTH'],
    ['STATION', 'TRANSMISSION AGE: THREE DAYS'],
    ['STATION', 'AUTHOR KNOT: EDDA VALE'],
    ['RYN', 'Seven years missing. Three days since transmission.'],
    ['RYN', 'It is real enough to choose for.']
  ],
  answerSignal: [
    ['EDDA', 'Ryn, don’t descend. The station isn’t broken. It is holding the deep route shut.'],
    ['EDDA', 'Something is climbing.'],
    ['SIGNAL', 'CONNECTION LOST'],
    ['RYN', 'Then the Rows are not high enough.']
  ],
  recoverCell: [
    ['SIGNAL', 'POWER SOURCE REMOVED'],
    ['RECORDED VOICE', 'Ryn—the station is not—'],
    ['RYN', 'I know what light costs. I still do not know what silence costs.']
  ],
  selaAnswer: [
    ['SELA', 'You chose a voice over a hundred suppers.'],
    ['RYN', 'It knew my name—and the deep is climbing.'],
    ['SELA', 'Then we move the Rows before it reaches us.']
  ],
  selaRecover: [
    ['SELA', 'The Rows will stay bright.'],
    ['RYN', 'And the only fresh trace of Edda is quiet.'],
    ['SELA', 'Safety is a choice we make again tomorrow.']
  ]
});

export const JOURNAL_ENTRIES = Object.freeze({
  spindle: 'A voice bearing Edda’s private knot came from the sealed descent route.',
  crewCode: 'Crew code — Split Bough → Lantern → Open Ring.',
  rows: 'The Hanging Rows have one night of stored light. The station cell could power them for a season.',
  station: 'The fresh signal came from below service depth and carries Edda Vale’s identity knot.',
  answer: 'The Moving Below — Edda warned that the station holds a deep route shut. Prepare the Rows, then find another way to reach her.',
  recover: 'A Voice Traded for Light — The Rows are safe for a season. Edda’s fresh signal ended before its warning was complete.'
});

export const CAPTURE_BEATS = Object.freeze([
  { id: 'opening', start: 0, end: 30, title: 'STARTER PERCH', targetId: 'atc:trigger/spawn/starter-perch' },
  { id: 'spindle', start: 30, end: 60, title: 'THE ECHO SPINDLE', targetId: 'atc:story/echo-spindle' },
  { id: 'sela', start: 60, end: 90, title: 'SELA’S WARNING', targetId: 'atc:npc/sela-oren' },
  { id: 'notch', start: 90, end: 120, title: 'THE CREW NOTCH', targetId: 'atc:clue/crew-notch' },
  { id: 'rows', start: 120, end: 150, title: 'HANGING ROWS', targetId: 'atc:interact/rows-lantern' },
  { id: 'market', start: 150, end: 180, title: 'LOW MARKET', targetId: 'atc:clue/market-route-board' },
  { id: 'puzzle', start: 180, end: 210, title: 'THE DESCENT LOCK', targetId: 'atc:puzzle/descent-lock/submit' },
  { id: 'descent', start: 210, end: 240, title: 'DOWN IS CHEAP', targetId: 'atc:route/descent-line' },
  { id: 'station', start: 240, end: 270, title: 'OLD DESCENT STATION', targetId: 'atc:story/station-console' },
  { id: 'consequence', start: 270, end: 300, title: 'THE MOVING BELOW', targetId: 'atc:npc/sela-oren' }
]);

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function insideAuthoredExclusion(x, z) {
  return x > -44 && x < 84 && z > -142 && z < 82;
}

export function createForestInstances({ seed = FOREST_SEED, count = DEFAULT_TREE_COUNT } = {}) {
  const random = mulberry32(seed);
  const instances = [];
  for (let index = 0; index < count; index += 1) {
    let x;
    let z;
    for (let attempts = 0; attempts < 32; attempts += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 72 + Math.sqrt(random()) * 280;
      x = Math.cos(angle) * radius + 18;
      z = Math.sin(angle) * radius - 36;
      if (!insideAuthoredExclusion(x, z)) break;
    }
    const layer = index % 5;
    const scale = 0.65 + random() * 1.7;
    const baseY = -34 + layer * 12 + random() * 18;
    instances.push({
      id: `atc:tree/${String(index).padStart(4, '0')}`,
      position: [x, baseY, z],
      scale: [scale, scale * (0.85 + random() * 0.45), scale],
      metadata: { yaw: random() * Math.PI * 2, shade: random(), cell: `${Math.floor(x / 100)},${Math.floor(z / 100)}` }
    });
  }
  return instances;
}

function segmentDistance2D(point, start, end) {
  const vx = end[0] - start[0];
  const vz = end[2] - start[2];
  const length2 = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((point.x - start[0]) * vx + (point.z - start[2]) * vz) / length2));
  const x = start[0] + vx * t;
  const z = start[2] + vz * t;
  return { distance: Math.hypot(point.x - x, point.z - z), t, y: start[1] + (end[1] - start[1]) * t };
}

export function nearestRouteSample(point) {
  let best = { distance: Number.POSITIVE_INFINITY, y: Number(point.y ?? 84), routeId: null };
  for (const route of Object.values(ROUTES)) {
    for (let index = 1; index < route.path.length; index += 1) {
      const sample = segmentDistance2D(point, route.path[index - 1], route.path[index]);
      if (sample.distance < best.distance) best = { ...sample, routeId: route.id };
    }
  }
  for (const location of LOCATIONS) {
    const distance = Math.hypot(point.x - location.center[0], point.z - location.center[2]);
    if (distance < best.distance) best = { distance, y: location.center[1] + 1.6, routeId: location.id };
  }
  return best;
}

export function createAuthoredWalkability(proceduralSnapshot) {
  const source = proceduralSnapshot.walkability;
  const cells = source.cells.map((cell) => {
    const world = cell.world ?? {
      x: source.origin.x + (cell.x + 0.5) * source.cellSize,
      y: 0,
      z: source.origin.z + (cell.y + 0.5) * source.cellSize
    };
    const sample = nearestRouteSample(world);
    const walkable = sample.distance <= Math.max(4.5, source.cellSize * 1.15);
    return { ...cell, walkable, cost: walkable ? 1 + Math.min(3, sample.distance * 0.15) : null, world: { x: world.x, y: sample.y, z: world.z } };
  });
  return { ...source, cells, sourceSignature: proceduralSnapshot.signature };
}

export function nearestLocation(position) {
  return [...LOCATIONS]
    .map((location) => ({ location, distance: Math.hypot(position[0] - location.center[0], position[1] - location.center[1], position[2] - location.center[2]) }))
    .sort((left, right) => left.distance - right.distance || left.location.id.localeCompare(right.location.id))[0].location;
}

export function routeAvailable(routeId, story) {
  const route = ROUTES[routeId];
  if (!route) return { available: false, reason: 'Unknown route.' };
  if (route.requires === 'choice' && !story.choice) return { available: false, reason: 'Choose what to do with the sun-cell first.' };
  if (route.requires && route.requires !== 'choice' && !story.flags[route.requires]) return { available: false, reason: 'The descent lock is still sealed.' };
  return { available: true, reason: null };
}

export function cloneRoutePath(routeId) {
  return ROUTES[routeId]?.path.map((point) => [...point]) ?? [];
}
