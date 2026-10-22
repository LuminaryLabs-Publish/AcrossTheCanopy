import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { AUTHORED_OBJECTS, routeEntrancePoint } from '../source/src/game/content.js';
import { storySavePayload } from '../source/src/game/story-model.js';

const directory = fileURLToPath(new URL('../.agent/evidence/', import.meta.url));
const report = { schema: 'atc.browser-migration-proof/1', stages: [], errors: [] };
const watched = new WeakSet();
const snapshot = page => page.evaluate(() => { const s = globalThis.__ACROSS_THE_CANOPY__.getSnapshot(); return { story: s.story, camera: s.camera, player: s.player, output: s.output, provider: s.provider }; });
const concise = value => ({ story: value.story, camera: value.camera, player: value.player, output: value.output, provider: value.provider });

async function closeDialogue(page) {
  const { story } = await snapshot(page);
  if (!story.dialogue) return;
  const remaining = story.dialogue.lines.length - story.dialogue.index;
  assert.ok(remaining > 0 && remaining < 20);
  for (let count = 0; count < remaining; count++) await page.keyboard.press('Space');
  await page.waitForFunction(() => !globalThis.__ACROSS_THE_CANOPY__.getSnapshot().story.dialogue);
}

async function orient(page, desiredYaw, desiredPitch) {
  const wrap = value => Math.atan2(Math.sin(value), Math.cos(value));
  for (let attempt = 0; attempt < 5; attempt++) {
    const state = await snapshot(page);
    const dx = -wrap(desiredYaw - state.camera.yaw) / .0032;
    const dy = -(Math.max(-1.25, Math.min(.95, desiredPitch)) - state.camera.pitch) / .0032;
    // The game's pointer adapter treats motion under four pixels as a click.
    // Project the remaining small aim error instead of emitting a tiny drag.
    if (Math.hypot(dx, dy) < 6) break;
    await page.mouse.move(640, 280);
    await page.mouse.down();
    await page.mouse.move(640 + Math.max(-450, Math.min(450, dx)), 280 + Math.max(-180, Math.min(180, dy)), { steps: 3 });
    await page.mouse.up();
  }
}

async function interact(page, id) {
  const object = AUTHORED_OBJECTS.find(value => value.id === id);
  assert.ok(object, `unknown object ${id}`);
  let state = await snapshot(page);
  const visual = object.visual;
  let position = [...object.position];
  if (id === 'atc:npc/sela-oren' && state.story.world.returned_to_rows) position = [8, 72.1, -18];
  if (visual.shape === 'ring') position = [position[0] + visual.size[0] * .5, position[1] - .9, position[2]];
  if (visual.shape === 'route') { position = routeEntrancePoint(visual.path); position[1] += .3; }
  if (['beacon', 'cell'].includes(visual.shape)) position[1] += visual.size[1] * .3;
  const delta = position.map((value, axis) => value - state.camera.position[axis]);
  const desiredYaw = Math.atan2(-delta[0], -delta[2]);
  const desiredPitch = Math.atan2(delta[1], Math.hypot(delta[0], delta[2]));
  await orient(page, desiredYaw, desiredPitch);
  state = await snapshot(page);
  const { camera } = state, cp = Math.cos(camera.pitch);
  const forward = [-Math.sin(camera.yaw) * cp, Math.sin(camera.pitch), -Math.cos(camera.yaw) * cp];
  const right = [Math.cos(camera.yaw), 0, -Math.sin(camera.yaw)];
  const up = [right[1] * forward[2] - right[2] * forward[1], right[2] * forward[0] - right[0] * forward[2], right[0] * forward[1] - right[1] * forward[0]];
  const relative = position.map((value, axis) => value - camera.position[axis]);
  const dot = (a, b) => a.reduce((sum, value, axis) => sum + value * b[axis], 0);
  const distance = dot(relative, forward), tangent = Math.tan(camera.fov * Math.PI / 360);
  const rect = await page.locator('#world').boundingBox();
  const x = rect.x + rect.width * (.5 + .5 * dot(relative, right) / (distance * tangent * rect.width / rect.height));
  const y = rect.y + rect.height * (.5 - .5 * dot(relative, up) / (distance * tangent));
  assert.ok(x > 0 && x < 1280 && y > 0 && y < 720, `${id} must be in the viewport`);
  await page.mouse.move(x, y);
  await page.waitForFunction(target => globalThis.__ACROSS_THE_CANOPY__.getSnapshot().story.focusId === target, id, { timeout: 10000 });
  const revision = (await snapshot(page)).story.revision;
  await page.mouse.click(x, y);
  await page.waitForFunction(previous => globalThis.__ACROSS_THE_CANOPY__.getSnapshot().story.revision > previous, revision, { timeout: 10000 });
}

async function waitMovement(page) {
  await page.waitForFunction(() => { const s = globalThis.__ACROSS_THE_CANOPY__.getSnapshot().story; return !s.traversal && !s.navigation; }, null, { timeout: 45000 });
}

