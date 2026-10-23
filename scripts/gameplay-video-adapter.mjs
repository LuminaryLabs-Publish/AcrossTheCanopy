import { createAcrossTheCanopyRuntime } from '../source/src/game/nexus-runtime.js';
import { createGameSession } from '../source/src/game/game-session.js';
import { createCaptureDirector } from '../source/src/game/capture-director.js';
import { createNexusGLProvider as createExecutionProvider } from '../source/src/providers/cached-execution-provider.js';
import { createNexusGLProvider } from '../source/src/providers/nexusgl-provider.js';

export async function setup({ options = {} } = {}) {
  const width = Math.max(1, Math.min(640, Number(options.width ?? 640)));
  const height = Math.max(1, Math.min(360, Number(options.height ?? Math.round(width * 9 / 16))));
  const renderLimits={backend:'wasm',memoryBudgetBytes:192*1024**2,maxResourceBytes:64*1024**2,maxFragments:262144};
  const runtime = createAcrossTheCanopyRuntime({
    treeCount: 2300,
    surface: { surfaceId: 'atc:surface/capture', width, height, pixelRatio: 1 },
    graphicsLanguage: {...renderLimits,selection:{provider:createExecutionProvider(renderLimits),reservationBytes:416*1024**2}}
  });
  const provider = createNexusGLProvider({ graphics: runtime.graphicsLanguage, width, height });
  let session = null;
  const director = createCaptureDirector({
    dispatch: (action) => session.dispatch(action),
    setPlayer: (descriptor) => session.setPlayer(descriptor),
    setCamera: (descriptor) => session.setCamera(descriptor),
    setFov: (value) => session.setFov(value),
    getStory: () => session.getStory()
  });
  session = createGameSession({ runtime, provider, capture: director, width, height, pixelRatio: 1 });
  await session.initialize({ width, height, pixelRatio: 1 });

  return {
    frame: () => provider.getCompletedFrame(),
    async step(deltaSeconds) {
      session.step(deltaSeconds);
      await provider.waitIdle();
    },
    async snapshot() {
      const snapshot = session.getSnapshot();
      return {
        schema: 'atc.capture-evidence/1',
        frame: snapshot.frame,
        elapsed: snapshot.elapsed,
        story: snapshot.story,
        player: snapshot.player,
        camera: snapshot.camera,
        capture: director.snapshot(),
        provider: snapshot.provider,
        nexus: runtime.capabilities.nexus
      };
    },
    events: () => director.snapshot().dispatchedOperationIds.map((operationId, index) => ({
      sequence: index + 1,
      operationId,
      type: 'semantic-gameplay-action'
    })),
    dispose: () => provider.dispose(),
    review: {
      source: 'Actual AcrossTheCanopy Nexus runtime, story Kit, authored content, presentation projection, and NexusGL WASM provider.',
      action: 'The complete five-minute The Upward Signal greybox route in ten exact 30-second beats.',
      boundary: 'Deterministic scene and application logic with real interaction actions; browser DOM input is intentionally outside this framebuffer capture.',
      intentionalStubs: ['Silent audio track', 'Colored primitive greybox art in place of final assets']
    }
  };
}

export default setup;
