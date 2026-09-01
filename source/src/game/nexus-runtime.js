import { createEngine } from 'nexusengine';
import { createDataKit } from 'nexusengine/domains/runtime/data';
import { createPersistenceKit } from 'nexusengine/domains/runtime/persistence';
import { createHostCapabilityKit } from 'nexusengine/domains/host/capabilities';
import { createSpatialKit } from 'nexusengine/domains/spatial/contracts';
import {
  createFlatWorldSurface,
  createUniformGridPartition
} from 'nexusengine/domains/world';
import { createWorldDomain } from 'nexusengine/domains/world/runtime';
import { createProceduralGenerationKit } from 'nexusengine/domains/world/generation';
import { createSceneKit } from 'nexusengine/domains/world/scene';
import { createRouteFieldKit } from 'nexusengine/domains/world/navigation/route-field';
import { createLandmarkGuidanceKit } from 'nexusengine/domains/world/navigation/landmark-guidance';
import { createNavMeshKit } from 'nexusengine/domains/world/navigation/navmesh';
import { createPathfindingKit } from 'nexusengine/domains/world/navigation/pathfinding';
import { createObjectRegistryKit } from 'nexusengine/domains/object/registry';
import { createObjectPlacementKit } from 'nexusengine/domains/object/placement';
import { createInteractionKit } from 'nexusengine/domains/interaction/runtime';
import { createInputKit } from 'nexusengine/domains/interaction/input';
import { createEnvironmentalAffordanceKit } from 'nexusengine/domains/interaction/environmental-affordance';
import { createSimulationKit } from 'nexusengine/domains/simulation/runtime';
import { createMotionKit } from 'nexusengine/domains/simulation/motion';
import { createActionLocomotionKit } from 'nexusengine/domains/simulation/motion/locomotion';
import { createPresentationKit } from 'nexusengine/domains/presentation/registry';
import { createPresentationOutputKit } from 'nexusengine/domains/presentation/output';
import { createUIKit } from 'nexusengine/domains/presentation/ui';
import { createUIScaleKit } from 'nexusengine/domains/presentation/ui/scale';
import { createCameraKit } from 'nexusengine/domains/presentation/camera';
import { createGraphicsKit } from 'nexusengine/domains/presentation/graphics';
import { createRenderDomainContractKit } from 'nexusengine/domains/render/contract';
import { createRenderProviderContractKit } from 'nexusengine/domains/render/provider-contract';
import { createRenderFrameSchemaKit } from 'nexusengine/domains/render/frame-schema';
import {
  AUTHORED_OBJECTS,
  CHECKPOINTS,
  DEFAULT_TREE_COUNT,
  FOREST_SEED,
  GAME_ID,
  LOCATIONS,
  NEXUS_COMMIT,
  PRIMITIVE_COLORS,
  ROUTES,
  createAuthoredWalkability,
  createForestInstances
} from './content.js';
import { createAcrossTheCanopyStoryKit } from './story-kit.js';

export const WORLD_ID = 'atc:world/canopy';
export const SCENE_ID = 'atc:scene/greybox-vertical-slice';
export const PLAYER_ID = 'atc:player/ryn';
export const PLAYER_PLACEMENT_ID = 'atc:placement/player/ryn';
export const CAMERA_ID = 'atc:camera/first-person';
export const TREE_BATCH_ID = 'atc:batch/infinite-forest';
export const SAVE_RUNTIME_SCHEMA = 'atc.nexus-runtime/1';

const INITIAL_FOV = 78;
const clone = (value) => value === undefined ? undefined : structuredClone(value);

const LOCATION_ROUTE_LINKS = Object.freeze({
  'atc:route/starter-branch': ['atc:location/starter-perch', 'atc:location/trunk-route'],
  'atc:route/trunk-switchback': ['atc:location/trunk-route', 'atc:location/hanging-rows'],
  'atc:route/high-glide': ['atc:location/trunk-route', 'atc:location/hanging-rows'],
  'atc:route/rows-market-bridge': ['atc:location/hanging-rows', 'atc:location/low-market'],
  'atc:route/rows-market-glide': ['atc:location/hanging-rows', 'atc:location/low-market'],
  'atc:route/descent-line': ['atc:location/low-market', 'atc:location/old-descent-station'],
  'atc:route/station-return': ['atc:location/old-descent-station', 'atc:location/hanging-rows']
});

