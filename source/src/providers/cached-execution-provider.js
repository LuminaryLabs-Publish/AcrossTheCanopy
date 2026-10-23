// Game-local execution specialization of NexusEngine provider.js at
// 5a4da3eba6ac95d2d8c74a008bb12caff0d6b0e8. Retain the last
// transformed vertex stream per immutable geometry declaration. Weak ownership
// bounds cached data to live resources. Cache admitted-byte diagnostics and record
// phase timing, and avoid resubmitting identical view/light/background state;
// shared validation/lifecycle stay intact. No dependency source is edited.
import { normalizeRenderPass } from "nexusengine/domains/render/pass-schema";
import { normalizeRenderFrame } from "nexusengine/domains/render/frame-schema";
import { CAPABILITIES, normalizeResource, normalizeFrame, normalizeDraw } from "nexusengine/domains/render/graphics-language";
import { normalizeResourceUpdate, integer, record } from "../../node_modules/nexusengine/kits/render/graphics-language-kit/contracts.js";
import { loadNexusGLRuntime } from "../../node_modules/nexusengine/kits/render/graphics-language-kit/runtime/loader.js";

const materialFields = { roughness:5, metallic:6, opacity:7, alphaCutoff:8, normalStrength:9, bands:10, outlinePixels:11, softness:12, highlight:13, rim:14 };
function materialValues(runtime, d) {
  const v = runtime.defaults(0);
  if (d.shading !== undefined) v[0] = CAPABILITIES.shading.indexOf(d.shading);
  if (d.alphaMode !== undefined) v[1] = CAPABILITIES.alphaModes.indexOf(d.alphaMode);
  for (const [key, at] of Object.entries(materialFields)) if (d[key] !== undefined) v[at] = d[key];
  v[5] = Math.max(.045, v[5]);
  for (const [key, at] of [["tint",2],["shadowColor",15],["outlineColor",18]]) if (d[key]) v.set(d[key], at);
  return v;
}
function viewValues(runtime, d) {
  const v = runtime.defaults(1);
  for (const [key, at] of [["projection",0],["shadowProjection",19]]) if (d[key]) v.set(Array.from({length:16},(_,i)=>d[key][(i%4)*4+Math.floor(i/4)]), at);
  for (const [key, at] of [["camera",16],["lightDirection",35]]) if (d[key]) v.set(d[key], at);
  for (const [key, at] of [["shadowResolution",38],["closedBackFaces",39],["exposure",40],["sampleScale",41],["shadowBias",42],["receiverPlaneClamp",43],["shadowFilterRadius",44]]) if (d[key] !== undefined) v[at] = Number(d[key]);
  return v;
}
function lightValues(runtime, d) {
  const v = runtime.defaults(2); if (d.color) v.set(d.color);
  ["intensity","fill","sky","skyGradient","specular","specularPower"].forEach((k,i) => { if (d[k] !== undefined) v[i+3] = d[k]; });return v;
}
const transformed = new WeakMap();
function geometryValues(d, transform) {
  const previous=transformed.get(d);
  if (previous && transform.every((v,i)=>v===previous.matrix[i])) return previous.vertices;
  const m = transform, det = m[0]*(m[5]*m[10]-m[9]*m[6])-m[4]*(m[1]*m[10]-m[9]*m[2])+m[8]*(m[1]*m[6]-m[5]*m[2]);
  const inverse = [(m[5]*m[10]-m[9]*m[6])/det,(m[8]*m[6]-m[4]*m[10])/det,(m[4]*m[9]-m[8]*m[5])/det,(m[9]*m[2]-m[1]*m[10])/det,(m[0]*m[10]-m[8]*m[2])/det,(m[8]*m[1]-m[0]*m[9])/det,(m[1]*m[6]-m[5]*m[2])/det,(m[4]*m[2]-m[0]*m[6])/det,(m[0]*m[5]-m[4]*m[1])/det];
  const out = new Float64Array(d.indices.length * 12);
  d.indices.forEach((index, i) => {
    const p = d.positions.slice(index*3,index*3+3);
    const tri = Math.floor(i/3)*3, a=d.indices[tri], b=d.indices[tri+1], c=d.indices[tri+2];
    const u=[0,1,2].map(k=>d.positions[b*3+k]-d.positions[a*3+k]), w=[0,1,2].map(k=>d.positions[c*3+k]-d.positions[a*3+k]);
    const cross=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];
    const length=Math.hypot(...cross); const n = d.normals?.slice(index*3,index*3+3) ?? (length ? cross.map(v=>v/length) : [0,0,1]);
    const t = d.tangents?.slice(index*3,index*3+3) ?? (Math.abs(n[0])<0.9?[1,0,0]:[0,1,0]);
    const point = [0,1,2].map(a => m[a]*p[0]+m[4+a]*p[1]+m[8+a]*p[2]+m[12+a]);
    const normal = [0,1,2].map(a => inverse[a]*n[0]+inverse[3+a]*n[1]+inverse[6+a]*n[2]);
    const tangent = [0,1,2].map(a => m[a]*t[0]+m[4+a]*t[1]+m[8+a]*t[2]);
    out.set([...point,...normal,...(d.uvs?.slice(index*2,index*2+2) ?? [0,0]),...tangent,(d.handedness?.[index] ?? 1)*(det < 0 ? -1 : 1)],i*12);
  });
  transformed.set(d, { matrix: [...transform], vertices: out });
  return out;
}
function resourceBytes(resources) { let sum=0;for(const r of resources.values()) { const count=x=>{if(Array.isArray(x))return x.reduce((s,v)=>s+count(v),0);if(x&&typeof x==='object')return Object.values(x).reduce((s,v)=>s+count(v),0);return typeof x==='number'?8:typeof x==='string'?x.length*2:1;};sum+=count(r); }return sum; }

