import './style.css';
import { createAcrossTheCanopyRuntime } from './game/nexus-runtime.js';
import { createGameSession, FIXED_DELTA } from './game/game-session.js';
import { createCaptureDirector } from './game/capture-director.js';
import { createWorkerProvider } from './providers/worker-provider.js';
import { createNexusGLProvider } from './providers/nexusgl-provider.js';
import { createNexusGLPickAdapter } from './adapters/nexusgl-pick.js';
import { createBrowserInputAdapter } from './adapters/browser-input.js';

async function bootstrap() {
  const canvas = document.querySelector('#world');
  if (!canvas) throw new Error('Across the Canopy requires the #world canvas.');
  const captureEnabled = new URLSearchParams(location.search).get('capture') === '1';
  const surface = {
    surfaceId: 'atc:surface/main',
    width: 2560,
    height: 1440,
    pixelRatio: 1
  };
  const renderLimits = { backend: 'wasm', memoryBudgetBytes: 192 * 1024 ** 2, maxResourceBytes: 64 * 1024 ** 2, maxFragments: 262144 };
  const workerProvider = createWorkerProvider(renderLimits);
  const runtime = createAcrossTheCanopyRuntime({
    treeCount: 2300,
    surface,
    graphicsLanguage: { ...renderLimits, selection: { provider: workerProvider, reservationBytes: 416 * 1024 ** 2 } }
  });
  const provider = createNexusGLProvider({ graphics: runtime.graphicsLanguage, canvas, ...surface, onError: (error) => console.error('NexusGL frame failed.', error) });
  let session = null;
  const capture = captureEnabled ? createCaptureDirector({
    dispatch: (action) => session.dispatch(action),
    setPlayer: (descriptor) => session.setPlayer(descriptor),
    setCamera: (descriptor) => session.setCamera(descriptor),
    setFov: (value) => session.setFov(value),
    getStory: () => session.getStory()
  }) : null;
  session = createGameSession({ runtime, provider, capture, ...surface });
  await session.initialize({ surface: canvas, ...surface });

  const picker = createNexusGLPickAdapter({ getPacket: () => provider.getPickContext().packet ?? session.getPacket() });
  const input = captureEnabled ? null : createBrowserInputAdapter({
    canvas,
    pick: picker.pick,
    getPresentation: session.getPresentation,
    dispatch: session.dispatch,
    setLook: session.setLook,
    setMovement: session.setMovement,
    setFov: session.setFov
  });

  let previous = performance.now();
  let accumulator = 0;
  let running = true;
  function frame(now) {
    if (!running) return;
    accumulator = Math.min(0.25, accumulator + Math.max(0, (now - previous) / 1000));
    previous = now;
    while (accumulator >= FIXED_DELTA) {
      session.step(FIXED_DELTA, { present: accumulator < FIXED_DELTA * 2 });
      accumulator -= FIXED_DELTA;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function resize() {
    session.resize(
      2560,
      1440,
      1
    );
  }
  addEventListener('resize', resize, { passive: true });
  addEventListener('pagehide', () => {
    running = false;
    input?.dispose();
    provider.dispose();
  }, { once: true });
  addEventListener('pageshow', (event) => {
    if (event.persisted) location.reload();
  });

  globalThis.__ACROSS_THE_CANOPY__ = Object.freeze({
    getSnapshot: session.getSnapshot,
    getRenderDiagnostics: workerProvider.getDiagnostics,
    getMovementDiagnostics: () => { const state=runtime.engine.n.actionLocomotion.getState(); return {sequence:state.sequence,operationReceipts:Object.keys(state.operationReceipts??{}).length,serializedBytes:new TextEncoder().encode(JSON.stringify(state)).length}; },
    getDisplayedView: () => { const p=provider.getPickContext().packet; return p ? { camera: structuredClone(p.camera), revision: p.revision } : null; },
    getPerformanceSnapshot: () => ({ provider: provider.getSnapshot(), execution: workerProvider.getDiagnostics() }),
    captureFrame: provider.getCompletedFrame,
    save: session.save,
    load: (...args) => { input?.setFocusId(null); return session.load(...args); },
    reset: () => { input?.setFocusId(null); return session.reset(); },
    capabilities: session.capabilities
  });
}

bootstrap().catch((error) => {
  console.error('Across the Canopy failed to start.', error);
  document.documentElement.dataset.boot = 'failed';
  const notice = document.createElement('p');
  notice.className = 'boot-error';
  notice.setAttribute('role', 'alert');
  notice.textContent = `Across the Canopy could not start NexusGL. Reload to retry. ${error.message}`;
  document.querySelector('#app')?.replaceChildren(notice);
});
