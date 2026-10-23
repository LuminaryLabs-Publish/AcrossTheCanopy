import { followCamera, cameraBoomFraction, angleDelta } from '../src/game/third-person.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import { NEXUS_COMMIT } from '../src/game/content.js';
import { createAcrossTheCanopyRuntime } from '../src/game/nexus-runtime.js';
import { createGameSession, FIXED_DELTA } from '../src/game/game-session.js';
import { createMockRenderProvider } from '../src/providers/mock-provider.js';

test('the pinned Nexus composition owns the complete greybox authority graph', () => {
  const runtime = createAcrossTheCanopyRuntime({ treeCount: 2300, surface: { width: 640, height: 360, pixelRatio: 1 } });

  assert.equal(runtime.capabilities.nexus.commit, NEXUS_COMMIT);
  assert.equal(runtime.engine.driveSequenceNodesWithTick, false);
  assert.ok(runtime.capabilities.nexus.installedKitIds.length >= 40);
  assert.equal(runtime.getTrees().length, 2300);
  assert.equal(runtime.getPlacements().length, 31);
  assert.equal(runtime.getTreeBatch().capacity, 2300);
  assert.equal(runtime.engine.n.renderProviderContract.validateProvider instanceof Function, true);
  assert.ok(runtime.capabilities.nexus.domainPaths.includes('n:render:graphics-language'));
  assert.equal(runtime.worldInitialization.navmesh.schema, 'nexusengine.navigation-graph-3d/1');
  assert.ok(runtime.worldInitialization.navmesh.waypoints.length > 100);

  runtime.dispatchAction({ operationId: 'test:runtime/begin', sequence: 1, type: 'begin', targetId: 'atc:trigger/spawn/starter-perch' });
  runtime.tick(1 / 60);
  assert.equal(runtime.getStory().dialogue.id, 'opening');

  runtime.setPresentation({ fov: 120 });
  assert.equal(runtime.getPlayer().fov, 120);
  const save = runtime.save('test-slot');
  assert.equal(save.schema, 'atc.nexus-runtime/1');
  runtime.reset();
  assert.equal(runtime.getStory().mode, 'intro');
  runtime.load('test-slot');
  assert.equal(runtime.getStory().dialogue, null);
  assert.equal(runtime.getPlayer().fov, 120);
});

test('fixed simulation steps can share one presentation and restored saves clear transient focus', async () => {
  const runtime = createAcrossTheCanopyRuntime({ treeCount: 8 });
  const provider = createMockRenderProvider();
  const session = createGameSession({ runtime, provider, width: 640, height: 360 });
  try {
    await session.initialize();
    const count = () => provider.getSnapshot().receipts.filter(receipt => receipt.type === 'execute-pass').length;
    const before = count();
    session.dispatch({ type: 'begin', targetId: 'atc:trigger/spawn/starter-perch' });
    const yaw = session.getCamera().yaw;
    session.step(FIXED_DELTA, { present: false });
    session.step(FIXED_DELTA, { present: false });
    assert.equal(count(), before);
    session.step(FIXED_DELTA);
    assert.equal(count(), before + 1);
    assert.equal(session.getPacket().revision, 3);
    assert.equal(session.getSnapshot().elapsed, FIXED_DELTA * 3);
    assert.equal(session.getCamera().yaw, yaw, 'opening at the current position must not turn the camera backwards');
    const save = session.save('migration-test').payload;
    session.dispatch({ type: 'inspect', targetId: 'atc:story/echo-spindle' });
    session.step(FIXED_DELTA);
    assert.equal(session.getStory().flags.spindle_inspected, true);
    session.load(save);
    session.step(FIXED_DELTA);
    assert.equal(session.getStory().flags.spindle_inspected, false, 'old input must not replay into the restored save');
    assert.equal(session.getStory().focusId, null);
    assert.equal(session.getStory().dialogue, null);
  } finally {
    await provider.dispose();
    await runtime.graphicsLanguage.dispose();
  }
});


