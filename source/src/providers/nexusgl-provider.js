import { createCanvasHost, materialResource } from 'nexusengine/domains/render/graphics-language';
import { createMaterialDescriptor } from 'nexusengine/domains/material';
import { assertPresentationPacket } from '../game/presentation-projection.js';
import { renderBitmapUi } from './bitmap-texture.js';
import { routeEntrancePoint } from '../game/content.js';

const clone = (value) => value === undefined ? undefined : structuredClone(value);
const resourceId = (kind, id) => `atc:${kind}/${id}`;
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function identity() { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; }

function transform(position = [0,0,0], rotation = [0,0,0,1], scale = [1,1,1]) {
  const [x,y,z,w] = rotation.map(Number);
  const xx=x*x, yy=y*y, zz=z*z, xy=x*y, xz=x*z, yz=y*z, wx=w*x, wy=w*y, wz=w*z;
  return [
    (1-2*(yy+zz))*scale[0], (2*(xy+wz))*scale[0], (2*(xz-wy))*scale[0], 0,
    (2*(xy-wz))*scale[1], (1-2*(xx+zz))*scale[1], (2*(yz+wx))*scale[1], 0,
    (2*(xz+wy))*scale[2], (2*(yz-wx))*scale[2], (1-2*(xx+yy))*scale[2], 0,
    finite(position[0]), finite(position[1]), finite(position[2]), 1
  ];
}

function cameraBasis(camera) {
  const yaw = finite(camera.yaw), pitch = finite(camera.pitch);
  const cp = Math.cos(pitch);
  const forward = [-Math.sin(yaw)*cp, Math.sin(pitch), -Math.cos(yaw)*cp];
  const right = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const up = [right[1]*forward[2]-right[2]*forward[1], right[2]*forward[0]-right[0]*forward[2], right[0]*forward[1]-right[1]*forward[0]];
  return { forward, right, up };
}

function viewProjection(camera, width, height) {
  const { position } = camera, { forward, right, up } = cameraBasis(camera);
  const near = Math.max(.04, finite(camera.near, .08)), far = Math.max(near + 1, finite(camera.far, 700));
  const aspect = width / height, f = 1 / Math.tan(finite(camera.fov, 78) * Math.PI / 360);
  const projection = [f/aspect,0,0,0, 0,f,0,0, 0,0,far/(near-far),-1, 0,0,(far*near)/(near-far),0];
  const view = [
    right[0],up[0],-forward[0],0,
    right[1],up[1],-forward[1],0,
    right[2],up[2],-forward[2],0,
    -(right[0]*position[0]+right[1]*position[1]+right[2]*position[2]),
    -(up[0]*position[0]+up[1]*position[1]+up[2]*position[2]),
    forward[0]*position[0]+forward[1]*position[1]+forward[2]*position[2],1
  ];
  const out = new Array(16).fill(0);
  for (let col=0; col<4; col++) for (let row=0; row<4; row++) {
    for (let k=0; k<4; k++) out[col*4+row] += projection[k*4+row] * view[col*4+k];
  }
  return out;
}

function appendTriangle(out, a, b, c) {
  out.push(...a,...b,...c);
}

function appendBox(out, size, center = [0,0,0]) {
  const [sx,sy,sz] = size.map((value) => finite(value,1)*.5), [cx,cy,cz] = center;
  const p = [
    [cx-sx,cy-sy,cz-sz],[cx+sx,cy-sy,cz-sz],[cx+sx,cy+sy,cz-sz],[cx-sx,cy+sy,cz-sz],
    [cx-sx,cy-sy,cz+sz],[cx+sx,cy-sy,cz+sz],[cx+sx,cy+sy,cz+sz],[cx-sx,cy+sy,cz+sz]
  ];
  for (const face of [[0,2,1,0,3,2],[4,5,6,4,6,7],[0,1,5,0,5,4],[3,7,6,3,6,2],[0,4,7,0,7,3],[1,2,6,1,6,5]]) {
    appendTriangle(out,p[face[0]],p[face[1]],p[face[2]]);
    appendTriangle(out,p[face[3]],p[face[4]],p[face[5]]);
  }
}

