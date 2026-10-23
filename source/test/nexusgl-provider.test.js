import {createNexusGLProvider as reference} from 'nexusengine/domains/render/graphics-language';
import {createNexusGLProvider as cached} from '../src/providers/cached-execution-provider.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createNexusGLProvider, geometryForObject, objectTransform, forestGeometry, visibleForestCell, avatarParts } from '../src/providers/nexusgl-provider.js';
import { createNexusGLPickAdapter } from '../src/adapters/nexusgl-pick.js';
import { OBJECT_BY_ID } from '../src/game/content.js';

function packet({ objects = [], trees = [], ui = [] } = {}) {
  return {
    schema: 'atc.presentation-packet/1', revision: 1, elapsed: 0,
    output: { width: 320, height: 180, pixelRatio: 1 },
    camera: { position: [0, 0, 0], yaw: 0, pitch: 0, fov: 78, near: 0.08, far: 700 },
    ui, objects, trees, treeCount: trees.length, focusId: null,
    worldState: {}, primitiveColors: { structure: '#888888', hazard: '#E5484D' },
    story: { mode: 'intro', flags: {}, completed: false, puzzle: {} }
  };
}

function fakeGraphics() {
  const resources = new Map();
  const frames = [];
  return {
    ready: Promise.resolve(), resources, frames,
    async createResource(resource) { resources.set(resource.id, structuredClone(resource)); },
    async updateResource(resource) { resources.set(resource.id, structuredClone(resource)); },
    async releaseResource(id) { resources.delete(id); },
    async render(spec) { frames.push(structuredClone(spec)); return { presented: true }; },
    capture() { return { width: 1, height: 1, stride: 4, pixels: new Uint8ClampedArray([255, 0, 0, 255]) }; },
    async dispose() {}
  };
}

