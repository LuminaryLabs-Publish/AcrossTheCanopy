import * as THREE from 'three';

const canvas = document.querySelector('#world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9dbbb1);
scene.fog = new THREE.FogExp2(0x9dbbb1, 0.0042);

const camera = new THREE.PerspectiveCamera(78, innerWidth / innerHeight, 0.1, 680);
camera.position.set(18, 31, 72);
camera.rotation.order = 'YXZ';
camera.rotation.set(-0.17, 0.2, 0);

scene.add(new THREE.HemisphereLight(0xdde9d9, 0x354b35, 2.4));
const sun = new THREE.DirectionalLight(0xfff1c7, 3.2);
sun.position.set(-110, 170, 50);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -145;
sun.shadow.camera.right = sun.shadow.camera.top = 145;
sun.shadow.camera.far = 430;
sun.shadow.bias = -0.00025;
scene.add(sun);

const world = new THREE.Group();
scene.add(world);

const CHUNK = 150;
const RADIUS = 2;
const TREES_PER_CHUNK = 92;
const activeChunks = new Map();
const dummy = new THREE.Object3D();

function hash(x, z, seed = 0) {
  const n = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function noise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, ux), THREE.MathUtils.lerp(c, d, ux), uz);
}

function fbm(x, z) {
  let value = 0, amp = .52, frequency = 1;
  for (let i = 0; i < 5; i++) { value += noise(x * frequency, z * frequency) * amp; frequency *= 2.03; amp *= .49; }
  return value;
}

function terrainHeight(wx, wz, cx, cz) {
  const lx = (wx - cx * CHUNK) / (CHUNK * .5);
  const lz = (wz - cz * CHUNK) / (CHUNK * .5);
  const edge = Math.max(Math.abs(lx), Math.abs(lz));
  const island = THREE.MathUtils.smoothstep(1.07 - edge, 0, .42);
  const broad = fbm(wx * .008 + 14, wz * .008 - 9);
  const detail = fbm(wx * .027 - 6, wz * .027 + 31);
  return -2.7 + island * (3 + broad * 17 + detail * 3.8);
}

const terrainMaterial = new THREE.MeshStandardMaterial({ color: 0x668159, roughness: .96, metalness: 0, flatShading: true });
const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4931, roughness: 1 });
const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x244c35, roughness: .9, flatShading: true });
const foliageLightMaterial = new THREE.MeshStandardMaterial({ color: 0x3f6843, roughness: .9, flatShading: true });
const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x6f7963, roughness: 1, flatShading: true });

const trunkGeo = new THREE.CylinderGeometry(.22, .38, 3.4, 6);
const crownGeo = new THREE.ConeGeometry(1.8, 4.8, 7);
const rockGeo = new THREE.DodecahedronGeometry(1.2, 0);

function createChunk(cx, cz) {
  const group = new THREE.Group();
  group.userData.key = `${cx},${cz}`;

  const segments = 34;
  const geometry = new THREE.PlaneGeometry(CHUNK, CHUNK, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position;
  const colors = [];
  const color = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const wx = pos.getX(i) + cx * CHUNK;
    const wz = pos.getZ(i) + cz * CHUNK;
    const y = terrainHeight(wx, wz, cx, cz);
    pos.setY(i, y);
    const shade = THREE.MathUtils.clamp((y + 2) / 20, 0, 1);
    color.setHSL(.25 + shade * .04, .2 + shade * .15, .37 + shade * .05);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = terrainMaterial.clone();
  material.vertexColors = true;
  const land = new THREE.Mesh(geometry, material);
  land.position.set(cx * CHUNK, 0, cz * CHUNK);
  land.receiveShadow = true;
  group.add(land);

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMaterial, TREES_PER_CHUNK);
  const crownsA = new THREE.InstancedMesh(crownGeo, foliageMaterial, TREES_PER_CHUNK * 2);
  const crownsB = new THREE.InstancedMesh(crownGeo, foliageLightMaterial, TREES_PER_CHUNK);
  const rocks = new THREE.InstancedMesh(rockGeo, rockMaterial, 20);
  trunks.castShadow = trunks.receiveShadow = true;
  crownsA.castShadow = crownsA.receiveShadow = true;
  crownsB.castShadow = crownsB.receiveShadow = true;
  rocks.castShadow = rocks.receiveShadow = true;

  let placed = 0;
  for (let i = 0; i < TREES_PER_CHUNK; i++) {
    const angle = hash(cx, cz, i * 2) * Math.PI * 2;
    const radial = Math.sqrt(hash(cx, cz, i * 2 + 1)) * CHUNK * .43;
    const x = cx * CHUNK + Math.cos(angle) * radial;
    const z = cz * CHUNK + Math.sin(angle) * radial;
    const y = terrainHeight(x, z, cx, cz);
    const scale = .65 + hash(x, z, 8) * 1.2;
    const yaw = hash(x, z, 4) * Math.PI;

    dummy.position.set(x, y + 1.7 * scale, z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, y + 4.45 * scale, z);
    dummy.scale.set(scale * 1.12, scale, scale * 1.12);
    dummy.updateMatrix();
    crownsA.setMatrixAt(i * 2, dummy.matrix);
    dummy.position.y += 2.15 * scale;
    dummy.scale.multiplyScalar(.74);
    dummy.updateMatrix();
    crownsA.setMatrixAt(i * 2 + 1, dummy.matrix);

    dummy.position.y += 1.7 * scale;
    dummy.scale.multiplyScalar(.64);
    dummy.updateMatrix();
    crownsB.setMatrixAt(i, dummy.matrix);
    placed++;
  }

  for (let i = 0; i < 20; i++) {
    const x = cx * CHUNK + (hash(cx, cz, 600 + i) - .5) * CHUNK * .78;
    const z = cz * CHUNK + (hash(cx, cz, 700 + i) - .5) * CHUNK * .78;
    const y = terrainHeight(x, z, cx, cz);
    const s = .45 + hash(x, z, 13) * 1.45;
    dummy.position.set(x, y + .35 * s, z);
    dummy.rotation.set(hash(x, z, 2), hash(x, z, 3) * 6.2, hash(x, z, 4));
    dummy.scale.set(s, s * .55, s);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }

  group.userData.treeCount = placed;
  group.add(trunks, crownsA, crownsB, rocks);
  world.add(group);
  activeChunks.set(group.userData.key, group);
}

