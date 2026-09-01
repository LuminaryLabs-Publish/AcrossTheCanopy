import {
  CHECKPOINTS,
  LOCATIONS,
  OBJECT_BY_ID,
  ROUTES,
  cloneRoutePath,
  nearestLocation,
  nearestRouteSample
} from './content.js';
import { buildPresentationConfig, createPresentationPacket } from './presentation-projection.js';
import { createStorageAdapter } from '../adapters/storage.js';

const FIXED_DELTA = 1 / 60;
const clone = (value) => value === undefined ? undefined : structuredClone(value);
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, Number(value)));
const distance = (left, right) => Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);

function playerPosition(value) {
  if (Array.isArray(value)) return [...value];
  if (Array.isArray(value?.position)) return [...value.position];
  if (Array.isArray(value?.transform?.position)) return [...value.transform.position];
  return [...CHECKPOINTS.starter.position];
}

function quaternionFromYaw(yaw) {
  return [0, Math.sin(yaw * 0.5), 0, Math.cos(yaw * 0.5)];
}

function polylineLengths(points) {
  const lengths = [];
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const length = distance(points[index - 1], points[index]);
    lengths.push(length);
    total += length;
  }
  return { lengths, total };
}

function samplePolyline(points, progress) {
  if (!points.length) return [...CHECKPOINTS.starter.position];
  if (points.length === 1) return [...points[0]];
  const { lengths, total } = polylineLengths(points);
  let remaining = clamp(progress, 0, 1) * total;
  for (let index = 0; index < lengths.length; index += 1) {
    if (remaining <= lengths[index] || index === lengths.length - 1) {
      const t = lengths[index] === 0 ? 0 : clamp(remaining / lengths[index], 0, 1);
      return points[index].map((value, axis) => value + (points[index + 1][axis] - value) * t);
    }
    remaining -= lengths[index];
  }
  return [...points.at(-1)];
}

function lookAt(position, target) {
  const dx = target[0] - position[0];
  const dy = target[1] - position[1];
  const dz = target[2] - position[2];
  const planar = Math.max(1e-6, Math.hypot(dx, dz));
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, planar) };
}

function checkpointPosition(checkpointId) {
  return Object.values(CHECKPOINTS).find((entry) => entry.id === checkpointId)?.position ?? CHECKPOINTS.starter.position;
}

function normalizePoint(point) {
  if (Array.isArray(point)) return point.map(Number);
  return [Number(point?.x ?? 0), Number(point?.y ?? 0), Number(point?.z ?? 0)];
}