function vectorObject(value = [0, 0, 0]) {
  const source = Array.isArray(value) ? value : [value.x, value.y, value.z];
  return {
    x: Number(source[0]) || 0,
    y: Number(source[1]) || 0,
    z: Number(source[2]) || 0
  };
}

function vectorArray(value = { x: 0, y: 0, z: 0 }) {
  if (Array.isArray(value)) return value.slice(0, 3).map((entry) => Number(entry) || 0);
  return [Number(value.x) || 0, Number(value.y) || 0, Number(value.z) || 0];
}

function clampFov(value) {
  return Math.max(60, Math.min(120, Number(value) || INITIAL_FOV));
}

function eulerToQuaternion(value = [0, 0, 0]) {
  if (Array.isArray(value) && value.length === 4) {
    const magnitude = Math.hypot(...value.map(Number)) || 1;
    return value.map((entry) => Number(entry) / magnitude);
  }
  const [x, y, z] = Array.isArray(value) ? value.map(Number) : [0, 0, 0];
  const c1 = Math.cos(x / 2);
  const c2 = Math.cos(y / 2);
  const c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2);
  const s2 = Math.sin(y / 2);
  const s3 = Math.sin(z / 2);
  return [
    s1 * c2 * c3 + c1 * s2 * s3,
    c1 * s2 * c3 - s1 * c2 * s3,
    c1 * c2 * s3 + s1 * s2 * c3,
    c1 * c2 * c3 - s1 * s2 * s3
  ];
}

function visualSize(authoredObject) {
  if (Array.isArray(authoredObject.visual?.size)) {
    return authoredObject.visual.size.map((entry) => Math.max(0.1, Math.abs(Number(entry) || 0.1)));
  }
  const path = authoredObject.visual?.path;
  if (Array.isArray(path) && path.length > 0) {
    const axes = [0, 1, 2].map((axis) => path.map((point) => Number(point[axis]) || 0));
    const width = Math.max(0.5, Number(authoredObject.visual.width) || 0.5);
    return axes.map((values, axis) => Math.max(width, Math.max(...values) - Math.min(...values) || (axis === 1 ? width : 0.5)));
  }
  return [1, 1, 1];
}

function objectDescriptor(authoredObject) {
  const size = visualSize(authoredObject);
  const half = size.map((entry) => entry * 0.5);
  return {
    id: authoredObject.id,
    objectType: `greybox-${authoredObject.visual?.shape ?? 'primitive'}`,
    bounds: {
      min: half.map((entry) => -entry),
      max: half
    },
    pivot: [0, 0, 0],
    groundAnchor: [0, -half[1], 0],
    geometry: {
      provider: 'atc-greybox',
      descriptorId: `atc:primitive/${authoredObject.visual?.shape ?? 'box'}`
    },
    material: {
      provider: 'atc-greybox',
      descriptorId: `atc:material/${authoredObject.colorRole}`
    },
    lifecycle: { status: authoredObject.visual?.hidden ? 'suspended' : 'active' },
    metadata: {
      gameId: GAME_ID,
      authored: true,
      label: authoredObject.label,
      colorRole: authoredObject.colorRole,
      color: PRIMITIVE_COLORS[authoredObject.colorRole],
      visual: clone(authoredObject.visual),
      interaction: clone(authoredObject.interaction),
      authoredPosition: clone(authoredObject.position)
    }
  };
}

function placementIdFor(objectId) {
  return objectId === PLAYER_ID
    ? PLAYER_PLACEMENT_ID
    : `atc:placement/${String(objectId).replace(/^atc:/, '')}`;
}

function placementDescriptor(authoredObject) {
  return {
    id: placementIdFor(authoredObject.id),
    objectId: authoredObject.id,
    transform: {
      position: authoredObject.position,
      rotation: eulerToQuaternion(authoredObject.visual?.rotation),
      scale: [1, 1, 1]
    },
    metadata: {
      gameId: GAME_ID,
      stableObjectId: authoredObject.id,
      authored: true,
      colorRole: authoredObject.colorRole
    }
  };
}

function routeFieldConfig() {
  return {
    routeFieldDataset: {
      id: 'atc:route-field/authored-slice',
      markers: LOCATIONS.map((location, index) => ({
        id: location.id,
        kind: 'authored-location',
        x: location.center[0],
        y: location.center[2],
        radius: location.radius,
        active: true,
        metadata: {
          order: index,
          label: location.label,
          elevation: location.elevation,
          position: location.center
        }
      })),
      corridors: Object.values(ROUTES).map((route) => ({
        id: route.id,
        from: LOCATION_ROUTE_LINKS[route.id]?.[0] ?? null,
        to: LOCATION_ROUTE_LINKS[route.id]?.[1] ?? null,
        width: Math.max(2, Number(route.width) || 4),
        active: true,
        metadata: {
          label: route.label,
          mode: route.mode,
          path: route.path,
          requires: route.requires ?? null
        }
      }))
    }
  };
}