async function capture(page, name) {
  await page.waitForFunction(() => !globalThis.__ACROSS_THE_CANOPY__.getSnapshot().provider.lastError);
  await page.screenshot({ path: `${directory}/nexusgl-${name}.png`, timeout: 15000 });
}

// A caller supplies its real Playwright page; this module adds no browser or
// graphics dependency to the game. Every story action below uses mouse/keys.
export async function verifyBrowserMigration(page, { stage = 'open', url = 'http://127.0.0.1:4187/' } = {}) {
  await mkdir(directory, { recursive: true });
  if (!watched.has(page)) { page.on('pageerror', error => report.errors.push(error.message)); watched.add(page); }
  if (stage === 'open') {
    report.stages = []; report.errors = [];
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(url);
    await page.waitForFunction(() => globalThis.__ACROSS_THE_CANOPY__?.getSnapshot().provider?.completed?.width === 640);
    await capture(page, 'starter-perch');
  } else if (stage === 'starter') {
    await interact(page, 'atc:trigger/spawn/starter-perch');
    await closeDialogue(page);
    const before = (await snapshot(page)).player.position;
    await page.keyboard.down('w'); await page.waitForTimeout(2000); await page.keyboard.up('w');
    assert.notDeepEqual((await snapshot(page)).player.position, before);
    await capture(page, 'movement');
    await interact(page, 'atc:story/echo-spindle'); await capture(page, 'spindle'); await closeDialogue(page);
    await interact(page, 'atc:npc/sela-oren'); await closeDialogue(page);
    assert.equal((await snapshot(page)).story.flags.sela_warning_heard, true);
  } else if (stage === 'branch') {
    await interact(page, 'atc:route/starter-branch'); await waitMovement(page);
    await interact(page, 'atc:route/trunk-switchback'); await waitMovement(page);
    await capture(page, 'branch-and-trunk');
  } else if (stage === 'rows') {
    await interact(page, 'atc:clue/crew-notch'); await waitMovement(page); await capture(page, 'crew-notch'); await closeDialogue(page);
    await interact(page, 'atc:interact/rows-lantern'); await waitMovement(page); await closeDialogue(page);
    assert.equal((await snapshot(page)).story.flags.rows_need_known, true);
    await capture(page, 'hanging-rows');
  } else if (stage === 'market') {
    await interact(page, 'atc:route/rows-market-bridge'); await waitMovement(page);
    await interact(page, 'atc:clue/market-route-board'); await closeDialogue(page);
    await capture(page, 'low-market');
  } else if (stage === 'puzzle') {
    for (const dial of ['a', 'b', 'c']) await interact(page, `atc:puzzle/descent-lock/dial-${dial}`);
    await interact(page, 'atc:puzzle/descent-lock/submit'); await closeDialogue(page);
    assert.equal((await snapshot(page)).story.flags.descent_lock_open, true);
    await capture(page, 'lock-open');
  } else if (stage === 'station') {
    await interact(page, 'atc:route/descent-line'); await waitMovement(page); await closeDialogue(page);
    await interact(page, 'atc:story/station-console'); await closeDialogue(page);
    assert.equal((await snapshot(page)).story.flags.station_signal_verified, true);
    report.stationSave = await page.evaluate(() => globalThis.__ACROSS_THE_CANOPY__.save('migration-station').payload);
    await capture(page, 'station');
  } else if (stage === 'answer' || stage === 'recover') {
    if (stage === 'recover') {
      assert.ok(report.stationSave);
      await page.evaluate(payload => globalThis.__ACROSS_THE_CANOPY__.load(payload), report.stationSave);
      const frame = (await snapshot(page)).provider.frame;
      await page.keyboard.press('e');
      await page.waitForFunction(previous => globalThis.__ACROSS_THE_CANOPY__.getSnapshot().frame > previous + 2, frame);
      const restored = await snapshot(page);
      assert.equal(restored.story.choice, null, 'old input must not replay into the restored station');
      assert.equal(restored.story.navigation, null, 'old focus must not start travel after restore');
      await orient(page, 0, 0);
      await page.keyboard.down('d'); await page.waitForTimeout(2000); await page.keyboard.up('d');
    }
    await interact(page, stage === 'answer' ? 'atc:choice/answer-beacon' : 'atc:choice/recover-cell');
    await page.keyboard.press('Enter'); await closeDialogue(page);
    await interact(page, 'atc:route/station-return'); await waitMovement(page);
    await interact(page, 'atc:npc/sela-oren'); await closeDialogue(page);
    const state = await snapshot(page);
    assert.equal(state.story.completed, true);
    assert.equal(state.story.choice, stage === 'answer' ? 'answer_signal' : 'recover_cell');
    await capture(page, `${stage}-ending`);
  } else if (stage === 'optional') {
    const finalSave = (await snapshot(page)).story.completed
      ? await page.evaluate(() => globalThis.__ACROSS_THE_CANOPY__.save('migration-final').payload)
      : await page.evaluate(() => globalThis.__ACROSS_THE_CANOPY__.load('migration-final'));
    assert.ok(finalSave?.completed, 'preserve the completed game before optional-route checks');
    const branch = report.stages.find(value => value.stage === 'branch');
    assert.ok(branch);
    const earlier = storySavePayload(branch.story, { position: branch.player.position, fov: branch.camera.fov });
    await page.evaluate(payload => globalThis.__ACROSS_THE_CANOPY__.load(payload), earlier);
    report.optionalRoutes = [];
    for (const id of ['atc:route/high-glide', 'atc:route/rows-market-glide']) {
      await interact(page, id); await waitMovement(page);
      const state = await snapshot(page);
      report.optionalRoutes.push({ routeId: id, player: state.player, location: state.story.locationId });
      await capture(page, id.endsWith('high-glide') ? 'high-glide' : 'market-glide');
    }
    await page.evaluate(payload => globalThis.__ACROSS_THE_CANOPY__.load(payload), finalSave);
    assert.equal((await snapshot(page)).story.completed, true);
  } else if (stage === 'host') {
    const saved = await page.evaluate(() => globalThis.__ACROSS_THE_CANOPY__.save('migration-host-check').payload);
    const ready = async () => page.waitForFunction(() => { const p = globalThis.__ACROSS_THE_CANOPY__?.getSnapshot().provider; return p?.initialized && p.completed && !p.lastError; });
    await page.goto('about:blank');
    await page.goBack({ waitUntil: 'networkidle' });
    await ready();
    await page.evaluate(payload => globalThis.__ACROSS_THE_CANOPY__.load(payload), saved);
    assert.equal((await snapshot(page)).story.completed, true);
    await page.route('**/nexusgl.wasm', route => route.abort('failed'));
    await page.reload();
    const alert = page.getByRole('alert');
    await alert.waitFor({ state: 'visible' });
    const message = await alert.textContent();
    assert.ok(message.includes('could not start NexusGL'));
    await page.screenshot({ path: `${directory}/nexusgl-boot-failure.png`, timeout: 15000 });
    await page.unroute('**/nexusgl.wasm');
    await page.reload(); await ready();
    for (let cycle = 0; cycle < 3; cycle++) {
      await page.reload(); await ready();
      assert.equal((await snapshot(page)).provider.resourceCount, 44);
    }
    const frame = (await snapshot(page)).provider.frame;
    await page.evaluate(payload => globalThis.__ACROSS_THE_CANOPY__.load(payload), saved);
    await page.waitForFunction(previous => globalThis.__ACROSS_THE_CANOPY__.getSnapshot().provider.completed.packetRevision > previous, frame);
    assert.equal((await snapshot(page)).story.completed, true);
    await capture(page, 'host-restored');
    report.hostRecovery = { navigationRoundTrip: true, visibleBootFailure: message, recovered: true, successfulReloadCycles: 5, resourceCount: 44, boundary: 'Reload/readiness and save restoration; not a whole-process memory-leak proof.' };
  } else if (stage === 'controls') {
    const before = await snapshot(page);
    await page.keyboard.press('p'); assert.equal((await snapshot(page)).story.paused, true);
    await page.keyboard.press('p'); assert.equal((await snapshot(page)).story.paused, false);
    await page.keyboard.press(']'); assert.equal((await snapshot(page)).camera.fov, before.camera.fov + 2);
    await page.mouse.click(1152, 670);
    assert.ok(Math.abs((await snapshot(page)).camera.fov - 97.24) < .5);
    await page.keyboard.press('j'); assert.equal((await snapshot(page)).story.mode, 'journal');
    await page.keyboard.press('Escape'); assert.notEqual((await snapshot(page)).story.mode, 'journal');
    await page.mouse.move(640, 360); await page.mouse.down(); await page.mouse.move(800, 360, { steps: 4 }); await page.mouse.up();
    await capture(page, 'look-left');
    await page.mouse.move(640, 360); await page.mouse.down(); await page.mouse.move(320, 360, { steps: 4 }); await page.mouse.up();
    await capture(page, 'look-right');
    await page.setViewportSize({ width: 800, height: 600 });
    await capture(page, 'resized');
    await page.setViewportSize({ width: 1280, height: 720 });
  } else throw new Error(`unknown stage ${stage}`);
  const state = concise(await snapshot(page));
  assert.equal(state.provider.lastError, null);
  report.stages.push({ stage, observedAt: new Date().toISOString(), ...state });
  await writeFile(`${directory}/browser-migration-proof.json`, `${JSON.stringify(report, null, 2)}\n`);
  return { stage, mode: state.story.mode, location: state.story.locationId, flags: state.story.flags, choice: state.story.choice, completed: state.story.completed, provider: state.provider, errors: report.errors };
}
