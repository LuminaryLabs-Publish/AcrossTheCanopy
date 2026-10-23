import { createNexusGLProvider } from './cached-execution-provider.js';

let provider;
let queue = Promise.resolve();
self.onmessage = ({ data }) => {
  queue = queue.then(async () => {
    try {
      if (data.method === 'initialize') provider = createNexusGLProvider(data.args[0]);
      if (!provider || typeof provider[data.method] !== 'function') throw new Error('Invalid render worker command.');
      const result = await provider[data.method](...(data.method === 'initialize' ? [] : data.args));
      const diagnostics = ['initialize', 'createResource', 'releaseResource', 'reset', 'dispose', 'submitFrame'].includes(data.method) ? provider.getDiagnostics() : undefined;
      const transfer = result?.pixels?.buffer ? [result.pixels.buffer] : [];
      self.postMessage({ id: data.id, result, diagnostics }, transfer);
    } catch (error) {
      self.postMessage({ id: data.id, error: { name: error.name, message: error.message } });
    }
  });
};