function landmarkConfig() {
  return {
    landmarkGuidanceDataset: {
      id: 'atc:landmarks/authored-slice',
      activeLandmarkId: LOCATIONS[0].id,
      landmarks: LOCATIONS.map((location, index) => ({
        id: location.id,
        kind: index === 4 ? 'discovery' : index === 2 ? 'safe-zone' : 'route-landmark',
        x: location.center[0],
        y: location.center[2],
        radius: location.radius,
        priority: index,
        active: true,
        discovered: index === 0,
        reached: index === 0,
        completed: false,
        metadata: {
          label: location.label,
          position: location.center,
          elevation: location.elevation
        }
      }))
    }
  };
}

function affordanceConfig() {
  return {
    environmentalAffordanceDataset: {
      id: 'atc:affordances/authored-slice',
      affordances: AUTHORED_OBJECTS
        .filter((entry) => entry.interaction)
        .map((entry) => ({
          id: entry.id,
          kind: entry.colorRole,
          action: entry.interaction.verb,
          x: entry.position[0],
          y: entry.position[2],
          radius: entry.interaction.range,
          target: 1,
          active: true,
          metadata: {
            label: entry.label,
            position: entry.position,
            stableObjectId: entry.id
          }
        }))
    }
  };
}

function inputConfig() {
  return {
    actions: {
      'atc:input/move': { id: 'atc:input/move', kind: 'axis-2d', semantic: 'move' },
      'atc:input/look': { id: 'atc:input/look', kind: 'axis-2d', semantic: 'look' },
      'atc:input/activate': { id: 'atc:input/activate', kind: 'button', semantic: 'activate' },
      'atc:input/cancel': { id: 'atc:input/cancel', kind: 'button', semantic: 'cancel' },
      'atc:input/journal': { id: 'atc:input/journal', kind: 'button', semantic: 'toggle-journal' },
      'atc:input/pause': { id: 'atc:input/pause', kind: 'button', semantic: 'toggle-pause' },
      'atc:input/fov': { id: 'atc:input/fov', kind: 'range', semantic: 'set-fov', minimum: 60, maximum: 120 }
    },
    contexts: {
      'atc:input-context/gameplay': { id: 'atc:input-context/gameplay', active: true, priority: 0 },
      'atc:input-context/dialogue': { id: 'atc:input-context/dialogue', active: true, priority: 1 }
    },
    bindings: {
      'atc:binding/keyboard-move': { id: 'atc:binding/keyboard-move', actionId: 'atc:input/move', devices: ['keyboard'] },
      'atc:binding/pointer-look': { id: 'atc:binding/pointer-look', actionId: 'atc:input/look', devices: ['pointer'] },
      'atc:binding/pointer-activate': { id: 'atc:binding/pointer-activate', actionId: 'atc:input/activate', devices: ['pointer'] }
    },
    descriptors: { frames: {} }
  };
}

function initialCameraDescriptor() {
  return {
    id: CAMERA_ID,
    kind: 'first-person',
    targetId: PLAYER_ID,
    position: [0, 87.62, 56],
    rotation: [0, Math.PI, 0],
    yaw: Math.PI,
    pitch: -0.04,
    fov: INITIAL_FOV,
    minimumFov: 60,
    maximumFov: 120,
    near: 0.08,
    far: 780,
    eyeOffset: [0, 1.62, 0],
    collision: { enabled: true, restorationSeconds: 0.18 },
    inspection: { enabled: true, active: false },
    metadata: { gameId: GAME_ID, authored: true }
  };
}

function initialUiDescriptors() {
  return {
    screens: {
      'atc:ui/gameplay': {
        id: 'atc:ui/gameplay',
        kind: 'gameplay-hud',
        visible: true,
        title: 'ACROSS THE CANOPY',
        subtitle: 'THE UPWARD SIGNAL · GREYBOX VERTICAL SLICE'
      }
    },
    controls: {
      'atc:ui/fov-slider': {
        id: 'atc:ui/fov-slider',
        kind: 'range',
        label: 'FIELD OF VIEW',
        value: INITIAL_FOV,
        minimum: 60,
        maximum: 120,
        step: 1,
        rect: { x: 0.77, y: 0.91, width: 0.2, height: 0.055 }
      }
    },
    prompts: {
      'atc:ui/interaction-hint': {
        id: 'atc:ui/interaction-hint',
        kind: 'interaction-hint',
        text: 'CLICK THE CYAN RING TO BEGIN'
      }
    }
  };
}