test('third-person movement keeps player authority, animates and toggles to first person without teleporting', async()=>{
  const runtime=createAcrossTheCanopyRuntime({treeCount:1000});
  const provider=createMockRenderProvider();
  const session=createGameSession({runtime,provider,width:640,height:360});
  try {
    await session.initialize();
    session.dispatch({type:'begin',targetId:'atc:trigger/spawn/starter-perch'});session.step();
    for(let i=0;i<10&&session.getStory().dialogue;i++){session.dispatch({type:'advance'});session.step();}
    const before=session.getSnapshot().player.position;
    session.setMovement({forward:1,right:0});
    for(let i=0;i<60;i++)session.step(FIXED_DELTA,{present:i===59});
    session.setMovement({forward:0,right:0});
    for(let i=0;i<30;i++)session.step(FIXED_DELTA,{present:i===29});
    const walking=session.getSnapshot();
    assert.notDeepEqual(walking.player.position,before);
    assert.notDeepEqual(walking.player.position,walking.camera.position);
    assert.equal(walking.camera.mode,'third-person');
    assert.ok(session.getPacket().avatar.stridePhase>0);
    assert.equal(Object.keys(runtime.engine.n.actionLocomotion.getState().operationReceipts??{}).length,0,'continuous movement must not accumulate command receipts');
    const position=walking.player.position;
    session.dispatch({type:'toggle-camera'});session.step();
    assert.equal(session.getSnapshot().camera.mode,'first-person');
    assert.deepEqual(session.getSnapshot().player.position,position);
    assert.equal(session.getPacket().avatar,null);
    const save=session.save('camera-check').payload;
    session.dispatch({type:'toggle-camera'});session.load(save);session.step();
    assert.equal(session.getSnapshot().camera.mode,'third-person');
    assert.deepEqual(session.getSnapshot().player.position,position);
  } finally {await provider.dispose();await runtime.graphicsLanguage.dispose();}
});

test('a minute of sampled movement stays bounded and preserves explicit command receipts', async()=>{
  const runtime=createAcrossTheCanopyRuntime({treeCount:1000});
  await runtime.graphicsLanguage.ready;
  const api=runtime.engine.n.actionLocomotion;
  try {
    const command={operationId:'explicit-once',delta:0,input:{x:0,z:0},contact:{grounded:true,groundHeight:86}};
    const receipt=api.step(command);
    for(let i=0;i<3600;i++){
      runtime.tick(FIXED_DELTA);
      runtime.integrateMovement({delta:FIXED_DELTA,input:{x:i%120<60?1:-1,z:0},contact:{grounded:true,groundHeight:86}},frame=>[Math.max(-3,Math.min(3,frame.position.x)),86,56]);
    }
    const state=api.getState();
    assert.deepEqual(Object.keys(state.operationReceipts),['explicit-once']);
    assert.deepEqual(api.step(command),receipt,'durable command deduplication is unchanged');
    assert.ok(JSON.stringify(state).length<8192,'continuous input must not grow serialized state');
    assert.throws(()=>runtime.integrateMovement({delta:FIXED_DELTA,input:{x:0,z:1}}),/already integrated/);
    runtime.reset();runtime.tick(FIXED_DELTA);
    assert.doesNotThrow(()=>runtime.integrateMovement({delta:FIXED_DELTA,input:{x:0,z:0},contact:{grounded:true,groundHeight:86}}));
  } finally {await runtime.graphicsLanguage.dispose();}
});

test('third-person boom snaps out of walls, eases normally and resets without old follow state', () => {
  const wall={position:[0,2,2],visual:{shape:'box',size:[8,8,.3]}};
  const fraction=cameraBoomFraction([0,2,0],[0,2,5],[wall]);
  assert.ok(fraction>0 && fraction<.4);
  assert.equal(cameraBoomFraction([0,2,0],[0,2,-5],[wall]),1);
  const params={player:[0,2,0],yaw:0,pitch:0,objects:[],delta:1/60};
  const first=followCamera(params);
  assert.ok(first.position[2]>4 && first.position[1]>3);
  const moved=followCamera({...params,player:[1,2,0],previous:first.position});
  assert.ok(moved.position[0]>first.position[0] && moved.position[0]<first.position[0]+1);
  const blocked=followCamera({...params,objects:[wall],previous:first.position});
  assert.ok(blocked.position[2]<2);
  assert.ok(Math.abs(angleDelta(Math.PI-.01,-Math.PI+.01)-.02)<1e-9);
  const cable={visual:{shape:'route',width:2.8,path:[[0,0,0],[0,0,10]]}};
  const hit=cameraBoomFraction([2,-.92,5],[0,-.92,5],[cable]);
  assert.ok(hit>.5&&hit<.9,'camera must retract before entering a route cable');
});