function appendCylinder(out, radiusTop, radiusBottom, height, segments = 10, center = [0,0,0], axis = 'y') {
  const [cx,cy,cz] = center, half = height * .5;
  const point = (r, a, h) => axis === 'z' ? [cx + Math.cos(a)*r, cy + Math.sin(a)*r, cz+h] : [cx + Math.cos(a)*r, cy+h, cz + Math.sin(a)*r];
  for (let i=0;i<segments;i++) {
    const a=i/segments*Math.PI*2, b=(i+1)/segments*Math.PI*2;
    const loA=point(radiusBottom,a,-half), loB=point(radiusBottom,b,-half), hiA=point(radiusTop,a,half), hiB=point(radiusTop,b,half);
    appendTriangle(out,loA,loB,hiB); appendTriangle(out,loA,hiB,hiA);
    const bottom=axis==='z'?[cx,cy,cz-half]:[cx,cy-half,cz], top=axis==='z'?[cx,cy,cz+half]:[cx,cy+half,cz];
    appendTriangle(out,bottom,loB,loA); appendTriangle(out,top,hiA,hiB);
  }
}

function appendOctahedron(out, radius, center = [0,0,0], scale = [1,1,1]) {
  const [x,y,z]=center, [sx,sy,sz]=scale;
  const p=[[x,y+radius*sy,z],[x,y-radius*sy,z],[x+radius*sx,y,z],[x-radius*sx,y,z],[x,y,z+radius*sz],[x,y,z-radius*sz]];
  for (const t of [[0,2,4],[0,4,3],[0,3,5],[0,5,2],[1,4,2],[1,3,4],[1,5,3],[1,2,5]]) appendTriangle(out,p[t[0]],p[t[1]],p[t[2]]);
}

function appendRing(out, major, tube, segments = 24, sides = 7, y = 0) {
  for(let i=0;i<segments;i++) for(let j=0;j<sides;j++) {
    const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2,c=j/sides*Math.PI*2,d=(j+1)/sides*Math.PI*2;
    const v=(u,vv)=>[(major+tube*Math.cos(vv))*Math.cos(u),y+tube*Math.sin(vv),(major+tube*Math.cos(vv))*Math.sin(u)];
    const p0=v(a,c),p1=v(b,c),p2=v(b,d),p3=v(a,d);
    appendTriangle(out,p0,p1,p2);appendTriangle(out,p0,p2,p3);
  }
}

function appendBetween(out, start, end, radius, segments = 7) {
  const a=start,b=end, dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2], length=Math.hypot(dx,dy,dz)||1;
  const axis=[dx/length,dy/length,dz/length], helper=Math.abs(axis[1])>.9?[1,0,0]:[0,1,0];
  const u=[axis[1]*helper[2]-axis[2]*helper[1],axis[2]*helper[0]-axis[0]*helper[2],axis[0]*helper[1]-axis[1]*helper[0]];
  const ul=Math.hypot(...u)||1;u.forEach((v,i)=>u[i]=v/ul);
  const v=[axis[1]*u[2]-axis[2]*u[1],axis[2]*u[0]-axis[0]*u[2],axis[0]*u[1]-axis[1]*u[0]];
  for(let i=0;i<segments;i++){
    const p=(t,k)=>{const ang=k/segments*Math.PI*2;return a.map((n,c)=>n+(b[c]-n)*t+radius*(u[c]*Math.cos(ang)+v[c]*Math.sin(ang)));};
    const p0=p(0,i),p1=p(0,i+1),p2=p(1,i+1),p3=p(1,i);
    appendTriangle(out,p0,p1,p2);appendTriangle(out,p0,p2,p3);
  }
}