function graphicsConfig(treeCount) {
  return {
    descriptors: {
      worlds: {
        'atc:graphics/greybox-world': {
          id: 'atc:graphics/greybox-world',
          kind: 'greybox-world',
          worldId: WORLD_ID,
          palette: PRIMITIVE_COLORS,
          fog: { color: '#B7D5CA', density: 0.0085 },
          lighting: { ambient: 0.74, key: 1.15, keyDirection: [-0.45, 0.8, 0.25] },
          background: { top: '#8CCAC1', bottom: '#DCE8CF' }
        }
      }
    },
    instanceBatches: {
      batches: [{
        id: TREE_BATCH_ID,
        assetId: 'atc:primitive/tree',
        materialId: 'atc:material/forest',
        capacity: treeCount,
        updateMode: 'full',
        metadata: { gameId: GAME_ID, procedural: true, seed: FOREST_SEED }
      }]
    }
  };
}

function installWithReceipt(engine, kit) {
  engine.installKit(kit);
  engine.n.runtime?.recordInstallation?.({
    id: kit.id,
    domainPath: kit.metadata?.domainPath ?? null,
    apiName: kit.metadata?.apiName ?? null,
    version: kit.metadata?.version ?? null,
    provides: [...(kit.provides ?? [])]
  });
  return kit;
}

function createKits(options, treeCount) {
  const surface = options.surface ?? {};
  const sceneDescriptor = {
    id: SCENE_ID,
    title: 'Across the Canopy · The Upward Signal',
    kind: 'web-three-scene',
    entry: 'atc:scene-entry/greybox',
    restore: { checkpoint: CHECKPOINTS.starter.id },
    descriptors: { worldId: WORLD_ID, cameraId: CAMERA_ID },
    metadata: { gameId: GAME_ID, verticalSlice: true }
  };

  return [
    createDataKit(),
    createPersistenceKit({ descriptors: { saveSlots: {} } }),
    createSpatialKit(),
    createHostCapabilityKit({
      descriptors: {
        capabilities: {
          'atc:host/browser-or-headless': {
            id: 'atc:host/browser-or-headless',
            renderer: 'external-provider',
            input: 'external-adapter',
            storage: 'external-adapter',
            fallback: 'headless-deterministic'
          }
        }
      }
    }),
    createWorldDomain({ childDomains: false }),
    createProceduralGenerationKit({
      seed: String(options.seed ?? FOREST_SEED),
      width: 112,
      height: 112,
      cellSize: 4,
      regionCount: 12,
      roomSize: { min: 5, max: 12 },
      obstacleDensity: 0.04,
      categories: ['canopy', 'trunk', 'deep']
    }),
    createSceneKit({ scenes: [sceneDescriptor], initialSceneId: SCENE_ID }),
    createRouteFieldKit(routeFieldConfig()),
    createLandmarkGuidanceKit(landmarkConfig()),
    createNavMeshKit(),
    createPathfindingKit({ mode: 'navmesh3d', historyLimit: 30 }),
    createObjectRegistryKit(),
    createObjectPlacementKit(),
    createInteractionKit({ descriptors: { targets: {}, activations: {} } }),
    createInputKit(inputConfig()),
    createEnvironmentalAffordanceKit(affordanceConfig()),
    createSimulationKit(),
    createMotionKit(),
    createActionLocomotionKit({
      actorId: PLAYER_ID,
      speed: 10,
      sprintSpeed: 15,
      groundAcceleration: 34,
      airAcceleration: 12,
      groundDrag: 12,
      airDrag: 2.5,
      gravity: 22,
      jumpSpeed: 9,
      glideFallSpeed: 4,
      killY: 2,
      start: vectorObject(CHECKPOINTS.starter.position),
      grounded: true
    }),
    createPresentationKit({ config: { gameId: GAME_ID, cameraId: CAMERA_ID, uiId: 'atc:ui/gameplay' } }),
    createPresentationOutputKit({
      surface: {
        surfaceId: String(surface.surfaceId ?? 'atc:surface/main'),
        width: Number(surface.width ?? surface.cssWidth ?? 1280),
        height: Number(surface.height ?? surface.cssHeight ?? 720),
        pixelRatio: Number(surface.pixelRatio ?? 1)
      },
      policy: { referenceAspect: 16 / 9, frameMode: 'native', maximumPixelRatio: 2 }
    }),
    createUIKit({ descriptors: initialUiDescriptors() }),
    createUIScaleKit({
      policy: { referenceWidth: 1280, referenceHeight: 720, mode: 'expand', minimumScale: 0.5, maximumScale: 2 },
      viewport: { width: Number(surface.width ?? 1280), height: Number(surface.height ?? 720) }
    }),
    createCameraKit({ descriptors: { cameras: { [CAMERA_ID]: initialCameraDescriptor() } } }),
    createGraphicsKit(graphicsConfig(treeCount)),
    createRenderDomainContractKit(),
    createRenderProviderContractKit(),
    createRenderFrameSchemaKit(),
    createAcrossTheCanopyStoryKit({ coordinator: options.coordinator })
  ];
}

