import {
  CAPTURE_BEATS,
  LOCATIONS,
  OBJECT_BY_ID,
  PRIMITIVE_COLORS
} from './content.js';
import { activeDialogueLine, currentInteractionHint } from './story-model.js';

const clone = (value) => value === undefined ? undefined : structuredClone(value);
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, Number(value)));

function text(id, value, x, y, options = {}) {
  return {
    id,
    kind: 'text',
    text: String(value ?? ''),
    x,
    y,
    color: options.color ?? '#F4F1DD',
    scale: options.scale ?? 1,
    maxWidth: options.maxWidth ?? 92,
    align: options.align ?? 'left',
    shadow: options.shadow !== false,
    visible: options.visible !== false
  };
}

function panel(id, x, y, width, height, options = {}) {
  return {
    id,
    kind: 'panel',
    x,
    y,
    width,
    height,
    fill: options.fill ?? '#10251FD9',
    stroke: options.stroke ?? '#E6E7C344',
    visible: options.visible !== false,
    interaction: clone(options.interaction ?? null)
  };
}

function bar(id, value, x, y, width, options = {}) {
  return {
    id,
    kind: 'bar',
    value: clamp(value, 0, 1),
    x,
    y,
    width,
    height: options.height ?? 2,
    fill: options.fill ?? PRIMITIVE_COLORS.trigger,
    track: options.track ?? '#E9EAD02B',
    visible: options.visible !== false,
    interaction: clone(options.interaction ?? null)
  };
}

function locationCopy(story) {
  const location = LOCATIONS.find((entry) => entry.id === story.locationId) ?? LOCATIONS[0];
  return { label: location.label.toUpperCase(), elevation: location.elevation };
}

function buildLegend() {
  return [
    ['GRAY', 'STRUCTURE'],
    ['BLUE', 'TRAVERSAL'],
    ['GREEN', 'SAFE'],
    ['YELLOW', 'INTERACT'],
    ['ORANGE', 'STORY'],
    ['PURPLE', 'CHARACTER'],
    ['RED', 'HAZARD'],
    ['CYAN', 'TRIGGER']
  ];
}