test('NexusGL adapter translates authored geometry, translucent boundaries, UI and all forest placements', async () => {
  const graphics = fakeGraphics();
  const trees = Array.from({ length: 2300 }, (_, index) => ({
    id: `atc:tree/${index}`, position: [index % 50, -10, -100 - Math.floor(index / 50)],
    scale: [1, 1, 1], metadata: { yaw: (index % 10) / 10 }
  }));
  const scene = packet({
    trees,
    ui: [{ id: 'hud-title', kind: 'text', text: 'CANOPY', x: 4, y: 4, color: '#ffffff', scale: 2 }],
    objects: [{
      id: 'atc:hazard/deep-boundary', visible: true,
      transform: { position: [0, 0, -10], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
      metadata: { colorRole: 'hazard', visual: { shape: 'boundary', size: [8, 8, 2] } }
    }]
  });
  const provider = createNexusGLProvider({ graphics, width: 320, height: 180 });
  await provider.initialize({ width: 320, height: 180 });
  provider.applyPacket(scene);
  await provider.waitIdle();

  const boundary = graphics.resources.get('atc:material/hazard-blend');
  assert.equal(boundary.data.alphaMode, 'blend');
  assert.equal(boundary.data.opacity, 0.34);
  const box = graphics.resources.get('atc:geometry/atc:hazard/deep-boundary');
  assert.equal(box.data.positions.length / 9, 12, 'all six box faces contain two triangles');
  const cells=forestGeometry(trees);
  assert.equal(cells.reduce((n,cell)=>n+cell.treeCount,0),2300);
  assert.ok(cells.reduce((n,cell)=>n+cell.far.length/9,0)<2300);
  assert.ok(provider.getSnapshot().forest.visibleTrees > 0);
  assert.equal(provider.getCompletedFrame().width, 320);
  assert.equal(graphics.frames.length, 1);
  assert.equal(graphics.frames[0].frame.width, 160);
  assert.equal(graphics.frames[0].frame.quality, 'native');
  assert.equal(provider.getSnapshot().completed.presented, true);
  await provider.dispose();
});

test('NexusGL picking preserves stable interaction IDs and rejects misses', () => {
  const scene = packet({ objects: [{
    id: 'atc:story/echo-spindle', visible: true,
    transform: { position: [0, 0, -8] },
    metadata: { visual: { shape: 'spindle', size: [2, 3, 2] }, interaction: { verb: 'inspect', range: 18 } }
  }] });
  const picker = createNexusGLPickAdapter({ getPacket: () => scene });
  assert.equal(picker.pick(0.5, 0.5)?.objectId, 'atc:story/echo-spindle');
  assert.equal(picker.pick(0, 0), null);
});

test('absolute route geometry is not translated a second time', () => {
  assert.deepEqual(objectTransform({ transform: { position: [10, 20, 30] }, metadata: { visual: { shape: 'route' } } }), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
});

test('the market deck remains below its authored camera path', () => {
  const positions = geometryForObject({ metadata: { visual: { shape: 'market', size: [31, 2.2, 29] } } }).positions;
  const deckY = positions.slice(0, 12 * 9).filter((_, index) => index % 3 === 1);
  assert.ok(60 + Math.max(...deckY) < 61);
  const plate = OBJECT_BY_ID['atc:puzzle/descent-lock/submit'];
  assert.ok(plate.position[1] - plate.visual.size[1] / 2 > 60 + Math.max(...deckY));
  const route = geometryForObject({ metadata: { visual: { shape: 'route', path: [[38, 59, -76], [42, 50, -84]], width: .65 } } }).positions;
  assert.ok(Math.max(...route.filter((_, index) => index % 3 === 1)) > 61, 'descent entrance marker is visible above the deck');
});

test('HUD alpha composition retains completed pixels after failure and recovers', async () => {
  const graphics = fakeGraphics(), errors = [];
  const provider = createNexusGLProvider({ graphics, width: 64, height: 36, onError: error => errors.push(error.message) });
  await provider.initialize();
  const scene = packet({ ui: [{ id: 'alpha', kind: 'panel', x: 0, y: 0, width: 100, height: 100, fill: '#0000FF80' }] });
  provider.applyPacket(scene);
  await provider.waitIdle();
  const first = provider.getCompletedFrame();
  const center = (18 * 64 + 32) * 4;
  assert.deepEqual(Array.from(first.pixels.slice(center, center + 4)), [127, 0, 128, 255]);
  first.pixels.fill(0);
  assert.equal(provider.getCompletedFrame().pixels[center + 3], 255, 'capture owns its pixels');
  const render = graphics.render;
  graphics.render = async () => { throw new Error('injected allocation failure'); };
  provider.applyPacket({ ...scene, revision: 2 });
  await assert.rejects(provider.waitIdle(), /injected allocation failure/);
  assert.equal(provider.getSnapshot().completed.packetRevision, 1);
  assert.equal(provider.getSnapshot().lastError.packetRevision, 2);
  assert.equal(provider.getPickContext().packet.revision,1,'picking stays with the displayed frame after a failed newer submission');
  assert.equal(provider.getCompletedFrame().pixels[center + 3], 255);
  graphics.render = render;
  provider.applyPacket({ ...scene, revision: 3 });
  await provider.waitIdle();
  assert.equal(provider.getSnapshot().completed.packetRevision, 3);
  assert.equal(provider.getPickContext().packet.revision,3);
  assert.equal(provider.getSnapshot().lastError, null);
  assert.equal(errors.length, 1);
  assert.throws(() => provider.resizeSurface({ width: Infinity }), RangeError);
  provider.resizeSurface({ width: 80, height: 45 });
  provider.reset();
  provider.applyPacket({ ...scene, revision: 4 });
  await provider.waitIdle();
  assert.equal(provider.getCompletedFrame().width, 80);
  graphics.capture=()=>({width:1,height:1,stride:4,pixels:new Uint8ClampedArray([200,100,20,0])});
  provider.applyPacket({...scene,revision:5,ui:[]});await provider.waitIdle();
  assert.deepEqual(Array.from(provider.getCompletedFrame().pixels.slice(0,4)),[0,0,0,0]);
  provider.resizeSurface({width:2560,height:1440});
  provider.applyPacket({...scene,revision:6,ui:[]});await provider.waitIdle();
  assert.equal(provider.getCompletedFrame().width,2560);
  assert.equal(provider.getCompletedFrame().height,1440);
  assert.equal(provider.getCompletedFrame().pixels.length,2560*1440*4);
  assert.equal(graphics.frames.at(-1).frame.width,320);
  assert.equal(graphics.frames.at(-1).frame.height,180);
  await provider.dispose();
  assert.equal(provider.getSnapshot().resourceCount, 0);
  assert.equal(provider.getCompletedFrame(), null);
  await provider.dispose();
});

test('picking a near object is not intercepted by a large platform below the camera', () => {
  const scene = packet({ objects: [
    { id: 'zone', transform: { position: [0, -4, -5] }, metadata: { visual: { shape: 'box', size: [30, 1, 30] }, interaction: { verb: 'travel' } } },
    { id: 'clue', transform: { position: [0, 0, -8], scale: [2, 1, 1] }, metadata: { visual: { shape: 'box', size: [1, 1, 1] }, interaction: { verb: 'inspect' } } }
  ] });
  const hit = createNexusGLPickAdapter({ getPacket: () => scene }).pick(0.5, 0.5);
  assert.equal(hit.objectId, 'clue');
  assert.equal(hit.distance, 7.5);
});

test('the start ring remains reachable beside the starter-route entrance marker', () => {
  const ids = ['atc:trigger/spawn/starter-perch', 'atc:route/starter-branch'];
  const scene = packet({ objects: ids.map(id => {
    const source = OBJECT_BY_ID[id];
    return { id, transform: { position: source.position }, metadata: { visual: source.visual, interaction: source.interaction } };
  }) });
  scene.camera = { ...scene.camera, position: [0, 86, 56], yaw: -Math.PI / 2, pitch: -Math.atan2(.9, 1.6) };
  assert.equal(createNexusGLPickAdapter({ getPacket: () => scene }).pick(.5, .5).objectId, ids[0]);
});

test('forest LOD is bounded, owns every tree and conservatively retains cells at frustum edges', () => {
  const trees=Array.from({length:2300},(_,i)=>({position:[(i%40)*8-160,-20,-100-Math.floor(i/40)*6],scale:[1,1,1],metadata:{}}));
  const cells=forestGeometry(trees);
  assert.equal(cells.reduce((n,c)=>n+c.treeCount,0),2300);
  for(const cell of cells)for(let i=0;i<cell.far.length;i+=3){
    assert.ok(Math.hypot(...cell.far.slice(i,i+3).map((v,a)=>v-cell.center[a]))<=cell.radius+1e-8);
  }
  assert.ok(cells.reduce((n,c)=>n+c.far.length/9,0)<700);
  const camera={position:[0,0,0],yaw:0,pitch:0,fov:78};
  assert.equal(visibleForestCell({center:[0,0,100],radius:1},camera),false);
  assert.equal(visibleForestCell({center:[0,0,-100],radius:1},camera),true);
  assert.equal(visibleForestCell({center:[145,0,-100],radius:10},camera),true);
  const avatar={position:[0,3,0],yaw:0,speed:3,stridePhase:1,visible:true};
  assert.equal(avatarParts(avatar).length,7);
  assert.notDeepEqual(avatarParts(avatar).find(p=>p.id==='leg-1').transform,avatarParts({...avatar,stridePhase:2}).find(p=>p.id==='leg-1').transform);
});

test('cached execution matches the pinned NexusGL provider for repeated, moving and updated geometry', async()=>{
  const options={backend:'wasm',memoryBudgetBytes:48*1024**2,maxResourceBytes:2*1024**2,maxFragments:1024};
  const providers=[reference(options),cached(options)];
  const geometry={id:'triangle',kind:'geometry',data:{positions:[-.8,-.7,.5,.8,-.7,.5,0,.8,.5],castsShadow:false}};
  try {
    for(const p of providers){await p.initialize();await p.createResource({id:'surface',kind:'material',data:{shading:'pbr',roughness:.7,tint:[.5,.7,.2]}});await p.createResource(geometry);}
    for(let i=0;i<6;i++){
      if(i===4)for(const p of providers)await p.updateResource({...geometry,data:{...geometry.data,positions:geometry.data.positions.map((v,n)=>n%3===0?v*.75:v)}});
      for(const p of providers){
        const transform=[i===3?-1:1,0,0,0,0,1,0,0,0,0,1,0,i===2?.1:0,0,0,1];
        p.beginFrame({frameId:`frame-${i}`,width:32,height:24,quality:'native',clear:[10+i,20,30,255],view:{camera:[0,0,i===5?3:2],lightDirection:[0,0,1]},light:{intensity:i===3?.8:1.25}});
        p.executePass({passId:'scene',frameId:`frame-${i}`,kind:'render',sequence:0},[{geometryId:'triangle',materialId:'surface',transform}]);
        p.submitFrame(`frame-${i}`);
      }
      assert.deepEqual(providers[1].getCompletedFrame().pixels,providers[0].getCompletedFrame().pixels);
    }
    assert.ok(new Set(providers[1].getCompletedFrame().pixels).size>4);
    for(const p of providers){await p.reset();assert.equal(p.getDiagnostics().resources,0);}
  } finally {for(const p of providers)await p.dispose();}
});