function registerAuthoredObjects(engine) {
  for (const authoredObject of AUTHORED_OBJECTS) {
    if (!engine.n.object.has(authoredObject.id)) {
      engine.n.object.register(objectDescriptor(authoredObject));
    }
    const descriptor = placementDescriptor(authoredObject);
    const existing = engine.n.objectPlacement.get(descriptor.id);
    if (existing) engine.n.objectPlacement.revise(descriptor.id, descriptor);
    else engine.n.objectPlacement.create(descriptor);
  }
}

function registerInteractionTargets(engine) {
  for (const authoredObject of AUTHORED_OBJECTS) {
    if (!authoredObject.interaction) continue;
    engine.n.interaction.setDescriptor('targets', authoredObject.id, {
      id: authoredObject.id,
      objectId: authoredObject.id,
      placementId: placementIdFor(authoredObject.id),
      label: authoredObject.label,
      verb: authoredObject.interaction.verb,
      range: authoredObject.interaction.range,
      position: authoredObject.position,
      colorRole: authoredObject.colorRole,
      active: true
    });
  }
}

function installForestBatch(engine, trees) {
  const batches = engine.n.graphics.instanceBatches;
  if (!batches.hasBatch(TREE_BATCH_ID)) {
    batches.createBatch({
      id: TREE_BATCH_ID,
      assetId: 'atc:primitive/tree',
      materialId: 'atc:material/forest',
      capacity: trees.length,
      updateMode: 'full',
      metadata: { gameId: GAME_ID, procedural: true, seed: FOREST_SEED }
    });
  }
  const cells = new Map();
  for (const tree of trees) {
    const cellId = String(tree.metadata?.cell ?? 'background');
    if (!cells.has(cellId)) cells.set(cellId, []);
    cells.get(cellId).push(tree);
  }
  for (const [cellId, instances] of cells) batches.replaceCell(TREE_BATCH_ID, cellId, instances);
  batches.retainCells(TREE_BATCH_ID, [...cells.keys()]);
  return batches.flush(TREE_BATCH_ID);
}

function initializeWorld(engine, options) {
  const partition = createUniformGridPartition({
    id: 'atc:partition/canopy-stream',
    cellSize: 128,
    radius: 1
  });
  const surface = createFlatWorldSurface({ id: 'atc:surface/canopy-coordinates' });
  engine.n.world.registerWorld({
    id: WORLD_ID,
    seed: String(options.seed ?? FOREST_SEED),
    partition,
    surface,
    providers: [],
    focus: { entityId: PLAYER_ID, position: vectorObject(CHECKPOINTS.starter.position) },
    settings: { authoredRegion: SCENE_ID, proceduralBackground: true }
  });
  engine.n.world.setFocus(WORLD_ID, {
    entityId: PLAYER_ID,
    position: vectorObject(CHECKPOINTS.starter.position)
  });
  engine.n.world.updateWorld(WORLD_ID);

  const procedural = engine.n.proceduralGeneration.getGeneratedSnapshot();
  const walkability = createAuthoredWalkability(procedural);
  engine.n.navmesh.rebuild({
    operationId: 'atc:navmesh/rebuild/initial',
    id: 'atc:navmesh/authored-slice',
    sourceSignature: procedural.signature,
    walkability,
    heightOffset: 0
  });
  return { procedural, walkability };
}

function initializePresentation(engine) {
  const output = engine.n.presentationOutput.getDescriptor();
  engine.n.uiScale.setViewport(output.frame.visibleViewport);
  return output;
}