export function geometryForObject(descriptor) {
  const positions=[], visual=descriptor.metadata?.visual??{}, shape=visual.shape??'box', size=(visual.size??[1,1,1]).map((v)=>finite(v,1));
  const addRailBox=(s,c)=>appendBox(positions,s,c);
  if(shape==='route'){
    const points=(visual.path??[]).map((p)=>[p[0],p[1]-.92,p[2]]), r=Math.max(.08,finite(visual.width,1)*.075);
    for(let i=1;i<points.length;i++)appendBetween(positions,points[i-1],points[i],r,visual.dashed?6:10);
    for(const p of points)appendOctahedron(positions,Math.max(.12,finite(visual.width,1)*.1),p);
    if (points.length) {
      const entrance = routeEntrancePoint(visual.path);
      appendBetween(positions, [entrance[0], points[0][1], entrance[2]], entrance, .1, 6);
      appendOctahedron(positions, .45, entrance);
    }
  } else if(shape==='ring') appendRing(positions,size[0]*.5,Math.max(.08,size[1]*.5),28,8,-.9);
  else if(['platform','zone','market','station'].includes(shape)){
    // The authored market route has eye height 61 while this deck's original
    // top is 61.1. Keep the visual deck below that unchanged gameplay path.
    appendBox(positions,size,shape==='market'?[0,-.3,0]:[0,0,0]);
    const halfX=size[0]*.45,halfZ=size[2]*.45,railY=size[1]*.75+1.15;
    for(const z of [-halfZ,halfZ])addRailBox([size[0]*.88,.22,.22],[0,railY,z]);
    for(const x of [-halfX,halfX])addRailBox([.22,.22,size[2]*.88],[x,railY,0]);
  } else if(shape==='trunk') appendCylinder(positions,size[0]*.42,size[0]*.58,size[1],12);
  else if(shape==='spindle'){
    appendCylinder(positions,size[0]*.25,size[0]*.42,size[1],10);
    appendRing(positions,size[0]*.52,.08,20,6,0);
  } else if(shape==='character'){
    appendCylinder(positions,size[0]*.38,size[0]*.5,size[1]*.7,10);
    appendOctahedron(positions,size[0]*.36,[0,size[1]*.52,0],[1,1.15,1]);
  } else if(shape==='lantern'||shape==='beacon'){
    appendCylinder(positions,size[0]*.42,size[0]*.55,size[1],8);
    appendOctahedron(positions,size[0]*.82,[0,0,0]);
  } else if(shape==='hanging-rows'){
    addRailBox([size[0],.45,.45],[0,size[1]*.42,0]);
    for(let index=-3;index<=3;index++){
      addRailBox([.12,size[1]*.72,.12],[index*size[0]/8,0,0]);
      appendOctahedron(positions,.48,[index*size[0]/8,-size[1]*.3,0]);
    }
  } else if(shape==='dial'){
    appendCylinder(positions,size[0]*.5,size[0]*.5,size[2],16,[0,0,0],'z');
    addRailBox([.14,size[0]*.65,.16],[0,0,size[2]*.6]);
  } else if(shape==='cell') appendOctahedron(positions,size[0]*.58);
  else appendBox(positions,size);
  if(shape!=='route'&&Array.isArray(visual.rotation)&&visual.rotation.some((v)=>Math.abs(finite(v))>1e-6)){
    const [rx,ry,rz]=visual.rotation.map(Number),cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
    for(let i=0;i<positions.length;i+=3){let x=positions[i],y=positions[i+1],z=positions[i+2];
      [y,z]=[y*cx-z*sx,y*sx+z*cx];[x,z]=[x*cy+z*sy,-x*sy+z*cy];[x,y]=[x*cz-y*sz,x*sz+y*cz];positions[i]=x;positions[i+1]=y;positions[i+2]=z;
    }
  }
  return { positions, castsShadow:false };
}

function forestGeometry(trees, detailedCount = 96) {
  const trunk=[], crown=[], distant=[];
  const count=trees.length, detail=Math.min(detailedCount,count);
  for(let i=0;i<detail;i++){
    const tree=trees[Math.floor(i*count/detail)], [x,y,z]=tree.position,[sx,sy,sz]=tree.scale;
    appendCylinder(trunk,1.35,2.4,48,3,[x,y+24*sy,z]);
    appendOctahedron(crown,11,[x,y+51*sy,z],[.75*sx,.75*sy,.75*sz]);
  }
  for(const tree of trees){
    const [x,y,z]=tree.position,[sx,sy]=tree.scale, radius=1.7*sx, centerY=y+54*sy, angle=finite(tree.metadata?.yaw);
    const side=[Math.cos(angle)*radius,0,Math.sin(angle)*radius];
    appendTriangle(distant,[x-side[0],centerY-radius,z-side[2]],[x+side[0],centerY-radius,z+side[2]],[x,centerY+radius,z]);
  }
  return [
    {id:'forest-trunks',positions:trunk,color:'#263F33'},
    {id:'forest-crowns',positions:crown,color:'#3F765A'},
    {id:'forest-distance',positions:distant,color:'#557A5D'}
  ];
}