export function createNexusGLProvider(options = {}) {
  const budget = integer(options.memoryBudgetBytes ?? 128*1024*1024, "memory budget", 1024*1024);
  const fragments = integer(options.maxFragments ?? 262144, "fragment budget", 1, 8388608);
  const resourceBudget = integer(options.maxResourceBytes ?? 32*1024*1024, "resource byte budget", 1);
  let runtime, backend=null, device, scene, initialization, resources = new Map(), revision=0, residencyRevision=0, geometryRevision=0, residentRevision=-1, handles=new Map(), geometrySignature=null;
  let phaseTimes={}, admittedBytes=0, viewSignature=null, lightSignature=null, clearSignature=null;
  let active=null, completed=null, disposed=false, serial=0, resourceRebuilds=0;
  const ready = () => { if(disposed)throw Error("Graphics provider is disposed");if(!device)throw Error("Graphics provider is not initialized"); };
  const idle = () => {ready();if(active)throw Error("Resource mutation requires an idle frame");};
  const lookup = (id,kind) => {const r=resources.get(id);if(!r||r.kind!==kind)throw TypeError(`Unknown ${kind}: ${id}`);return r;};
  const commit = (next, kind, release = false) => {
    const bytes=resourceBytes(next);
    if(bytes>resourceBudget)throw RangeError("Graphics resource byte budget exceeded");
    refs(next);
    resources=next;admittedBytes=bytes;revision++;
    if(kind === 'geometry') { geometryRevision++; geometrySignature=null; }
    else residencyRevision++;
    if(release && scene) { runtime.sceneDestroy(device,scene); scene=null; handles.clear(); residentRevision=-1; geometrySignature=null; }
  };
  const refs = (map=resources) => {for(const r of map.values())if(r.kind==='material')for(const key of ['colorTexture','normalTexture'])if(r.data[key]){const texture=map.get(r.data[key]);if(texture?.kind!=='texture')throw Error(`Missing texture: ${r.data[key]}`);if(texture.data.normalMap!==(key==='normalTexture'))throw Error(`Texture color space does not match ${key}`);}};
  const rebuild = () => {
    if(residentRevision===residencyRevision)return;
    refs();const candidate=runtime.sceneCreate(device);const mapped=new Map();
    try {
      for(const r of resources.values())if(r.kind==='texture'){const d=r.data;mapped.set(r.id,runtime.texture(device,candidate,d.width,d.height,new Uint8Array(d.rgba),['nearest','bilinear','trilinear'].indexOf(d.filter),Number(d.normalMap)));}
      for(const r of resources.values())if(r.kind==='material'){const d=r.data;mapped.set(r.id,runtime.material(device,candidate,materialValues(runtime,d),mapped.get(d.colorTexture)??0n,mapped.get(d.normalTexture)??0n));}
    }catch(error){runtime.sceneDestroy(device,candidate);throw error;}
    if(scene)runtime.sceneDestroy(device,scene);scene=candidate;handles=mapped;viewSignature=lightSignature=clearSignature=null;residentRevision=residencyRevision;geometrySignature=null;resourceRebuilds++;
  };
  const provider={
    id:"nexusgl", version:"1", replayStable:true, capabilities:CAPABILITIES,
    initialize() {
      if(disposed)return Promise.reject(Error("Graphics provider is disposed"));
      if(initialization)return initialization;
      initialization=(async()=>{runtime=await loadNexusGLRuntime(options.backend??'auto',{maximumMemoryBytes:budget+16*1024**2});backend=runtime.backend;if(disposed){runtime=null;throw Error("Graphics provider disposed during initialization");}device=runtime.deviceCreate();try{runtime.limits(device,budget,fragments);}catch(e){runtime.deviceDestroy(device);device=null;runtime=null;throw e;}return {providerId:'nexusgl',backend,ready:true};})();
      initialization.catch(()=>{initialization=null;});return initialization;
    },
    createResource(input) {idle();const r=normalizeResource(input);if(resources.has(r.id))throw Error(`Duplicate resource: ${r.id}`);commit(new Map([...resources,[r.id,r]]),r.kind);return {resourceId:r.id,revision};},
    updateResource(input) {idle();const id=normalizeResource(input).id,r=normalizeResourceUpdate(input,resources.get(id));if(JSON.stringify(r)!==JSON.stringify(resources.get(r.id))){const next=new Map(resources);next.set(r.id,r);commit(next,r.kind);}return {resourceId:r.id,revision};},
    releaseResource(id) {idle();if(!resources.has(id))throw Error(`Unknown resource: ${id}`);for(const r of resources.values())if(r.kind==='material'&&(r.data.colorTexture===id||r.data.normalTexture===id))throw Error(`Resource ${id} is still referenced by ${r.id}`);const kind=resources.get(id).kind;const next=new Map(resources);next.delete(id);commit(next,kind,true);return {resourceId:id,released:true};},
    beginFrame(input) {ready();if(active)throw Error("A frame is already active");const frame=normalizeFrame(input),contract=input?.schema==='nexusengine.render-frame/1'?normalizeRenderFrame(input):null;if(contract?.surfaceId&&contract.surfaceId!==(options.surfaceId??'graphics-language:surface'))throw Error('Frame targets an incompatible surface');for(const id of contract?.resourceIds??[])if(!resources.has(id))throw Error(`Unknown frame resource: ${id}`);active={frame,contract,draws:[],sequence:-1,passes:new Set()};return {frameId:frame.frameId,status:'begun'};},
    executePass(input, draws) {
      ready();if(!active)throw Error("No active frame");const pass=normalizeRenderPass(input);
      if(pass.frameId!==active.frame.frameId||pass.kind!=='render'||pass.sequence<=active.sequence||active.passes.has(pass.passId))throw Error("Unsupported pass or invalid frame ordering");
      if(active.contract?.passIds.length && active.contract.passIds[active.passes.size]!==pass.passId)throw Error('Pass does not match the declared frame order');
      // Attachment/shader/compute execution cannot be silently treated as scene rendering.
      for(const field of ['pipelineId','attachmentIds','readResourceIds','writeResourceIds','commandIds','viewport','scissor'])if(pass[field]&&(Array.isArray(pass[field])?pass[field].length:true))throw Error(`Unsupported pass field: ${field}`);
      draws ??= pass.metadata.graphicsLanguage?.draws ?? [];
      if(!Array.isArray(draws))throw TypeError("draws must be an array");
      const normalized=draws.map(normalizeDraw);normalized.forEach(d=>{lookup(d.geometryId,'geometry');if(d.materialId)lookup(d.materialId,'material');});
      active.draws.push(...normalized);active.sequence=pass.sequence;active.passes.add(pass.passId);return {frameId:pass.frameId,passId:pass.passId,status:'accepted',drawCount:normalized.length};
    },
    submitFrame(input) {
      ready();if(!active)throw Error("No active frame");const id=typeof input==='string'?input:input?.frameId;if(id!==active.frame.frameId)throw Error("Frame identity mismatch");
      const pending=active;active=null;
      try {
        if(pending.contract?.passIds.length && pending.contract.passIds.length!==pending.passes.size)throw Error('Frame has unfinished declared passes');
        const start=performance.now();
        rebuild();const {frame,draws}=pending;
        const view=viewValues(runtime,frame.view),light=lightValues(runtime,frame.light);
        const viewKey=view.join(','),lightKey=light.join(','),clearKey=frame.clear.join(',');
        if(viewKey!==viewSignature){runtime.view(device,scene,view);viewSignature=viewKey;}
        if(lightKey!==lightSignature){runtime.light(device,scene,light);lightSignature=lightKey;}
        if(clearKey!==clearSignature){runtime.background(device,scene,...frame.clear);clearSignature=clearKey;}
        const signature=geometryRevision+JSON.stringify(draws);
        if(signature!==geometrySignature){geometrySignature=null;runtime.clearGeometry(device,scene);for(const draw of draws){const d=lookup(draw.geometryId,'geometry').data;const color=d.color.reduce((v,c,i)=>v+c*2**(8*i),0);runtime.draw(device,scene,geometryValues(d,draw.transform),d.indices.length/3,color,handles.get(draw.materialId)??0n,Number(d.castsShadow),Number(d.twoSidedShadow));}geometrySignature=signature;}
        const geometryEnd=performance.now();
        const pixels=runtime.render(device,scene,frame.width,frame.height,CAPABILITIES.qualityModes.indexOf(frame.quality));
        phaseTimes={geometryMs:geometryEnd-start,rasterMs:performance.now()-geometryEnd};
        completed={frameId:id,width:frame.width,height:frame.height,stride:frame.width*4,serial:++serial,pixels};
        return {frameId:id,status:'completed',serial,providerId:'nexusgl'};
      }catch(error){geometrySignature=null;throw error;}
    },
    getCompletedFrame() {if(!completed)return null;return {...completed,pixels:new Uint8ClampedArray(completed.pixels)};},
    cancelFrame() {ready();active=null;},
    getSnapshot() {idle();return {schema:'nexusengine.nexusgl-resources/1',resources:structuredClone([...resources.values()])};},
    replaceResources(declarations) {idle();if(!Array.isArray(declarations))throw TypeError('Resource declarations must be an array');const list=declarations.map(normalizeResource);if(new Set(list.map(r=>r.id)).size!==list.length)throw Error('Duplicate snapshot resources');const next=new Map(list.map(r=>[r.id,r]));for(const r of list)if(r.kind==='material')for(const key of ['colorTexture','normalTexture'])if(r.data[key]&&next.get(r.data[key])?.kind!=='texture')throw Error('Snapshot has missing texture');commit(next, null, true);geometryRevision++;return {restored:true,resources:resources.size};},
    loadSnapshot(snapshot) {idle();record(snapshot,['schema','resources'],'snapshot');if(snapshot.schema!=='nexusengine.nexusgl-resources/1')throw TypeError('Unsupported graphics snapshot');return provider.replaceResources(snapshot.resources);},
    reset() {ready();active=null;if(scene)runtime.sceneDestroy(device,scene);scene=null;resources=new Map();admittedBytes=0;handles=new Map();residentRevision=-1;geometrySignature=null;completed=null;revision++;residencyRevision++;geometryRevision++;return {reset:true};},
    dispose() {if(disposed)return {disposed:true};disposed=true;active=null;if(device){runtime.deviceDestroy(device);device=null;}scene=null;resources.clear();admittedBytes=0;handles.clear();completed=null;runtime=null;initialization=null;return {disposed:true};},
    getDiagnostics() {return {backend,status:disposed?'disposed':device?'ready':'uninitialized',resources:resources.size,phaseTimes,resourceBytes:admittedBytes,runtimeHeapBytes:runtime?.memoryBytes?.()??0,resourceRebuilds,serial,frameActive:Boolean(active),memoryBudgetBytes:budget,maxFragments:fragments,maxResourceBytes:resourceBudget,revision};},
    capture() {ready();return provider.getCompletedFrame();},
    waitIdle() {ready();if(active)throw Error('Frame is not submitted');return {idle:true};}
  };
  return provider;
}