function descriptorGroups(api, patch, defaultType) {
  if (!patch || typeof patch !== 'object') return;
  const source = patch.descriptors ?? patch;
  if (source.id) {
    const type = String(source.descriptorType ?? defaultType);
    const current = api.getDescriptors(type)?.[source.id] ?? {};
    api.setDescriptor(type, source.id, { ...current, ...clone(source) });
    return;
  }
  for (const [type, group] of Object.entries(source)) {
    const values = Array.isArray(group)
      ? group
      : group?.id
        ? [group]
        : Object.entries(group ?? {}).map(([id, value]) => ({ id, ...value }));
    for (const value of values) {
      if (!value?.id) continue;
      const current = api.getDescriptors(type)?.[value.id] ?? {};
      api.setDescriptor(type, value.id, { ...current, ...clone(value) });
    }
  }
}

function treeInstancesFromGraphics(engine) {
  const snapshot = engine.n.graphics.instanceBatches.getSnapshot();
  const batch = snapshot.batches.find((entry) => entry.id === TREE_BATCH_ID);
  return (batch?.cells ?? []).flatMap((cell) => cell.instances).sort((left, right) => left.id.localeCompare(right.id));
}

/**
 * Creates the deterministic Nexus authority graph for Across the Canopy.
 * Concrete input, storage, hit-testing, and Render providers are injected by
 * the host composition; this module deliberately owns none of those handles.
 */