function uiTexture(packet, width=640, height=360, fps=0) {
  const mapped=(packet.ui??[]).map((sourceNode)=>{
    const node=sourceNode.id==='hud-stats'&&sourceNode.kind==='text'
      ? {...sourceNode,text:`${(packet.treeCount??packet.trees?.length??0).toLocaleString()} TREES  /  ${fps||'--'} FPS`}
      : sourceNode;
    const maxWidth=node.maxWidth==null?Math.round(92*width/100):Math.max(1,Math.round(node.maxWidth*width/100));
    const anchorX=Math.round(finite(node.x)*width/100);
    const x=node.kind==='text'&&node.align==='center'?anchorX-Math.round(maxWidth*.5):node.kind==='text'&&node.align==='right'?anchorX-maxWidth:anchorX;
    return {
      ...node,
      x,
      y:Math.round(finite(node.y)*height/100),
      width:node.width==null?undefined:Math.max(1,Math.round(node.width*width/100)),
      height:node.height==null?undefined:Math.max(1,Math.round(node.height*height/100)),
      maxWidth:node.kind==='text'?maxWidth:node.maxWidth,
      border:node.stroke??node.border,
      scale:Math.max(1,Math.round(finite(node.scale,1)*width/640))
    };
  });
  return renderBitmapUi({width,height,background:'#00000000',border:false,layers:mapped},{width,height});
}

// Routes already contain world coordinates; all other geometry is object-local.
export function objectTransform(object, elapsed = 0) {
  if (object.metadata?.visual?.shape === 'route') return identity();
  const position = object.transform?.position ?? [0, 0, 0];
  let rotation = object.transform?.rotation ?? [0, 0, 0, 1];
  let scale = object.transform?.scale ?? [1, 1, 1];
  if (object.id === 'atc:story/echo-spindle') rotation = [0, Math.sin(elapsed * .35), 0, Math.cos(elapsed * .35)];
  if (['atc:choice/answer-beacon', 'atc:choice/recover-cell'].includes(object.id)) {
    const pulse = 1 + .08 * (.5 + .5 * Math.sin(elapsed * 3.2));
    scale = scale.map(value => value * pulse);
  }
  return transform(position, rotation, scale);
}

// HUD composition stays at the presentation resolution while NexusGL renders
// the world at half that resolution. Both browser and capture use these pixels.
function composeFrame(world, ui) {
  const pixels = new Uint8ClampedArray(ui.width * ui.height * 4);
  for (let y = 0; y < ui.height; y++) {
    const sourceY = Math.min(world.height - 1, Math.floor(y * world.height / ui.height));
    for (let x = 0; x < ui.width; x++) {
      const sourceX = Math.min(world.width - 1, Math.floor(x * world.width / ui.width));
      const source = (sourceY * world.width + sourceX) * 4;
      const target = (y * ui.width + x) * 4;
      const foregroundAlpha = ui.data[target + 3] / 255;
      const backgroundAlpha = world.pixels[source + 3] / 255 * (1 - foregroundAlpha);
      const alpha = foregroundAlpha + backgroundAlpha;
      for (let channel = 0; channel < 3; channel++) {
        // The bitmap rasterizer stores premultiplied UI colors; NexusGL's
        // completed framebuffer uses straight alpha.
        pixels[target + channel] = alpha ? (ui.data[target + channel] + world.pixels[source + channel] * backgroundAlpha) / alpha : 0;
      }
      pixels[target + 3] = alpha * 255;
    }
  }
  return { ...world, width: ui.width, height: ui.height, stride: ui.width * 4, pixels };
}

function dimension(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 2048) throw new RangeError('Presentation dimensions must be integers from 1 to 2048.');
  return value;
}

