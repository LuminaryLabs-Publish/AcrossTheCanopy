import { validateRenderProvider } from 'nexusengine/domains/render/provider-contract';
import { assertPresentationPacket } from '../game/presentation-projection.js';
import { createBitmapTexture, updateBitmapTexture } from './bitmap-texture.js';

const VERSION = '0.1.0-greybox';
const clone = (value) => value === undefined ? undefined : structuredClone(value);

function disposeObject(root) {
  root?.traverse?.((entry) => {
    entry.geometry?.dispose?.();
    if (Array.isArray(entry.material)) entry.material.forEach((material) => material?.dispose?.());
    else entry.material?.dispose?.();
  });
}

function transformUiNodes(nodes, width, height) {
  return nodes.map((node) => {
    const boxWidth = node.maxWidth == null ? Math.round(92 * width / 100) : Math.max(1, Math.round(node.maxWidth * width / 100));
    const anchorX = Math.round((node.x ?? 0) * width / 100);
    const x = node.kind === 'text' && node.align === 'center'
      ? anchorX - Math.round(boxWidth * 0.5)
      : node.kind === 'text' && node.align === 'right'
        ? anchorX - boxWidth
        : anchorX;
    const y = Math.round((node.y ?? 0) * height / 100);
    const mapped = {
      ...node,
      x,
      y,
      width: node.width == null ? undefined : Math.max(1, Math.round(node.width * width / 100)),
      height: node.height == null ? undefined : Math.max(1, Math.round(node.height * height / 100)),
      maxWidth: node.kind === 'text' ? boxWidth : node.maxWidth == null ? undefined : boxWidth,
      border: node.stroke ?? node.border,
      scale: Math.max(1, Math.round(Number(node.scale ?? 1) * width / 640))
    };
    return mapped;
  });
}

function cylinderBetween(THREE, start, end, radius, material, radialSegments = 8) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const delta = new THREE.Vector3().subVectors(b, a);
  const geometry = new THREE.CylinderGeometry(radius, radius * 1.06, delta.length(), radialSegments, 1, false);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(THREE, size, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function applyLocalRotation(group, rotation = [0, 0, 0]) {
  group.rotation.set(Number(rotation[0] ?? 0), Number(rotation[1] ?? 0), Number(rotation[2] ?? 0));
}

function buildRoute(THREE, group, visual, material) {
  const points = (visual.path ?? []).map((point) => [point[0], point[1] - 0.92, point[2]]);
  for (let index = 1; index < points.length; index += 1) {
    const radius = Math.max(0.08, Number(visual.width ?? 1) * 0.075);
    const segment = cylinderBetween(THREE, points[index - 1], points[index], radius, material, visual.dashed ? 6 : 10);
    segment.userData.routeSegment = index - 1;
    group.add(segment);
  }
  for (const point of points) {
    const marker = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.12, Number(visual.width ?? 1) * 0.1), 7, 5), material);
    marker.position.set(...point);
    marker.castShadow = true;
    group.add(marker);
  }
}

