import { validateRenderProvider } from 'nexusengine/domains/render/provider-contract';
import { assertPresentationPacket } from '../game/presentation-projection.js';

export function createMockRenderProvider() {
  let initialized = false;
  let frame = 0;
  let packet = null;
  const resources = new Map();
  const receipts = [];
  const receipt = (type, payload = {}) => {
    const value = { sequence: receipts.length + 1, type, ...structuredClone(payload) };
    receipts.push(value);
    return structuredClone(value);
  };
  const provider = {
    id: 'atc:provider/mock-proof',
    version: '0.1.0-greybox',
    replayStable: true,
    capabilities: { backend: 'mock', presentationPackets: ['atc.presentation-packet/1'], framebuffer: false },
    async initialize(options = {}) {
      initialized = true;
      return receipt('initialize', { width: Number(options.width ?? 0), height: Number(options.height ?? 0) });
    },
    async createResource(resource = {}) {
      const id = String(resource.id ?? `resource:${resources.size + 1}`);
      resources.set(id, structuredClone(resource));
      return receipt('create-resource', { id });
    },
    async updateResource(id, patch = {}) {
      const key = typeof id === 'object' ? String(id.id) : String(id);
      resources.set(key, { ...(resources.get(key) ?? {}), ...structuredClone(patch) });
      return receipt('update-resource', { id: key });
    },
    async releaseResource(id) {
      const key = typeof id === 'object' ? String(id.id) : String(id);
      return receipt('release-resource', { id: key, released: resources.delete(key) });
    },
    async beginFrame(input = {}) {
      frame = Number(input.frame ?? frame + 1);
      return receipt('begin-frame', { frame });
    },
    async executePass(input = {}) {
      packet = structuredClone(assertPresentationPacket(input.packet ?? input.presentation ?? input));
      return receipt('execute-pass', { frame, revision: packet.revision, objects: packet.objects.length, trees: packet.trees.length });
    },
    async submitFrame() {
      return receipt('submit-frame', { frame, revision: packet?.revision ?? null });
    },
    async reset() {
      frame = 0;
      packet = null;
      resources.clear();
      return receipt('reset');
    },
    async dispose() {
      initialized = false;
      packet = null;
      resources.clear();
      return receipt('dispose');
    },
    getSnapshot() {
      return {
        initialized,
        frame,
        packet: packet ? structuredClone(packet) : null,
        resources: Object.fromEntries([...resources.entries()].sort(([left], [right]) => left.localeCompare(right))),
        receipts: structuredClone(receipts)
      };
    },
    async loadSnapshot(snapshot = {}) {
      initialized = snapshot.initialized === true;
      frame = Math.max(0, Number(snapshot.frame ?? 0));
      packet = snapshot.packet ? structuredClone(assertPresentationPacket(snapshot.packet)) : null;
      resources.clear();
      for (const [id, resource] of Object.entries(snapshot.resources ?? {})) resources.set(id, structuredClone(resource));
      return receipt('load-snapshot', { frame });
    }
  };
  validateRenderProvider(provider);
  return Object.freeze(provider);
}

export default createMockRenderProvider;