export function createNexusGLProvider({ graphics, canvas = null, onError = () => {}, width = 640, height = 360 } = {}) {
  if (!graphics?.ready || typeof graphics.render !== 'function') throw new TypeError('NexusGL provider requires an installed Graphics Language Kit.');
  const host = canvas ? createCanvasHost(canvas) : null;
  let initialized = false, disposed = false, frame = 0, generation = 0;
  let packet = null, pending = null, pumpPromise = null, completed = null, lastSnapshot = null, lastError = null;
  let cachedForest = null, cachedUi = null, lastUiSignature = '', lastRenderAt = 0, lastPresentedAt = 0, lastRenderDurationMs = 0, measuredFps = 0;
  const recentRenderDurations = [];
  const resources = new Set(), materialIds = new Set();

  async function addResource(resource) {
    await graphics.createResource(resource);
    resources.add(resource.id);
  }

  async function ensureMaterial(id, color, options = {}) {
    if (materialIds.has(id)) return id;
    const resource = materialResource(createMaterialDescriptor({ id, kind: 'standard', color, roughness: .88, metalness: 0, transparent: options.alphaMode === 'blend', opacity: options.opacity ?? 1 }), { alphaMode: options.alphaMode ?? 'opaque' });
    await addResource(resource);
    materialIds.add(id);
    return id;
  }

  async function ensureScene(next) {
    const draws = [];
    for (const object of next.objects) {
      if (object.visible === false) continue;
      if (object.id === 'atc:blocker/descent-shutter' && next.story?.flags?.descent_lock_open) continue;
      const role = object.metadata?.colorRole ?? 'structure';
      const color = next.primitiveColors[role] ?? next.primitiveColors.structure ?? '#888888';
      const alphaMode = object.metadata?.visual?.shape === 'boundary' ? 'blend' : 'opaque';
      const id = resourceId('geometry', object.id);
      if (!resources.has(id)) await addResource({ id, kind: 'geometry', data: geometryForObject(object) });
      const materialId = await ensureMaterial(resourceId('material', `${role}-${alphaMode}`), color, { alphaMode, opacity: alphaMode === 'blend' ? .34 : 1 });
      draws.push({ geometryId: id, materialId, transform: objectTransform(object, next.elapsed) });
    }
    cachedForest ??= forestGeometry(next.trees);
    for (const tree of cachedForest) {
      const id = resourceId('geometry', tree.id);
      if (!resources.has(id)) await addResource({ id, kind: 'geometry', data: { positions: tree.positions, castsShadow: false } });
      const materialId = await ensureMaterial(resourceId('material', tree.id), tree.color);
      draws.push({ geometryId: id, materialId, transform: identity() });
    }
    return draws;
  }

  function bitmap(next, outputWidth, outputHeight) {
    const signature = JSON.stringify([next.ui, outputWidth, outputHeight, measuredFps]);
    if (signature !== lastUiSignature) {
      cachedUi = uiTexture(next, outputWidth, outputHeight, measuredFps);
      lastUiSignature = signature;
    }
    return cachedUi;
  }

  function runLatest() {
    if (pumpPromise || !pending || disposed) return pumpPromise;
    pumpPromise = (async () => {
      while (pending && !disposed) {
        const next = pending;
        pending = null;
        const submittedGeneration = generation;
        const outputWidth = width, outputHeight = height;
        try {
          const delay = Math.max(0, 40 - (performance.now() - lastRenderAt));
          if (delay) await new Promise(resolve => setTimeout(resolve, delay));
          if (disposed || submittedGeneration !== generation) continue;
          const draws = await ensureScene(next);
          const renderWidth = Math.max(1, Math.round(outputWidth / 2));
          const renderHeight = Math.max(1, Math.round(outputHeight / 2));
          const spec = {
            frame: { frameId: `atc-frame-${next.revision}`, width: renderWidth, height: renderHeight, quality: 'native', clear: [140, 170, 157, 255], view: { projection: viewProjection(next.camera, renderWidth, renderHeight), camera: next.camera.position, lightDirection: [-.45, .8, .25], exposure: 1 }, light: { color: [1, .94, .82], intensity: 1.25, fill: .72 } }, draws
          };
          const started = performance.now();
          lastRenderAt = started;
          await graphics.render(spec);
          const image = composeFrame(graphics.capture(), bitmap(next, outputWidth, outputHeight));
          if (disposed || submittedGeneration !== generation) continue;
          if (host) host.commit(host.prepare(image, { generation, operationId: spec.frame.frameId }));
          completed = image;
          const presentedAt = performance.now();
          lastRenderDurationMs = presentedAt - started;
          const presentationIntervalMs = lastPresentedAt ? presentedAt - lastPresentedAt : lastRenderDurationMs;
          lastPresentedAt = presentedAt;
          recentRenderDurations.push(presentationIntervalMs);
          if (recentRenderDurations.length > 30) recentRenderDurations.shift();
          measuredFps = Math.round(1000 / (recentRenderDurations.reduce((sum, value) => sum + value, 0) / recentRenderDurations.length));
          lastSnapshot = { frame: next.revision, packetRevision: next.revision, presented: true, width: outputWidth, height: outputHeight, renderWidth, renderHeight, quality: 'native', renderDurationMs: lastRenderDurationMs, presentationIntervalMs, measuredFps };
          lastError = null;
        } catch (error) {
          if (submittedGeneration === generation && !disposed) {
            lastError = { name: error.name, message: error.message, packetRevision: next.revision };
            onError(error);
          }
        }
      }
    })().finally(() => { pumpPromise = null; if (pending && !disposed) runLatest(); });
    return pumpPromise;
  }

  function queue(next) {
    if (disposed || !initialized) throw new Error('NexusGL provider is not ready.');
    packet = assertPresentationPacket(next);
    // Game-session packets own fresh descriptor copies and immutable tree data.
    // Coalesce references instead of cloning 2,300 trees on every simulation tick.
    pending = packet;
    void runLatest();
  }

  const provider = {
    id: 'atc:provider/nexusgl-wasm', version: '0.1.0', replayStable: true,
    capabilities: { backend: 'nexusgl-wasm', presentationPackets: ['atc.presentation-packet/1'], deterministicHeadlessScene: false, instancing: false, bitmapUi: true, picking: true, softwareRasterizer: true },
    async initialize(options = {}) {
      if (disposed) throw new Error('Provider has been disposed.');
      width = dimension(Number(options.width ?? width));
      height = dimension(Number(options.height ?? height));
      await graphics.ready;
      initialized = true;
      return { status: 'ready', width, height, backend: 'nexusgl-wasm' };
    },
    createResource: resource => graphics.createResource(resource),
    updateResource: resource => graphics.updateResource(resource),
    async releaseResource(id) { await graphics.releaseResource(id); resources.delete(id); materialIds.delete(id); },
    beginFrame(descriptor = {}) {
      if (!initialized || disposed) throw new Error('NexusGL provider is not ready.');
      frame = Number(descriptor.frame ?? frame + 1);
      return { frame, status: 'begun' };
    },
    executePass(pass = {}) { queue(pass.packet ?? pass.presentation ?? pass); return { frame, passId: String(pass.id ?? 'atc:pass/main'), status: 'queued', revision: packet.revision }; },
    submitFrame() { void runLatest(); return { frame, status: 'submitted', queued: true }; },
    reset() {
      generation += 1;
      packet = pending = null;
      frame = 0;
      lastError = null;
      lastUiSignature = '';
      lastRenderAt = 0;
      lastPresentedAt = 0;
      recentRenderDurations.length = 0;
      return { status: 'reset' };
    },
    async dispose() {
      if (disposed) return { status: 'disposed' };
      disposed = true;
      generation += 1;
      pending = null;
      await pumpPromise;
      await graphics.dispose();
      host?.dispose();
      completed = null;
      lastSnapshot = null;
      resources.clear();
      materialIds.clear();
      cachedForest = cachedUi = null;
      initialized = false;
      return { status: 'disposed' };
    },
    getSnapshot() { return { version: '0.1.0', frame, initialized, packetRevision: packet?.revision ?? null, completed: clone(lastSnapshot), lastError: clone(lastError), resourceCount: resources.size, lastRenderDurationMs, measuredFps }; },
    async loadSnapshot(snapshot = {}) { frame = Math.max(0, finite(snapshot.frame)); return provider.getSnapshot(); },
    async recover() { lastError = null; return { status: 'ready', recovered: true }; },
    resizeSurface(options = {}) {
      const nextWidth = dimension(Number(options.width ?? width));
      const nextHeight = dimension(Number(options.height ?? height));
      width = nextWidth; height = nextHeight;
      return { width, height, pixelRatio: 1 };
    },
    async waitIdle() { while (pumpPromise) await pumpPromise; if (lastError) throw new Error(lastError.message); return { status: 'idle' }; },
    getCompletedFrame() { return completed ? { ...completed, pixels: new Uint8ClampedArray(completed.pixels) } : null; },
    getPickContext() { return { packet }; },
    applyPacket: queue
  };
  return Object.freeze(provider);
}