function buildVisual(THREE, descriptor, material) {
  const visual = descriptor.metadata?.visual ?? {};
  const shape = visual.shape ?? 'box';
  const size = visual.size ?? [1, 1, 1];
  const group = new THREE.Group();

  if (shape === 'route') {
    buildRoute(THREE, group, visual, material);
    group.userData.absoluteGeometry = true;
    return group;
  }

  if (shape === 'ring') {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(size[0] * 0.5, Math.max(0.08, size[1] * 0.5), 8, 28), material);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = -0.9;
    group.add(mesh);
  } else if (shape === 'platform' || shape === 'zone' || shape === 'market' || shape === 'station') {
    group.add(box(THREE, size, material));
    const railMaterial = material.clone();
    railMaterial.transparent = true;
    railMaterial.opacity = 0.72;
    const halfX = size[0] * 0.45;
    const halfZ = size[2] * 0.45;
    const railY = size[1] * 0.75 + 1.15;
    for (const z of [-halfZ, halfZ]) {
      const rail = box(THREE, [size[0] * 0.88, 0.22, 0.22], railMaterial);
      rail.position.set(0, railY, z);
      group.add(rail);
    }
    for (const x of [-halfX, halfX]) {
      const rail = box(THREE, [0.22, 0.22, size[2] * 0.88], railMaterial);
      rail.position.set(x, railY, 0);
      group.add(rail);
    }
  } else if (shape === 'trunk') {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(size[0] * 0.42, size[0] * 0.58, size[1], 12), material);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  } else if (shape === 'spindle') {
    const core = new THREE.Mesh(new THREE.CylinderGeometry(size[0] * 0.25, size[0] * 0.42, size[1], 10), material);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(size[0] * 0.52, 0.08, 6, 20), material);
    ring.rotation.x = Math.PI / 2;
    group.add(core, ring);
  } else if (shape === 'character') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(size[0] * 0.38, size[0] * 0.5, size[1] * 0.7, 10), material);
    const head = new THREE.Mesh(new THREE.SphereGeometry(size[0] * 0.36, 12, 9), material);
    head.position.y = size[1] * 0.52;
    group.add(body, head);
  } else if (shape === 'lantern' || shape === 'beacon') {
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(size[0] * 0.42, size[0] * 0.55, size[1], 8), material);
    const glowMaterial = new THREE.MeshBasicMaterial({ color: material.color, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(size[0] * 0.82, 12, 8), glowMaterial);
    group.add(cage, glow);
  } else if (shape === 'hanging-rows') {
    const beam = box(THREE, [size[0], 0.45, 0.45], material);
    beam.position.y = size[1] * 0.42;
    group.add(beam);
    for (let index = -3; index <= 3; index += 1) {
      const line = box(THREE, [0.12, size[1] * 0.72, 0.12], material);
      line.position.set(index * size[0] / 8, 0, 0);
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 6), material);
      fruit.position.set(index * size[0] / 8, -size[1] * 0.3, 0);
      group.add(line, fruit);
    }
  } else if (shape === 'dial') {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(size[0] * 0.5, size[0] * 0.5, size[2], 16), material);
    mesh.rotation.x = Math.PI / 2;
    group.add(mesh);
    const pointer = box(THREE, [0.14, size[0] * 0.65, 0.16], material);
    pointer.position.z = size[2] * 0.6;
    group.add(pointer);
  } else if (shape === 'cell') {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(size[0] * 0.58, 1), material);
    group.add(mesh);
  } else if (shape === 'boundary') {
    const mesh = box(THREE, size, material);
    mesh.material.transparent = true;
    mesh.material.opacity = 0.34;
    group.add(mesh);
  } else {
    group.add(box(THREE, size, material));
  }

  applyLocalRotation(group, visual.rotation);
  return group;
}

function createMaterial(THREE, color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: options.roughness ?? 0.72,
    metalness: options.metalness ?? 0.06,
    emissive: new THREE.Color(color).multiplyScalar(options.emissive ?? 0.035),
    transparent: options.transparent === true,
    opacity: options.opacity ?? 1,
    side: options.doubleSide ? THREE.DoubleSide : THREE.FrontSide
  });
}

function buildForest(THREE, trees) {
  const group = new THREE.Group();
  group.name = 'n:world:forest-instance-batch';
  const count = trees.length;
  const detailedCount = Math.min(96, count);
  const trunkGeometry = new THREE.CylinderGeometry(1.35, 2.4, 48, 3, 1);
  const crownGeometry = new THREE.ConeGeometry(8.2, 22, 3, 1);
  const trunkMaterial = new THREE.MeshBasicMaterial({ color: 0x263f33 });
  const crownMaterial = new THREE.MeshBasicMaterial({ color: 0x3f765a });
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, detailedCount);
  const crowns = new THREE.InstancedMesh(crownGeometry, crownMaterial, detailedCount);
  const dummy = new THREE.Object3D();
  const pointPositions = new Float32Array(count * 3);
  const pointColors = new Float32Array(count * 3);
  const color = new THREE.Color();
  trees.forEach((tree, index) => {
    const [x, y, z] = tree.position;
    const [sx, sy, sz] = tree.scale;
    pointPositions[index * 3] = x;
    pointPositions[index * 3 + 1] = y + 54 * sy;
    pointPositions[index * 3 + 2] = z;
    color.setHSL(0.37 + Number(tree.metadata?.shade ?? 0) * 0.035, 0.34, 0.32 + Number(tree.metadata?.shade ?? 0) * 0.14);
    pointColors[index * 3] = color.r;
    pointColors[index * 3 + 1] = color.g;
    pointColors[index * 3 + 2] = color.b;
  });
  for (let index = 0; index < detailedCount; index += 1) {
    const tree = trees[Math.floor(index * count / detailedCount)];
    const [x, y, z] = tree.position;
    const [sx, sy, sz] = tree.scale;
    dummy.position.set(x, y + 24 * sy, z);
    dummy.rotation.set(0, tree.metadata?.yaw ?? 0, 0);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    trunks.setMatrixAt(index, dummy.matrix);
    dummy.position.set(x, y + 51 * sy, z);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    crowns.setMatrixAt(index, dummy.matrix);
  }
  for (const mesh of [trunks, crowns]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    group.add(mesh);
  }
  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3));
  pointGeometry.setAttribute('color', new THREE.BufferAttribute(pointColors, 3));
  const pointCloud = new THREE.Points(pointGeometry, new THREE.PointsMaterial({ size: 3.4, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.82 }));
  pointCloud.frustumCulled = true;
  group.add(pointCloud);
  group.userData.treeCount = count;
  return group;
}