function buildUi({ story, camera, treeCount, focusId, capture, fps }) {
  const ui = [];
  const location = locationCopy(story);
  const focus = focusId ? OBJECT_BY_ID[focusId] : null;
  const line = activeDialogueLine(story);
  const captureBeat = capture?.enabled
    ? CAPTURE_BEATS.find((beat) => capture.time >= beat.start && capture.time < beat.end) ?? CAPTURE_BEATS.at(-1)
    : null;

  ui.push(panel('hud-location-panel', 2.5, 3, 43, 16, { fill: '#10251FCB' }));
  ui.push(text('hud-title', 'ACROSS THE CANOPY', 4, 5, { scale: 2, color: '#F7F1D3' }));
  ui.push(text('hud-slice', 'GREYBOX STORY SLICE  /  THE UPWARD SIGNAL', 4, 9.5, { color: PRIMITIVE_COLORS.trigger }));
  ui.push(text('hud-location', location.label, 4, 13, { scale: 1.25 }));
  ui.push(text('hud-elevation', location.elevation, 4, 16, { color: '#B9C6B3' }));

  ui.push(panel('hud-objective-panel', 2.5, 21, 43, 13));
  ui.push(text('hud-objective-label', 'CURRENT OBJECTIVE', 4, 23, { color: PRIMITIVE_COLORS.story }));
  ui.push(text('hud-objective', story.objective, 4, 26.5, { scale: 1.15, maxWidth: 37 }));
  ui.push(text('hud-status', story.feedback, 4, 31.5, { color: '#B9C6B3', maxWidth: 37 }));

  ui.push(panel('hud-legend-panel', 79, 3, 18.5, 28, { fill: '#10251FBA' }));
  ui.push(text('hud-legend-title', 'PRIMITIVE KEY', 81, 5, { color: '#D8E4D4' }));
  buildLegend().forEach(([role, label], index) => {
    const color = PRIMITIVE_COLORS[Object.keys(PRIMITIVE_COLORS)[index]];
    ui.push(panel(`legend-swatch-${index}`, 81, 8 + index * 2.55, 1.4, 1.4, { fill: color, stroke: color }));
    ui.push(text(`legend-${index}`, `${role}  ${label}`, 83.5, 8.15 + index * 2.55, { color: '#DDE5D7', scale: 0.85 }));
  });

  ui.push(text('hud-reticle', '+', 50, 49, { align: 'center', scale: 2, color: focus ? PRIMITIVE_COLORS.interactable : '#F4F1DD' }));
  if (focus) {
    ui.push(panel('hud-focus-panel', 31, 55, 38, 8, { fill: '#10251FE8', stroke: PRIMITIVE_COLORS[focus.colorRole] }));
    ui.push(text('hud-focus-label', focus.label.toUpperCase(), 50, 57, { align: 'center', scale: 1.35, color: PRIMITIVE_COLORS[focus.colorRole] }));
    ui.push(text('hud-focus-verb', `${focus.interaction?.verb?.toUpperCase() ?? 'LOOK'}  /  CLICK OR E`, 50, 60, { align: 'center', color: '#E7E4CE' }));
  }

  if (line) {
    ui.push(panel('dialogue-panel', 11, 70, 78, 20, { fill: '#0A1714F2', stroke: '#F1E9C466' }));
    ui.push(text('dialogue-speaker', line[0], 14, 73, { scale: 1.4, color: line[0] === 'RYN' ? PRIMITIVE_COLORS.trigger : PRIMITIVE_COLORS.npc }));
    ui.push(text('dialogue-line', line[1], 14, 78, { scale: 1.4, maxWidth: 68 }));
    ui.push(text('dialogue-progress', `${story.dialogue.index + 1} / ${story.dialogue.lines.length}`, 85, 86, { align: 'right', color: '#9BA89E' }));
  } else if (story.mode === 'journal') {
    ui.push(panel('journal-panel', 18, 16, 64, 72, { fill: '#101A18F5', stroke: PRIMITIVE_COLORS.story }));
    ui.push(text('journal-title', 'RYN\'S ROUTE JOURNAL', 22, 20, { scale: 2, color: PRIMITIVE_COLORS.story }));
    if (story.journal.length === 0) ui.push(text('journal-empty', 'No evidence recorded yet.', 22, 28, { color: '#AFBBB0' }));
    story.journal.forEach((entry, index) => {
      ui.push(text(`journal-entry-${index}`, `${String(index + 1).padStart(2, '0')}  ${entry}`, 22, 28 + index * 10, { scale: 1.15, maxWidth: 54 }));
    });
  } else if (story.mode === 'choice' && story.choicePrompt) {
    ui.push(panel('choice-panel', 19, 67, 62, 23, { fill: '#17120DF5', stroke: PRIMITIVE_COLORS.story }));
    ui.push(text('choice-title', story.choicePrompt.title, 50, 70, { align: 'center', scale: 2, color: PRIMITIVE_COLORS.story }));
    ui.push(text('choice-consequence', story.choicePrompt.consequence, 23, 76, { scale: 1.25, maxWidth: 54 }));
    ui.push(panel('choice-confirm', 38, 84, 24, 3.8, { fill: PRIMITIVE_COLORS.interactable, stroke: '#FFF3B6', interaction: { type: 'confirm-choice' } }));
    ui.push(text('choice-confirm-label', 'CONFIRM  [ENTER]', 50, 85, { align: 'center', color: '#1A1A16', shadow: false }));
  } else {
    ui.push(panel('hud-hint-panel', 18, 91.5, 64, 5.3, { fill: '#10251FD6' }));
    ui.push(text('hud-hint', currentInteractionHint(story), 50, 93.2, { align: 'center', color: '#DDE5D7' }));
  }

  if (story.mode === 'puzzle' || story.flags.market_board_read && !story.flags.descent_lock_open) {
    ui.push(panel('puzzle-panel', 33, 37, 34, 10, { fill: '#19170DF0', stroke: PRIMITIVE_COLORS.interactable }));
    ui.push(text('puzzle-title', 'CREW LOCK', 50, 39, { align: 'center', color: PRIMITIVE_COLORS.interactable }));
    ui.push(text('puzzle-dials', story.puzzle.dials.join('  /  '), 50, 42.7, { align: 'center', scale: 1.45 }));
  }

  ui.push(panel('hud-fov-panel', 79, 84, 18.5, 13, { fill: '#10251FBA', interaction: { type: 'set-fov', minimum: 60, maximum: 120, barX: 81, barWidth: 14.5 } }));
  ui.push(text('hud-fov-label', 'FIELD OF VIEW', 81, 86, { color: '#BEC9BE', maxWidth: 14 }));
  ui.push(text('hud-fov-value', `${Math.round(camera.fov)} DEG`, 95, 89, { align: 'right', scale: 1.25, maxWidth: 8 }));
  ui.push(bar('hud-fov-bar', (Math.round(camera.fov) - 60) / 60, 81, 92.2, 14.5, { fill: PRIMITIVE_COLORS.trigger }));
  ui.push(text('hud-fov-range', '60                         120', 81, 94.5, { scale: 0.7, color: '#829087', maxWidth: 14.5 }));
  ui.push(text('hud-stats', `${treeCount.toLocaleString()} TREES  /  ${Math.round(fps)} FPS`, 95.5, 96.8, { align: 'right', color: '#84968A', scale: 0.75 }));

  if (story.paused) {
    ui.push(panel('pause-panel', 35, 40, 30, 15, { fill: '#0A1714F7', stroke: PRIMITIVE_COLORS.trigger }));
    ui.push(text('pause-title', 'PAUSED', 50, 44, { align: 'center', scale: 2 }));
    ui.push(text('pause-help', 'P OR ESC TO RESUME', 50, 50, { align: 'center', color: '#B8C5BA' }));
  }

  if (story.completed) {
    ui.push(panel('complete-panel', 24, 36, 52, 20, { fill: '#0A2018F2', stroke: PRIMITIVE_COLORS.safe }));
    ui.push(text('complete-title', 'VERTICAL SLICE COMPLETE', 50, 40, { align: 'center', scale: 2, color: PRIMITIVE_COLORS.safe }));
    ui.push(text('complete-copy', story.choice === 'answer_signal' ? 'THE MOVING BELOW  /  THE ROWS PREPARE TO MOVE' : 'A VOICE TRADED FOR LIGHT  /  THE ROWS STAY BRIGHT', 50, 47, { align: 'center', scale: 1.2, maxWidth: 45 }));
    ui.push(text('complete-save', 'AUTOSAVE VERIFIED', 50, 53, { align: 'center', color: PRIMITIVE_COLORS.trigger }));
  }

  if (captureBeat) {
    ui.push(panel('capture-slate', 37, 3, 26, 6.5, { fill: '#091511E8', stroke: PRIMITIVE_COLORS.trigger }));
    ui.push(text('capture-title', captureBeat.title, 50, 4.7, { align: 'center', scale: 1.25, color: PRIMITIVE_COLORS.trigger }));
    ui.push(text('capture-time', `${String(Math.floor(capture.time / 60)).padStart(2, '0')}:${String(Math.floor(capture.time % 60)).padStart(2, '0')}  /  05:00`, 50, 7.3, { align: 'center', color: '#C8D4CB', scale: 0.75 }));
  }

  return ui.filter((entry) => entry.visible !== false);
}

