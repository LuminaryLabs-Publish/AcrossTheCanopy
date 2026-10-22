import { defineConfig } from 'vite';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const wasmArtifacts = resolve('node_modules/nexusengine/kits/render/graphics-language-kit/runtime/artifacts');

function copyNexusGlRuntime() {
  return {
    name: 'across-copy-nexusgl-runtime',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const match = request.url?.match(/\/graphics-language-kit\/runtime\/(manifest\.json|nexusgl\.mjs|nexusgl\.wasm)(?:\?.*)?$/);
        if (!match) return next();
        try {
          const body = await readFile(resolve(wasmArtifacts, match[1]));
          response.setHeader('Content-Type', match[1].endsWith('.json') ? 'application/json' : match[1].endsWith('.mjs') ? 'text/javascript' : 'application/wasm');
          response.setHeader('Cache-Control', 'no-cache');
          response.end(body);
        } catch (error) {
          next(error);
        }
      });
    },
    async closeBundle() {
      const destination = resolve('dist/assets/artifacts');
      await mkdir(destination, { recursive: true });
      for (const file of ['manifest.json', 'nexusgl.mjs', 'nexusgl.wasm']) {
        await copyFile(resolve(wasmArtifacts, file), resolve(destination, file));
      }
    },
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'chunk' && Object.keys(chunk.modules).some(id => /\/node_modules\/three\//.test(id))) {
          throw new Error('The NexusGL game bundle must not include Three.js.');
        }
      }
    }
  };
}

export default defineConfig({
  base: './',
  optimizeDeps: { exclude: ['nexusengine'] },
  build: { assetsDir: 'assets' },
  plugins: [copyNexusGlRuntime()]
});