function disposeChunk(group) {
  world.remove(group);
  group.traverse(obj => { if (obj.geometry && obj === group.children[0]) obj.geometry.dispose(); if (obj.material && obj === group.children[0]) obj.material.dispose(); });
}

let lastCenter = '';
function updateChunks(force = false) {
  const cx = Math.floor((camera.position.x + CHUNK * .5) / CHUNK);
  const cz = Math.floor((camera.position.z + CHUNK * .5) / CHUNK);
  const center = `${cx},${cz}`;
  if (!force && center === lastCenter) return;
  lastCenter = center;
  const needed = new Set();
  for (let z = -RADIUS; z <= RADIUS; z++) for (let x = -RADIUS; x <= RADIUS; x++) {
    const key = `${cx + x},${cz + z}`;
    needed.add(key);
    if (!activeChunks.has(key)) createChunk(cx + x, cz + z);
  }
  for (const [key, group] of activeChunks) if (!needed.has(key)) { disposeChunk(group); activeChunks.delete(key); }
  const count = [...activeChunks.values()].reduce((sum, chunk) => sum + chunk.userData.treeCount, 0);
  document.querySelector('#tree-count').textContent = `${count.toLocaleString()} TREES`;
}

const waterGeometry = new THREE.PlaneGeometry(2200, 2200, 1, 1);
const waterMaterial = new THREE.MeshPhysicalMaterial({ color: 0x567d78, roughness: .2, metalness: .05, transmission: .1, transparent: true, opacity: .9 });
const water = new THREE.Mesh(waterGeometry, waterMaterial);
water.rotation.x = -Math.PI / 2;
water.position.y = -1.15;
water.receiveShadow = true;
scene.add(water);

const keys = new Set();
addEventListener('keydown', e => keys.add(e.code));
addEventListener('keyup', e => keys.delete(e.code));

let dragging = false, lastX = 0, lastY = 0, yaw = camera.rotation.y, pitch = camera.rotation.x;
canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  yaw -= (e.clientX - lastX) * .003;
  pitch -= (e.clientY - lastY) * .003;
  pitch = THREE.MathUtils.clamp(pitch, -1.1, .65);
  lastX = e.clientX; lastY = e.clientY;
});
canvas.addEventListener('pointerup', () => dragging = false);

const fovInput = document.querySelector('#fov');
const fovOutput = document.querySelector('#fov-value');
function setFov() {
  const value = Number(fovInput.value);
  camera.fov = value;
  camera.updateProjectionMatrix();
  fovOutput.value = `${value}°`;
  fovInput.style.setProperty('--fill', `${((value - 60) / 60) * 100}%`);
}
fovInput.addEventListener('input', setFov);
setFov();

const clock = new THREE.Clock();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
updateChunks(true);

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .05);
  camera.rotation.set(pitch, yaw, 0);
  camera.getWorldDirection(forward);
  forward.y = 0; forward.normalize();
  right.crossVectors(forward, camera.up).normalize();
  const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight')) ? 42 : 20;
  if (keys.has('KeyW') || keys.has('ArrowUp')) camera.position.addScaledVector(forward, speed * dt);
  if (keys.has('KeyS') || keys.has('ArrowDown')) camera.position.addScaledVector(forward, -speed * dt);
  if (keys.has('KeyA') || keys.has('ArrowLeft')) camera.position.addScaledVector(right, -speed * dt);
  if (keys.has('KeyD') || keys.has('ArrowRight')) camera.position.addScaledVector(right, speed * dt);
  if (keys.has('KeyE') || keys.has('Space')) camera.position.y += speed * .7 * dt;
  if (keys.has('KeyQ') || keys.has('ControlLeft')) camera.position.y -= speed * .7 * dt;
  camera.position.y = THREE.MathUtils.clamp(camera.position.y, 8, 120);
  water.position.x = camera.position.x;
  water.position.z = camera.position.z;
  updateChunks();
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
});
