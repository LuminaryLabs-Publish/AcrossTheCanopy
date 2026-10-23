import { CAPABILITIES } from 'nexusengine/domains/render/graphics-language';

// Only execution lives here. Core installation/resources remain with the kit;
// the worker owns one NexusGL provider and returns independently owned pixels.
export function createWorkerProvider(options = {}) {
  const worker = new Worker(new URL('./render-worker.js', import.meta.url), { type: 'module', name: 'AcrossTheCanopy NexusGL' });
  let serial = 0, closed = false;
  let diagnostics = { backend: 'nexusgl-wasm-worker', status: 'uninitialized', resources: 0 };
  const pending = new Map();
  function fail(error) {
    for (const { reject, timer } of pending.values()) { clearTimeout(timer); reject(error); }
    pending.clear(); closed = true; worker.terminate();
  }
  worker.onerror = event => { event.preventDefault(); fail(new Error(event.message || 'NexusGL rendering worker failed.')); };
  worker.onmessageerror = () => fail(new Error('NexusGL worker returned an invalid message.'));
  worker.onmessage = ({ data }) => {
    const operation = pending.get(data.id);
    if (!operation) return;
    pending.delete(data.id); clearTimeout(operation.timer);
    if (data.diagnostics) diagnostics = { ...data.diagnostics, execution: 'worker' };
    if (data.error) { const error = new Error(data.error.message); error.name = data.error.name; operation.reject(error); }
    else operation.resolve(data.result);
  };
  function call(method, ...args) {
    if (closed) return Promise.reject(new Error('Rendering worker is disposed.'));
    const id = ++serial;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => fail(new Error(`NexusGL worker ${method} timed out.`)), 30000);
      pending.set(id, { resolve, reject, timer });
      try { worker.postMessage({ id, method, args }); }
      catch (error) { clearTimeout(timer); pending.delete(id); reject(error); }
    });
  }
  return {
    id: 'nexusgl', version: '1', replayStable: true, capabilities: CAPABILITIES,
    initialize: () => call('initialize', options),
    ...Object.fromEntries(['createResource', 'updateResource', 'releaseResource', 'beginFrame', 'executePass', 'submitFrame', 'getCompletedFrame', 'cancelFrame', 'replaceResources', 'reset', 'waitIdle', 'loadSnapshot', 'getSnapshot'].map(method => [method, (...args) => call(method, ...args)])),
    getDiagnostics: () => ({ ...diagnostics, queuedOperations: pending.size }),
    async dispose() {
      if (closed) return { disposed: true };
      try { return await call('dispose'); }
      finally { fail(new Error('Rendering worker disposed.')); diagnostics = { status: 'disposed', resources: 0 }; }
    }
  };
}
