import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { setup } from './gameplay-video-adapter.mjs';
import { createAcrossTheCanopyRuntime } from '../source/src/game/nexus-runtime.js';
import { createGameSession } from '../source/src/game/game-session.js';
import { createNexusGLProvider } from '../source/src/providers/nexusgl-provider.js';

export async function verifyBudgetRecovery() {
  const runtime = createAcrossTheCanopyRuntime({ treeCount: 8, graphicsLanguage: { backend: 'wasm', memoryBudgetBytes: 48 * 1024 ** 2, maxResourceBytes: 8 * 1024 ** 2, maxFragments: 65536 } });
  const provider = createNexusGLProvider({ graphics: runtime.graphicsLanguage, width: 64, height: 36 });
  const session = createGameSession({ runtime, provider, width: 64, height: 36 });
  try {
    await session.initialize();
    await provider.waitIdle();
    const initial = provider.getCompletedFrame();
    session.resize(2048, 2048);
    session.step();
    await assert.rejects(provider.waitIdle(), /memory|budget|allocation/i);
    assert.deepEqual(provider.getCompletedFrame().pixels, initial.pixels);
    const rejection = provider.getSnapshot().lastError;
    session.resize(64, 36);
    session.step();
    await provider.waitIdle();
    assert.equal(provider.getSnapshot().lastError, null);
    assert.equal(provider.getCompletedFrame().width, 64);
    return { rejected: true, rejection, retainedPixels: true, subsequentFrame: true };
  } finally {
    await provider.dispose();
  }
}

export async function verifyWasmMigration() {
const started = performance.now();
const app = await setup({ options: { width: 640, height: 360 } });
const samples = [];
let snapshot;
try {
  for (let second = 1; second <= 300; second++) {
    await app.step(1);
    snapshot = await app.snapshot();
    assert.equal(snapshot.provider.lastError, null);
    assert.equal(snapshot.provider.completed.presented, true);
    if (second > 20) samples.push({ renderMs: snapshot.provider.lastRenderDurationMs, rssBytes: process.memoryUsage().rss });
    if (second % 60 === 0) console.log(`NexusGL replay: ${second}/300 seconds; ${snapshot.story.locationId}`);
  }
  assert.equal(snapshot.elapsed, 300);
  assert.equal(snapshot.story.completed, true);
  assert.equal(snapshot.story.choice, 'answer_signal');
  assert.equal(snapshot.capture.time, 300);
  const frame = app.frame();
  assert.equal(frame.width, 640);
  assert.equal(frame.height, 360);
  assert.equal(frame.pixels.length, 640 * 360 * 4);
  assert.ok(frame.pixels.some((value, index) => index % 4 !== 3 && value !== 0));
  const digest = createHash('sha256').update(frame.pixels).digest('hex');
  frame.pixels.fill(0);
  assert.notEqual(createHash('sha256').update(app.frame().pixels).digest('hex'), createHash('sha256').update(frame.pixels).digest('hex'));
  await app.dispose();
  const disposed = (await app.snapshot()).provider;
  assert.equal(disposed.initialized, false);
  assert.equal(disposed.resourceCount, 0);
  assert.equal(app.frame(), null);
  const budgetRecovery = await verifyBudgetRecovery();
  const times = samples.map(value => value.renderMs).sort((a, b) => a - b);
  const percentile = value => times[Math.min(times.length - 1, Math.floor((times.length - 1) * value))];
  const evidence = {
    schema: 'atc.wasm-migration-proof/1', observedAt: new Date().toISOString(), node: process.version,
    simulatedSeconds: 300, wallSeconds: (performance.now() - started) / 1000,
    story: snapshot.story, capture: snapshot.capture, finalProvider: snapshot.provider, disposed, budgetRecovery,
    frame: { width: 640, height: 360, worldWidth: 320, worldHeight: 180, sha256: digest, independentlyOwned: true },
    measurements: { warmupFrames: 20, sampleCount: samples.length, renderMs: { p50: percentile(.5), p95: percentile(.95), max: times.at(-1) }, sampledPeakRssBytes: Math.max(...samples.map(value => value.rssBytes)), processHighWaterRssBytes: process.resourceUsage().maxRSS * 1024 },
    boundary: 'Real NexusGL WASM and game/session/capture path; scripted semantic actions, not browser input. FPS HUD and frame hash depend on measured timing. RSS includes the whole Node process, not just the renderer.'
  };
  const output = new URL('../.agent/evidence/', import.meta.url);
  await mkdir(output, { recursive: true });
  await writeFile(new URL('wasm-migration-proof.json', output), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ completed: true, choice: snapshot.story.choice, ...evidence.measurements }));
} catch (error) {
  await app.dispose();
  throw error;
}

}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await verifyWasmMigration();
