import assert from 'node:assert/strict';

export async function samplePresentation(page, milliseconds = 60000) {
  return page.evaluate(async duration => {
    const started=performance.now(), intervals=[],render=[],main=[],raster=[],geometry=[];
    let previous=started,lastRevision=null;
    const initialJsHeapBytes=performance.memory?.usedJSHeapSize??null;let sampledPeakJsHeapBytes=initialJsHeapBytes;
    while (performance.now()-started<duration) {
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const now=performance.now();main.push(now-previous);previous=now;
      if(performance.memory)sampledPeakJsHeapBytes=Math.max(sampledPeakJsHeapBytes??0,performance.memory.usedJSHeapSize);
      const {provider:p,execution:e}=globalThis.__ACROSS_THE_CANOPY__.getPerformanceSnapshot();
      if (p.completed?.packetRevision!==lastRevision && p.completed) {
        lastRevision=p.completed.packetRevision;intervals.push(p.completed.presentationIntervalMs);
        render.push(p.completed.renderDurationMs);
        if(e.phaseTimes){raster.push(e.phaseTimes.rasterMs);geometry.push(e.phaseTimes.geometryMs);}
      }
      if (p.lastError) throw new Error(p.lastError.message);
    }
    const distribution = values => {
      const sorted=[...values].sort((a,b)=>a-b),at=p=>sorted[Math.min(sorted.length-1,Math.floor(p*(sorted.length-1)))];
      return {count:values.length,p50:at(.5),p95:at(.95),p99:at(.99),max:sorted.at(-1),mean:values.reduce((a,b)=>a+b,0)/values.length};
    };
    const state=__ACROSS_THE_CANOPY__.getPerformanceSnapshot();
    return {observedAt:new Date().toISOString(),jsHeap:{initialBytes:initialJsHeapBytes,finalBytes:performance.memory?.usedJSHeapSize??null,sampledPeakBytes:sampledPeakJsHeapBytes,boundary:"Chrome JavaScript heap observation; excludes browser/GPU allocation and is not a process memory limit."},durationMs:performance.now()-started,presentedFrames:intervals.length,presentedFps:intervals.length*1000/(performance.now()-started),presentationMs:distribution(intervals),renderMs:distribution(render),mainRafMs:distribution(main),rasterMs:distribution(raster),geometryMs:distribution(geometry),state};
  }, milliseconds);
}

export async function checkThirdPerson(page) {
  const state=()=>page.evaluate(()=>__ACROSS_THE_CANOPY__.getSnapshot());
  const before=await state();
  assert.equal(before.camera.mode,'third-person');
  assert.notDeepEqual(before.camera.position,before.player.position);
  await page.keyboard.down('w');await page.waitForTimeout(2000);await page.keyboard.up('w');
  await page.waitForTimeout(400);
  const moved=await state();
  assert.notDeepEqual(before.player.position,moved.player.position);
  assert.notDeepEqual(before.camera.position,moved.camera.position);
  const saved=await page.evaluate(()=>__ACROSS_THE_CANOPY__.save('third-person-check').payload);
  await page.keyboard.press('v');
  await page.waitForFunction(()=>__ACROSS_THE_CANOPY__.getSnapshot().camera.mode==='first-person');
  const first=await state();assert.equal(first.camera.mode,'first-person');assert.deepEqual(first.player.position,moved.player.position);
  await page.keyboard.press('v');
  await page.waitForFunction(()=>__ACROSS_THE_CANOPY__.getSnapshot().camera.mode==='third-person');
  assert.equal((await state()).camera.mode,'third-person');
  await page.keyboard.down('d');await page.waitForTimeout(400);await page.keyboard.up('d');
  await page.evaluate(payload=>__ACROSS_THE_CANOPY__.load(payload),saved);
  await page.waitForTimeout(250);
  assert.deepEqual((await state()).player.position,saved.player.position);
  return {before:{player:before.player,camera:before.camera},moved:{player:moved.player,camera:moved.camera},togglePreservedPosition:true,restoration:true};
}

export async function checkResolution(page) {
  return page.evaluate(()=>{
    const canvas=document.querySelector('#world'), frame=__ACROSS_THE_CANOPY__.captureFrame();
    if(canvas.width!==2560 || canvas.height!==1440 || frame.width!==2560 || frame.height!==1440)throw new Error('Expected actual 2560×1440 output.');
    const displayed=canvas.getContext('2d').getImageData(0,0,2560,1440).data;
    let maxDifference=0, differentChannels=0;
    for(let i=0;i<displayed.length;i++){const delta=Math.abs(displayed[i]-frame.pixels[i]);maxDifference=Math.max(maxDifference,delta);if(delta)differentChannels++;}
    if(maxDifference>2)throw new Error(`Canvas/capture mismatch: ${maxDifference}`);
    const {renderWidth,renderHeight}=__ACROSS_THE_CANOPY__.getSnapshot().provider.completed;
    return {width:canvas.width,height:canvas.height,renderWidth,renderHeight,maxDifference,differentChannels};
  });
}