function createBackdrop(THREE) {
  const group = new THREE.Group();
  group.name = 'n:presentation:atmosphere';
  const voidMaterial = new THREE.MeshBasicMaterial({ color: 0x091914, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
  const voidPlane = new THREE.Mesh(new THREE.CircleGeometry(520, 24), voidMaterial);
  voidPlane.rotation.x = -Math.PI / 2;
  voidPlane.position.y = -58;
  group.add(voidPlane);
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    const radius = 150 + (index % 4) * 31;
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(24 + index % 3 * 8, 6, 4),
      new THREE.MeshBasicMaterial({ color: index % 2 ? 0xb4c7b9 : 0x8aa99b, transparent: true, opacity: 0.055, depthWrite: false })
    );
    cloud.scale.set(2.5, 0.35, 1.2);
    cloud.position.set(Math.cos(angle) * radius, 38 + (index % 5) * 11, Math.sin(angle) * radius - 32);
    group.add(cloud);
  }
  return group;
}

export function createThreeRenderProvider({ THREE, canvas = null, width = 1280, height = 720, pixelRatio = 1, rendererFactory = null } = {}) {
  if (!THREE?.Scene || !THREE?.PerspectiveCamera) throw new TypeError('A complete THREE namespace is required.');
  let renderer = null;
  let initialized = false;
  let packet = null;
  let frame = 0;
  let forestSignature = '';
  let forest = null;
  let uiTexture = null;
  let uiMesh = null;
  let lastUiSignature = '';
  const resources = new Map();
  const objectGroups = new Map();
  const pickTargets = [];
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(78, width / height, 0.08, 700);
  camera.rotation.order = 'YXZ';
  scene.background = new THREE.Color(0x8eaa9d);
  scene.fog = new THREE.FogExp2(0x77988a, 0.0065);
  scene.add(camera);
  scene.add(createBackdrop(THREE));

  const hemisphere = new THREE.HemisphereLight(0xdff2df, 0x17291f, 2.15);
  const sun = new THREE.DirectionalLight(0xfff4cf, 2.4);
  sun.position.set(-42, 128, 60);
  sun.castShadow = false;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -95;
  sun.shadow.camera.right = 95;
  sun.shadow.camera.top = 95;
  sun.shadow.camera.bottom = -95;
  sun.shadow.camera.far = 320;
  scene.add(hemisphere, sun);

  function updateUi(nodes, output) {
    const textureWidth = 640;
    const textureHeight = Math.max(320, Math.round(textureWidth / Math.max(0.5, output.width / output.height)));
    const mapped = transformUiNodes(nodes, textureWidth, textureHeight);
    const signature = JSON.stringify(mapped);
    if (signature === lastUiSignature) return;
    const descriptor = { width: textureWidth, height: textureHeight, background: '#00000000', border: false, layers: mapped };
    if (!uiTexture) {
      uiTexture = createBitmapTexture(THREE, descriptor, { width: textureWidth, height: textureHeight });
      uiTexture.flipY = true;
      const material = new THREE.MeshBasicMaterial({ map: uiTexture, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
      uiMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
      uiMesh.position.set(0, 0, -0.62);
      uiMesh.renderOrder = 10000;
      uiMesh.frustumCulled = false;
      camera.add(uiMesh);
    } else {
      updateBitmapTexture(THREE, uiTexture, descriptor, { width: textureWidth, height: textureHeight });
      uiTexture.flipY = true;
      uiTexture.needsUpdate = true;
    }
    const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * 0.62;
    uiMesh.scale.set(viewHeight * camera.aspect, viewHeight, 1);
    lastUiSignature = signature;
  }

  function synchronizeForest(trees) {
    const signature = `${trees.length}:${trees[0]?.id ?? 'none'}:${trees.at(-1)?.id ?? 'none'}`;
    if (signature === forestSignature) return;
    if (forest) {
      scene.remove(forest);
      disposeObject(forest);
    }
    forest = buildForest(THREE, trees);
    scene.add(forest);
    forestSignature = signature;
  }

  function synchronizeObjects(nextPacket) {
    const activeIds = new Set();
    pickTargets.length = 0;
    for (const descriptor of nextPacket.objects) {
      activeIds.add(descriptor.id);
      let group = objectGroups.get(descriptor.id);
      if (!group) {
        const role = descriptor.metadata?.colorRole ?? 'structure';
        const color = nextPacket.primitiveColors[role] ?? nextPacket.primitiveColors.structure;
        const material = createMaterial(THREE, color, { emissive: descriptor.metadata?.visual?.pulse ? 0.18 : 0.035 });
        group = buildVisual(THREE, descriptor, material);
        group.name = descriptor.id;
        group.userData.objectId = descriptor.id;
        group.userData.interaction = clone(descriptor.metadata?.interaction ?? null);
        group.traverse((entry) => {
          if (entry.isMesh) {
            entry.userData.objectId = descriptor.id;
            entry.userData.interaction = clone(descriptor.metadata?.interaction ?? null);
          }
        });
        objectGroups.set(descriptor.id, group);
        scene.add(group);
      }
      const transform = descriptor.transform ?? {};
      if (!group.userData.absoluteGeometry) {
        group.position.set(...(transform.position ?? [0, 0, 0]));
        const rotation = transform.rotation ?? [0, 0, 0, 1];
        group.quaternion.set(rotation[0], rotation[1], rotation[2], rotation[3]);
        group.scale.set(...(transform.scale ?? [1, 1, 1]));
      }
      const isShutter = descriptor.id === 'atc:blocker/descent-shutter';
      group.visible = descriptor.visible !== false && (!isShutter || !nextPacket.story.flags.descent_lock_open);
      if (descriptor.id === 'atc:npc/sela-oren' && nextPacket.worldState.returned_to_rows) group.position.set(8, 72.1, -18);
      group.traverse((entry) => {
        if (!entry.isMesh) return;
        const focused = descriptor.id === nextPacket.focusId;
        if (entry.material?.emissive) {
          const base = entry.material.color.clone();
          entry.material.emissive.copy(base).multiplyScalar(focused ? 0.58 : descriptor.metadata?.visual?.pulse ? 0.18 : 0.035);
        }
        if (descriptor.metadata?.interaction && group.visible) pickTargets.push(entry);
      });
    }
    for (const [id, group] of objectGroups) {
      if (!activeIds.has(id)) {
        scene.remove(group);
        disposeObject(group);
        objectGroups.delete(id);
      }
    }
  }

  function applyPacket(nextPacket) {
    packet = assertPresentationPacket(nextPacket);
    const output = packet.output ?? { width, height, pixelRatio };
    camera.aspect = Math.max(1, output.width) / Math.max(1, output.height);
    camera.fov = packet.camera.fov;
    camera.near = packet.camera.near ?? 0.08;
    camera.far = packet.camera.far ?? 700;
    camera.position.set(...packet.camera.position);
    camera.rotation.set(packet.camera.pitch, packet.camera.yaw, 0, 'YXZ');
    camera.updateProjectionMatrix();
    if (uiMesh) {
      const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * 0.62;
      uiMesh.scale.set(viewHeight * camera.aspect, viewHeight, 1);
    }
    synchronizeForest(packet.trees);
    synchronizeObjects(packet);
    updateUi(packet.ui, output);
    const pulse = 0.5 + 0.5 * Math.sin(packet.elapsed * 3.2);
    const spindle = objectGroups.get('atc:story/echo-spindle');
    if (spindle) spindle.rotation.y = packet.elapsed * 0.7;
    for (const choiceId of ['atc:choice/answer-beacon', 'atc:choice/recover-cell']) {
      const choice = objectGroups.get(choiceId);
      if (choice) choice.scale.setScalar(1 + pulse * 0.08);
    }
  }

  const provider = {
    id: 'atc:provider/three-webgl',
    version: VERSION,
    replayStable: true,
    capabilities: {
      backend: 'three-webgl',
      presentationPackets: ['atc.presentation-packet/1'],
      deterministicHeadlessScene: true,
      instancing: true,
      bitmapUi: true,
      picking: true
    },
    async initialize(options = {}) {
      if (initialized) return { status: 'ready', reused: true };
      const surface = options.surface ?? canvas;
      width = Math.max(1, Number(options.width ?? surface?.clientWidth ?? width));
      height = Math.max(1, Number(options.height ?? surface?.clientHeight ?? height));
      pixelRatio = Math.max(0.5, Math.min(2, Number(options.pixelRatio ?? pixelRatio)));
      if (surface || rendererFactory) {
        renderer = rendererFactory
          ? await rendererFactory({ THREE, surface, width, height, pixelRatio })
          : new THREE.WebGLRenderer({ canvas: surface, antialias: true, alpha: false, powerPreference: 'high-performance' });
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height, false);
        renderer.shadowMap.enabled = false;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;
      }
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      initialized = true;
      return { status: 'ready', width, height, pixelRatio, backend: renderer ? 'webgl' : 'scene-only' };
    },
    async createResource(resource = {}) {
      const id = String(resource.id ?? `resource:${resources.size + 1}`);
      resources.set(id, clone(resource));
      return { id, status: 'created' };
    },
    async updateResource(id, patch = {}) {
      const key = typeof id === 'object' ? String(id.id) : String(id);
      resources.set(key, { ...(resources.get(key) ?? {}), ...clone(patch) });
      return { id: key, status: 'updated' };
    },
    async releaseResource(id) {
      const key = typeof id === 'object' ? String(id.id) : String(id);
      return { id: key, released: resources.delete(key) };
    },
    async beginFrame(frameDescriptor = {}) {
      frame = Number(frameDescriptor.frame ?? frame + 1);
      return { frame, status: 'begun' };
    },
    async executePass(pass = {}) {
      const nextPacket = pass.packet ?? pass.presentation ?? pass;
      applyPacket(nextPacket);
      return { frame, passId: String(pass.id ?? 'atc:pass/main'), status: 'executed', revision: packet.revision };
    },
    async submitFrame() {
      if (renderer) renderer.render(scene, camera);
      return { frame, status: 'submitted', rendered: Boolean(renderer) };
    },
    async reset() {
      packet = null;
      frame = 0;
      resources.clear();
      lastUiSignature = '';
      return { status: 'reset' };
    },
    async dispose() {
      for (const group of objectGroups.values()) disposeObject(group);
      objectGroups.clear();
      if (forest) disposeObject(forest);
      if (uiMesh) disposeObject(uiMesh);
      uiTexture?.dispose?.();
      renderer?.dispose?.();
      resources.clear();
      initialized = false;
      return { status: 'disposed' };
    },
    getSnapshot() {
      return { version: VERSION, frame, initialized, packetRevision: packet?.revision ?? null, forestSignature, objectIds: [...objectGroups.keys()].sort() };
    },
    async loadSnapshot(snapshot = {}) {
      frame = Math.max(0, Number(snapshot.frame ?? 0));
      return provider.getSnapshot();
    },
    async recover() {
      renderer?.resetState?.();
      return { status: 'ready', recovered: true };
    },
    async resizeSurface(options = {}) {
      width = Math.max(1, Number(options.width ?? width));
      height = Math.max(1, Number(options.height ?? height));
      pixelRatio = Math.max(0.5, Math.min(2, Number(options.pixelRatio ?? pixelRatio)));
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer?.setPixelRatio?.(pixelRatio);
      renderer?.setSize?.(width, height, false);
      lastUiSignature = '';
      return { width, height, pixelRatio };
    },
    async waitIdle() {
      return { status: 'idle' };
    },
    getScene: () => scene,
    getCamera: () => camera,
    getRenderer: () => renderer,
    getPickContext: () => ({ scene, camera, targets: [...pickTargets] }),
    applyPacket
  };

  validateRenderProvider(provider);
  return Object.freeze(provider);
}

export default createThreeRenderProvider;