export function createGameSession({ runtime, provider, storage = createStorageAdapter(), capture = null, width = 1280, height = 720, pixelRatio = 1 } = {}) {
  if (!runtime?.engine || typeof runtime.tick !== 'function') throw new TypeError('Game session requires the Across the Canopy Nexus runtime.');
  if (!provider?.executePass) throw new TypeError('Game session requires a validated render provider.');
  let frame = 0;
  let elapsed = 0;
  let operationSequence = 0;
  let currentPacket = null;
  let presentation = null;
  let output = { width, height, pixelRatio };
  let movement = { forward: 0, right: 0, glide: false };
  let camera = { position: playerPosition(runtime.getPlayer()), yaw: -0.18, pitch: -0.045, fov: 78, near: 0.08, far: 700 };
  let activeTraversal = null;
  let activeNavigation = null;
  let pendingAction = null;
  let lastLocationId = runtime.getStory().locationId;
  let fps = 60;
  let fpsAccumulator = 0;
  let fpsFrames = 0;
  let lastProgressEmission = -1;
  let lastNexusFov = null;
  const trees = Object.freeze(runtime.getTrees().map((tree) => Object.freeze({
    ...tree,
    position: Object.freeze([...tree.position]),
    scale: Object.freeze([...tree.scale]),
    metadata: Object.freeze({ ...(tree.metadata ?? {}) })
  })));
  const capabilities = {
    fixedDelta: FIXED_DELTA,
    firstPerson: true,
    keyboardTraversal: true,
    clickNavigation: true,
    fovRange: [60, 120],
    captureReplay: Boolean(capture),
    nexus: clone(runtime.capabilities ?? {})
  };

  function nextOperation(label) {
    operationSequence += 1;
    return `atc:session/${String(operationSequence).padStart(8, '0')}/${label}`;
  }

  function setPlayer(position, yaw = camera.yaw) {
    const safe = position.map(Number);
    runtime.setPlayer({ position: safe, rotation: quaternionFromYaw(yaw) });
    camera.position = [...safe];
  }

  function syncLocomotion(position) {
    const api = runtime.engine.n?.actionLocomotion;
    if (!api?.getSnapshot || !api?.loadSnapshot) return;
    const snapshot = api.getSnapshot();
    api.loadSnapshot({
      ...snapshot,
      position: { x: position[0], y: position[1], z: position[2] },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      gliding: false,
      jumping: false,
      recoveryRequired: null
    });
  }

  function rawDispatch(action) {
    const normalized = { ...clone(action), operationId: action.operationId ?? nextOperation(action.type ?? 'action'), sequence: action.sequence ?? operationSequence };
    runtime.dispatchAction(normalized);
    return normalized;
  }

  function pathTo(target) {
    const start = playerPosition(runtime.getPlayer());
    const goal = normalizePoint(target);
    const pathfinding = runtime.engine.n?.pathfinding;
    if (pathfinding?.requestPath && pathfinding?.lastPath) {
      try {
        pathfinding.requestPath({
          operationId: nextOperation('pathfinding'),
          mode: 'navmesh3d',
          start: { x: start[0], y: start[1], z: start[2] },
          goal: { x: goal[0], y: goal[1], z: goal[2] }
        });
        const resolved = pathfinding.lastPath();
        if (resolved?.status === 'resolved' && resolved.points?.length) {
          return resolved.points.map((point) => normalizePoint(point));
        }
      } catch {
        // A direct authored route remains the safe deterministic fallback.
      }
    }
    const sample = nearestRouteSample({ x: goal[0], y: goal[1], z: goal[2] });
    return [start, [goal[0], sample.distance < 12 ? sample.y : goal[1], goal[2]]];
  }

  function placedTargetPosition(target) {
    const placement = runtime.getPlacements().find((entry) => entry.objectId === target.id);
    return normalizePoint(placement?.transform?.position ?? target.position);
  }

  function dispatch(action) {
    const story = runtime.getStory();
    if (action.type === 'focus' || !action.targetId || ['advance', 'cancel', 'toggle-journal', 'toggle-pause', 'confirm-choice'].includes(action.type)) {
      return rawDispatch(action);
    }
    const target = OBJECT_BY_ID[action.targetId];
    if (!target?.interaction || story.mode !== 'movement' && story.mode !== 'intro' && story.mode !== 'puzzle') return rawDispatch(action);
    const current = playerPosition(runtime.getPlayer());
    const targetPosition = placedTargetPosition(target);
    const range = Number(target.interaction.range ?? 16);
    if (distance(current, targetPosition) <= range) return rawDispatch(action);
    const points = pathTo(targetPosition);
    pendingAction = clone(action);
    return rawDispatch({ type: 'move-to', targetId: target.id, points });
  }

  function setMovement(next) {
    movement = {
      forward: clamp(next.forward ?? movement.forward, -1, 1),
      right: clamp(next.right ?? movement.right, -1, 1),
      glide: next.glide === true
    };
  }

  function setLook({ yawDelta = 0, pitchDelta = 0, yaw = null, pitch = null } = {}) {
    camera.yaw = yaw == null ? camera.yaw + Number(yawDelta) : Number(yaw);
    camera.pitch = clamp(pitch == null ? camera.pitch + Number(pitchDelta) : Number(pitch), -1.25, 0.95);
  }

  function setFov(value) {
    camera.fov = clamp(value, 60, 120);
  }

  function moveWithLocomotion(delta) {
    const story = runtime.getStory();
    if (story.mode !== 'movement' || story.paused) return;
    const inputX = movement.right * Math.cos(camera.yaw) - movement.forward * Math.sin(camera.yaw);
    const inputZ = movement.right * Math.sin(camera.yaw) - movement.forward * Math.cos(camera.yaw);
    if (Math.hypot(inputX, inputZ) < 1e-5 && !movement.glide) return;
    const current = playerPosition(runtime.getPlayer());
    const support = nearestRouteSample({ x: current[0], y: current[1], z: current[2] });
    const locomotion = runtime.engine.n?.actionLocomotion;
    if (locomotion?.step) {
      locomotion.step({
        operationId: nextOperation('locomotion'),
        delta,
        input: { x: inputX, z: inputZ, glide: movement.glide, sprint: false },
        contact: { grounded: !movement.glide, groundHeight: support.y }
      });
      const frameState = locomotion.getFrame?.();
      if (frameState?.position) {
        const proposed = normalizePoint(frameState.position);
        const proposedSupport = nearestRouteSample({ x: proposed[0], y: proposed[1], z: proposed[2] });
        if (proposedSupport.distance <= 7.5) {
          proposed[1] = movement.glide ? Math.max(proposedSupport.y, proposed[1]) : proposedSupport.y;
          setPlayer(proposed);
        } else {
          syncLocomotion(current);
        }
      }
    }
  }

  function traversalDuration(routeId) {
    const route = ROUTES[routeId];
    if (!route) return 4;
    const routeLength = polylineLengths(route.path).total;
    const speed = route.mode === 'zipline' ? 10 : route.mode === 'glide' ? 8 : route.mode === 'climb' ? 5 : route.mode === 'lift' ? 8 : 6;
    return clamp(routeLength / speed, 3.5, 9);
  }

  function updateTraversal(story, delta) {
    if (!story.traversal) {
      activeTraversal = null;
      return false;
    }
    if (!activeTraversal || activeTraversal.routeId !== story.traversal.routeId) {
      activeTraversal = { routeId: story.traversal.routeId, elapsed: 0, duration: traversalDuration(story.traversal.routeId) };
      lastProgressEmission = -1;
    }
    activeTraversal.elapsed += delta;
    const progress = clamp(activeTraversal.elapsed / activeTraversal.duration, 0, 1);
    const point = samplePolyline(cloneRoutePath(activeTraversal.routeId), progress);
    const ahead = samplePolyline(cloneRoutePath(activeTraversal.routeId), Math.min(1, progress + 0.02));
    const orientation = lookAt(point, ahead);
    camera.yaw += (orientation.yaw - camera.yaw) * Math.min(1, delta * 4);
    camera.pitch += (orientation.pitch - camera.pitch) * Math.min(1, delta * 3);
    setPlayer(point, camera.yaw);
    const emission = Math.floor(progress * 20);
    if (emission !== lastProgressEmission && progress < 1) {
      runtime.engine.n.acrossTheCanopy.applyInternal({ type: 'traversal-progress', progress });
      lastProgressEmission = emission;
    }
    if (progress >= 1) {
      runtime.engine.n.acrossTheCanopy.applyInternal({ type: 'traversal-complete', routeId: activeTraversal.routeId });
      syncLocomotion(point);
      activeTraversal = null;
    }
    return true;
  }

  function updateNavigation(story, delta) {
    if (!story.navigation) {
      activeNavigation = null;
      return false;
    }
    if (!activeNavigation || activeNavigation.targetId !== story.navigation.targetId) {
      const points = story.navigation.points?.length ? story.navigation.points.map(normalizePoint) : pathTo(OBJECT_BY_ID[story.navigation.targetId]?.position ?? camera.position);
      activeNavigation = { targetId: story.navigation.targetId, points, elapsed: 0, duration: clamp(polylineLengths(points).total / 7.5, 0.5, 12) };
      lastProgressEmission = -1;
    }
    activeNavigation.elapsed += delta;
    const progress = clamp(activeNavigation.elapsed / activeNavigation.duration, 0, 1);
    const point = samplePolyline(activeNavigation.points, progress);
    const ahead = samplePolyline(activeNavigation.points, Math.min(1, progress + 0.02));
    const orientation = lookAt(point, ahead);
    camera.yaw += (orientation.yaw - camera.yaw) * Math.min(1, delta * 5);
    camera.pitch += (orientation.pitch - camera.pitch) * Math.min(1, delta * 4);
    setPlayer(point, camera.yaw);
    const emission = Math.floor(progress * 10);
    if (emission !== lastProgressEmission && progress < 1) {
      runtime.engine.n.acrossTheCanopy.applyInternal({ type: 'navigation-progress', segment: 0, progress });
      lastProgressEmission = emission;
    }
    if (progress >= 1) {
      runtime.engine.n.acrossTheCanopy.applyInternal({ type: 'navigation-complete' });
      syncLocomotion(point);
      activeNavigation = null;
      if (pendingAction) {
        const action = pendingAction;
        pendingAction = null;
        rawDispatch(action);
      }
    }
    return true;
  }

  function updateLocation() {
    const position = playerPosition(runtime.getPlayer());
    const location = nearestLocation(position);
    if (location.id !== lastLocationId && distance(position, location.center) <= location.radius * 1.45) {
      runtime.engine.n.acrossTheCanopy.applyInternal({ type: 'location-entered', locationId: location.id });
      lastLocationId = location.id;
    }
  }

  function recoverIfNeeded() {
    const position = playerPosition(runtime.getPlayer());
    const locomotion = runtime.engine.n?.actionLocomotion?.getFrame?.();
    if (position[1] > -24 && !locomotion?.recoveryRequired) return;
    const story = runtime.getStory();
    const checkpoint = [...checkpointPosition(story.checkpoint)];
    setPlayer(checkpoint);
    syncLocomotion(checkpoint);
    runtime.engine.n.acrossTheCanopy.applyInternal({ type: 'recover' });
  }

  function save(slotId = 'autosave') {
    const storyApi = runtime.engine.n.acrossTheCanopy;
    const payload = storyApi.createSavePayload({ position: playerPosition(runtime.getPlayer()), fov: camera.fov });
    runtime.save?.(slotId);
    return storage.save(slotId, payload);
  }

  function load(slotId = 'autosave') {
    const payload = typeof slotId === 'object' ? clone(slotId) : storage.load(slotId);
    if (!payload) return null;
    runtime.engine.n.acrossTheCanopy.loadSavePayload(payload);
    const position = normalizePoint(payload.player?.position ?? checkpointPosition(payload.checkpoint));
    camera.fov = clamp(payload.player?.fov ?? 78, 60, 120);
    setPlayer(position);
    syncLocomotion(position);
    lastLocationId = runtime.getStory().locationId;
    return clone(payload);
  }

  function processEffects() {
    const storyApi = runtime.engine.n.acrossTheCanopy;
    const effects = storyApi.listEffects();
    for (const effect of effects) {
      if (effect.type === 'save') save(effect.slotId ?? 'autosave');
      else if (effect.type === 'recover') {
        const position = [...checkpointPosition(effect.checkpoint)];
        setPlayer(position);
        syncLocomotion(position);
      }
    }
    if (effects.length) storyApi.acknowledgeEffects(effects.map((effect) => effect.effectId));
  }

  function synchronizeAuthoredWorldState() {
    const story = runtime.getStory();
    if (!story.world.returned_to_rows) return;
    const placement = runtime.getPlacements().find((entry) => entry.objectId === 'atc:npc/sela-oren');
    if (placement && distance(placement.transform.position, [8, 72.1, -18]) > 0.01) {
      runtime.engine.n.objectPlacement.revise(placement.id, {
        transform: { ...placement.transform, position: [8, 72.1, -18] },
        metadata: { ...placement.metadata, relocatedByStoryFlag: 'returned_to_rows' }
      });
    }
  }

  function updateCameraFocus(story, delta) {
    if (!['dialogue', 'choice', 'puzzle'].includes(story.mode)) return;
    const target = OBJECT_BY_ID[story.focusId];
    if (!target) return;
    const desired = lookAt(camera.position, target.position);
    camera.yaw += (desired.yaw - camera.yaw) * Math.min(1, delta * 1.8);
    camera.pitch += (desired.pitch - camera.pitch) * Math.min(1, delta * 1.8);
  }

  function project() {
    const story = runtime.getStory();
    const currentPlayer = { position: playerPosition(runtime.getPlayer()) };
    if (!capture) camera.position = [...currentPlayer.position];
    const captureState = capture?.snapshot?.() ?? null;
    presentation = buildPresentationConfig({
      story,
      player: currentPlayer,
      camera,
      focusId: story.focusId,
      treeCount: trees.length,
      fps,
      capture: captureState
    });
    runtime.setPresentation({
      root: {
        storyRevision: story.revision,
        camera: presentation.camera,
        ui: presentation.ui,
        worldState: presentation.worldState,
        treeCount: presentation.treeCount,
        primitiveLegend: true
      },
      ...(lastNexusFov === null || Math.abs(lastNexusFov - presentation.camera.fov) >= 0.5
        ? { fov: presentation.camera.fov }
        : {})
    });
    if (lastNexusFov === null || Math.abs(lastNexusFov - presentation.camera.fov) >= 0.5) lastNexusFov = presentation.camera.fov;
    currentPacket = createPresentationPacket({
      revision: frame,
      elapsed,
      output,
      presentation,
      objects: runtime.engine.n.object.list(),
      placements: runtime.getPlacements(),
      trees,
      story
    });
    provider.beginFrame({ frame, elapsed, delta: FIXED_DELTA });
    provider.executePass({ id: 'atc:pass/main', packet: currentPacket });
    provider.submitFrame({ frame });
    return currentPacket;
  }

  function step(delta = FIXED_DELTA) {
    // Capture playback uses the recorder's fixed timestep. Allow low capture
    // frame rates to advance the authored timeline at real time; the Nexus
    // simulation keeps its own smaller-step safety clamp internally.
    const safeDelta = clamp(delta, 0, capture ? 1 : 1 / 15);
    frame += 1;
    elapsed += safeDelta;
    fpsAccumulator += safeDelta;
    fpsFrames += 1;
    if (fpsAccumulator >= 0.5) {
      fps = fpsFrames / fpsAccumulator;
      fpsAccumulator = 0;
      fpsFrames = 0;
    }
    capture?.update?.(elapsed, safeDelta);
    runtime.tick(safeDelta);
    if (!capture) {
      let story = runtime.getStory();
      if (!updateTraversal(story, safeDelta)) {
        story = runtime.getStory();
        if (!updateNavigation(story, safeDelta)) moveWithLocomotion(safeDelta);
      }
      updateLocation();
      recoverIfNeeded();
    }
    processEffects();
    synchronizeAuthoredWorldState();
    if (!capture) updateCameraFocus(runtime.getStory(), safeDelta);
    return project();
  }

  async function initialize(options = {}) {
    output = {
      width: Math.max(1, Number(options.width ?? output.width)),
      height: Math.max(1, Number(options.height ?? output.height)),
      pixelRatio: clamp(options.pixelRatio ?? output.pixelRatio, 0.5, 2)
    };
    runtime.setOutput(output.width, output.height, output.pixelRatio);
    await provider.initialize({ surface: options.surface, ...output });
    project();
    return getSnapshot();
  }

  function resize(nextWidth, nextHeight, nextPixelRatio = output.pixelRatio) {
    output = { width: Math.max(1, Number(nextWidth)), height: Math.max(1, Number(nextHeight)), pixelRatio: clamp(nextPixelRatio, 0.5, 2) };
    runtime.setOutput(output.width, output.height, output.pixelRatio);
    provider.resizeSurface?.(output);
  }

  function reset() {
    runtime.reset();
    camera = { position: [...CHECKPOINTS.starter.position], yaw: -0.18, pitch: -0.045, fov: 78, near: 0.08, far: 700 };
    movement = { forward: 0, right: 0, glide: false };
    frame = 0;
    elapsed = 0;
    activeTraversal = null;
    activeNavigation = null;
    pendingAction = null;
    lastLocationId = runtime.getStory().locationId;
    capture?.reset?.();
    setPlayer(camera.position);
    syncLocomotion(camera.position);
    provider.reset();
    return project();
  }

  function getSnapshot() {
    return {
      schema: 'atc.game-session/1',
      frame,
      elapsed,
      output: clone(output),
      camera: clone(camera),
      player: { position: playerPosition(runtime.getPlayer()) },
      story: runtime.getStory(),
      presentation: clone(presentation),
      provider: provider.getSnapshot?.() ?? null,
      capabilities: clone(capabilities)
    };
  }

  return Object.freeze({
    initialize,
    step,
    resize,
    dispatch,
    setMovement,
    setLook,
    setFov,
    setPlayer: ({ position, yaw = camera.yaw } = {}) => {
      setPlayer(position, yaw);
      syncLocomotion(position);
    },
    setCamera: (patch = {}) => {
      camera = { ...camera, ...clone(patch), position: clone(patch.position ?? camera.position) };
    },
    save,
    load,
    reset,
    getSnapshot,
    getPacket: () => currentPacket,
    getPresentation: () => clone(presentation),
    getStory: () => runtime.getStory(),
    getCamera: () => clone(camera),
    capabilities
  });
}

export { FIXED_DELTA };

export default createGameSession;