export function buildPresentationConfig({ story, player, camera, focusId, treeCount, fps = 60, capture = null }) {
  const safeCamera = {
    position: clone(camera.position ?? player.position),
    yaw: Number(camera.yaw ?? 0),
    pitch: clamp(camera.pitch ?? -0.08, -1.35, 1.1),
    fov: clamp(camera.fov ?? 78, 60, 120),
    near: 0.08,
    far: 700
  };
  return {
    schema: 'atc.presentation-config/1',
    camera: safeCamera,
    focusId: focusId ?? story.focusId ?? null,
    ui: buildUi({ story, camera: safeCamera, treeCount, focusId: focusId ?? story.focusId, capture, fps }),
    storyRevision: story.revision,
    worldState: clone(story.world),
    treeCount,
    capture: clone(capture)
  };
}

export function createPresentationPacket({
  revision,
  elapsed,
  output,
  presentation,
  objects,
  placements,
  trees,
  story
}) {
  const placementMap = new Map((placements ?? []).map((entry) => [entry.objectId, entry]));
  const renderObjects = (objects ?? []).map((entry) => {
    const placement = placementMap.get(entry.id);
    return {
      id: entry.id,
      objectType: entry.objectType,
      metadata: clone(entry.metadata ?? {}),
      transform: clone(placement?.transform ?? entry.transform),
      visible: entry.lifecycle?.status !== 'disposed' && entry.metadata?.visual?.hidden !== true
    };
  });
  return Object.freeze({
    schema: 'atc.presentation-packet/1',
    revision: Math.max(0, Number(revision ?? 0)),
    elapsed: Math.max(0, Number(elapsed ?? 0)),
    output: clone(output),
    camera: clone(presentation.camera),
    ui: clone(presentation.ui ?? []),
    focusId: presentation.focusId ?? null,
    worldState: clone(presentation.worldState ?? story.world),
    objects: renderObjects,
    trees: trees ?? [],
    story: {
      mode: story.mode,
      flags: clone(story.flags),
      choice: story.choice,
      completed: story.completed,
      puzzle: clone(story.puzzle)
    },
    primitiveColors: clone(PRIMITIVE_COLORS)
  });
}

export function assertPresentationPacket(packet) {
  if (!packet || packet.schema !== 'atc.presentation-packet/1') throw new TypeError('Expected an Across the Canopy presentation packet.');
  if (!Array.isArray(packet.objects) || !Array.isArray(packet.trees) || !Array.isArray(packet.ui)) throw new TypeError('Presentation packet collections are missing.');
  if (!packet.camera || !Number.isFinite(packet.camera.fov) || packet.camera.fov < 60 || packet.camera.fov > 120) throw new RangeError('Presentation packet FOV must be between 60 and 120.');
  return packet;
}