export function createAcrossTheCanopyRuntime(options = {}) {
  const treeCount = Math.max(1000, Math.floor(Number(options.treeCount ?? DEFAULT_TREE_COUNT)));
  const engine = createEngine({
    tick: { maxDelta: 1 / 15 },
    clock: { delta: 1 / 60, elapsed: 0, frame: 0 }
  });
  for (const kit of createKits(options, treeCount)) installWithReceipt(engine, kit);

  const worldInitialization = initializeWorld(engine, options);
  registerAuthoredObjects(engine);
  registerInteractionTargets(engine);
  const trees = createForestInstances({ seed: Number(options.seed ?? FOREST_SEED), count: treeCount });
  const initialTreeFlush = installForestBatch(engine, trees);
  initializePresentation(engine);

  function getPlayer() {
    const placement = engine.n.objectPlacement.get(PLAYER_PLACEMENT_ID);
    const camera = engine.n.camera.getDescriptors('cameras')?.[CAMERA_ID] ?? initialCameraDescriptor();
    return {
      id: PLAYER_ID,
      placementId: PLAYER_PLACEMENT_ID,
      position: clone(placement?.transform?.position ?? CHECKPOINTS.starter.position),
      rotation: clone(placement?.transform?.rotation ?? [0, 0, 0, 1]),
      scale: clone(placement?.transform?.scale ?? [1, 1, 1]),
      fov: clampFov(camera.fov),
      locomotion: clone(engine.n.actionLocomotion.getState())
    };
  }

  function setPlayer(input = {}) {
    const current = engine.n.objectPlacement.get(PLAYER_PLACEMENT_ID);
    const position = input.position === undefined ? current.transform.position : vectorArray(input.position);
    const rotation = input.rotation === undefined ? current.transform.rotation : eulerToQuaternion(input.rotation);
    engine.n.objectPlacement.revise(PLAYER_PLACEMENT_ID, {
      transform: { ...current.transform, position, rotation }
    });

    const locomotion = engine.n.actionLocomotion.getSnapshot();
    engine.n.actionLocomotion.loadSnapshot({
      ...locomotion,
      position: vectorObject(position),
      velocity: input.velocity ? vectorObject(input.velocity) : { x: 0, y: 0, z: 0 },
      grounded: input.grounded !== false,
      recoveryRequired: null
    });
    engine.n.world.setFocus(WORLD_ID, { entityId: PLAYER_ID, position: vectorObject(position) });
    if (input.fov !== undefined) setPresentation({ fov: input.fov });
    return getPlayer();
  }

  function getPresentation() {
    return {
      root: engine.n.presentation.getSnapshot(),
      output: engine.n.presentationOutput.getDescriptor(),
      uiScale: engine.n.uiScale.getDescriptor(),
      cameras: engine.n.camera.getDescriptors('cameras'),
      ui: engine.n.ui.getDescriptors(),
      graphics: engine.n.graphics.getSnapshot()
    };
  }

  function setOutput(widthOrSurface, height, pixelRatio = 1) {
    const surface = typeof widthOrSurface === 'object'
      ? widthOrSurface
      : { width: widthOrSurface, height, pixelRatio };
    const descriptor = engine.n.presentationOutput.setSurface({
      ...engine.n.presentationOutput.getSurface(),
      ...surface,
      cssWidth: Number(surface.cssWidth ?? surface.width ?? 0),
      cssHeight: Number(surface.cssHeight ?? surface.height ?? 0),
      pixelRatio: Number(surface.pixelRatio ?? pixelRatio ?? 1)
    });
    engine.n.uiScale.setViewport(descriptor.frame.visibleViewport);
    return descriptor;
  }

  function setPresentation(patch = {}) {
    if (patch.root || patch.presentation) engine.n.presentation.configure(patch.root ?? patch.presentation);
    if (patch.output) setOutput(patch.output);
    if (patch.camera) descriptorGroups(engine.n.camera, patch.camera, 'cameras');
    if (patch.ui) descriptorGroups(engine.n.ui, patch.ui, 'screens');
    if (patch.graphics) descriptorGroups(engine.n.graphics, patch.graphics, 'worlds');
    if (patch.fov !== undefined) {
      const cameras = engine.n.camera.getDescriptors('cameras');
      const camera = cameras[CAMERA_ID] ?? initialCameraDescriptor();
      const fov = clampFov(patch.fov);
      engine.n.camera.setDescriptor('cameras', CAMERA_ID, { ...camera, fov });
      const control = engine.n.ui.getDescriptors('controls')?.['atc:ui/fov-slider'];
      if (control) engine.n.ui.setDescriptor('controls', control.id, { ...control, value: fov });
    }
    return getPresentation();
  }

  function dispatchAction(action = {}) {
    const interactionState = engine.n.interaction.getState();
    const sequence = Math.max(1, Math.floor(Number(action.sequence ?? interactionState.sequence + 1)));
    const operationId = String(action.operationId ?? `atc:action/${sequence}`);
    const activation = {
      ...clone(action),
      operationId,
      sequence,
      source: String(action.source ?? 'semantic-input'),
      targetId: action.targetId == null ? null : String(action.targetId)
    };
    engine.n.interaction.setDescriptor('activations', operationId, activation);
    engine.n.interaction.setDescriptor('lastActivation', 'atc:interaction/last', activation);
    return clone(activation);
  }

  function tick(delta = 1 / 60) {
    engine.tick(delta);
    return {
      clock: clone(engine.clock),
      commit: engine.getLastTickCommit(),
      story: engine.n.acrossTheCanopy.getState()
    };
  }

  function runtimeSavePayload() {
    const player = getPlayer();
    return {
      schema: SAVE_RUNTIME_SCHEMA,
      gameId: GAME_ID,
      nexusCommit: NEXUS_COMMIT,
      story: engine.n.acrossTheCanopy.createSavePayload({ position: player.position, fov: player.fov }),
      objectPlacement: engine.n.objectPlacement.getSnapshot(),
      locomotion: engine.n.actionLocomotion.getSnapshot(),
      presentation: {
        root: engine.n.presentation.getSnapshot(),
        output: engine.n.presentationOutput.getSnapshot(),
        uiScale: engine.n.uiScale.getSnapshot(),
        camera: engine.n.camera.getSnapshot(),
        ui: engine.n.ui.getSnapshot()
      },
      scene: engine.n.scene.getSnapshot(),
      savedAtFrame: engine.clock.frame
    };
  }

  function save(slotId = 'autosave') {
    const payload = runtimeSavePayload();
    const id = String(slotId);
    engine.n.persistence.setDescriptor('saveSlots', id, {
      id,
      schema: SAVE_RUNTIME_SCHEMA,
      payload,
      savedAtFrame: engine.clock.frame
    });
    return clone(payload);
  }

  function load(payloadOrSlotId = 'autosave') {
    const payload = typeof payloadOrSlotId === 'string'
      ? engine.n.persistence.getDescriptors('saveSlots')?.[payloadOrSlotId]?.payload
      : payloadOrSlotId;
    if (!payload || payload.schema !== SAVE_RUNTIME_SCHEMA) {
      throw new TypeError(`Unsupported Across the Canopy runtime save: ${payload?.schema ?? 'missing'}.`);
    }
    engine.n.acrossTheCanopy.loadSavePayload(payload.story);
    if (payload.objectPlacement) engine.n.objectPlacement.loadSnapshot(payload.objectPlacement);
    if (payload.locomotion) engine.n.actionLocomotion.loadSnapshot(payload.locomotion);
    if (payload.presentation?.root) engine.n.presentation.loadSnapshot(payload.presentation.root);
    if (payload.presentation?.output) engine.n.presentationOutput.loadSnapshot(payload.presentation.output);
    if (payload.presentation?.uiScale) engine.n.uiScale.loadSnapshot(payload.presentation.uiScale);
    if (payload.presentation?.camera) engine.n.camera.loadSnapshot(payload.presentation.camera);
    if (payload.presentation?.ui) engine.n.ui.loadSnapshot(payload.presentation.ui);
    if (payload.scene) engine.n.scene.loadSceneSnapshot(payload.scene);
    engine.n.interaction.reset();
    registerInteractionTargets(engine);
    const player = payload.story?.player;
    if (player?.position) setPlayer({ position: player.position, fov: player.fov });
    return { story: engine.n.acrossTheCanopy.getState(), player: getPlayer() };
  }

  function reset() {
    engine.n.acrossTheCanopy.reset();
    engine.n.simulation.reset();
    engine.n.motion.reset();
    engine.n.actionLocomotion.reset();
    engine.n.objectPlacement.reset();
    engine.n.interaction.reset();
    engine.n.input.reset();
    engine.n.scene.reset();
    engine.n.presentation.reset();
    engine.n.presentationOutput.reset();
    engine.n.uiScale.reset();
    engine.n.camera.reset();
    engine.n.ui.reset();
    engine.n.graphics.reset();
    registerAuthoredObjects(engine);
    registerInteractionTargets(engine);
    installForestBatch(engine, trees);
    initializePresentation(engine);
    engine.n.world.setFocus(WORLD_ID, { entityId: PLAYER_ID, position: vectorObject(CHECKPOINTS.starter.position) });
    return { story: engine.n.acrossTheCanopy.getState(), player: getPlayer() };
  }

  function getTreeBatch() {
    return clone(engine.n.graphics.instanceBatches.getSnapshot().batches.find((entry) => entry.id === TREE_BATCH_ID) ?? null);
  }

  const capabilities = Object.freeze({
    nexus: Object.freeze({
      version: '0.0.4',
      commit: NEXUS_COMMIT,
      installedKitIds: Object.freeze(engine.kits.map((kit) => kit.id)),
      domainPaths: Object.freeze(engine.n.paths().map((entry) => entry.path))
    }),
    composed: Object.freeze({
      runtime: true,
      persistenceContract: true,
      spatial: true,
      hostCapabilities: true,
      worldStreaming: true,
      proceduralGeneration: true,
      scene: true,
      authoredRoutes: true,
      landmarks: true,
      navmesh3d: true,
      pathfinding: true,
      objectRegistry: true,
      objectPlacement: true,
      interaction: true,
      semanticInput: true,
      environmentalAffordances: true,
      actionLocomotion: true,
      presentation: true,
      uiScale: true,
      graphicsInstanceBatches: true,
      renderContract: true,
      renderProviderValidation: true,
      renderFrameValidation: true,
      productStory: true
    }),
    productOwned: Object.freeze({ storyRules: true, authoredPlacement: true, routeConsequences: true }),
    hostRequired: Object.freeze({
      concreteRenderProvider: 'Not supplied by NexusEngine 0.0.4; inject at the composition root.',
      presentationToRenderProjection: 'Product-local pure translator required.',
      deviceInputAdapter: 'Host-local adapter required.',
      hitTestingAdapter: 'Host-local adapter required.',
      persistenceTransport: 'Host-local storage adapter required; Nexus owns portable slots and snapshots.'
    })
  });

  const facade = {
    engine,
    tick,
    dispatchAction,
    getStory: () => engine.n.acrossTheCanopy.getState(),
    getPlayer,
    setPlayer,
    getPlacements: () => engine.n.objectPlacement.list(),
    setPresentation,
    getPresentation,
    setOutput,
    save,
    load,
    reset,
    getTrees: () => treeInstancesFromGraphics(engine),
    getTreeBatch,
    initialTreeFlush: clone(initialTreeFlush),
    worldInitialization: clone({
      proceduralSignature: worldInitialization.procedural.signature,
      walkableCellCount: worldInitialization.walkability.cells.filter((cell) => cell.walkable).length,
      navmesh: engine.n.navmesh.getGraph()
    }),
    capabilities
  };
  Object.defineProperty(facade, 'trees', {
    enumerable: true,
    get: () => treeInstancesFromGraphics(engine)
  });
  return Object.freeze(facade);
}
