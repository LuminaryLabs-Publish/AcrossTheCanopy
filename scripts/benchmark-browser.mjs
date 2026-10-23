import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {execFileSync} from 'node:child_process';

const baselineCommit='077160f7de6b354749d20957ae90b28b1dc42626';
const baselineRoot='evidence/performance-baseline';
const baselineFiles=execFileSync('git',['ls-tree','-r','--name-only',baselineCommit,'assets/'],{encoding:'utf8'}).trim().split('\n').filter(Boolean).concat('index.html');
for(const file of baselineFiles){const target=join(baselineRoot,file);await mkdir(dirname(target),{recursive:true});await writeFile(target,execFileSync('git',['show',`${baselineCommit}:${file}`],{maxBuffer:16*1024**2}));}

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:false,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1280,height:720}});
await context.addInitScript(()=>{
  globalThis.__atcPaintTimes=[];
  for (const method of ['putImageData','drawImage']) {
    const original=CanvasRenderingContext2D.prototype[method];
    CanvasRenderingContext2D.prototype[method]=function(...args){
      const result=original.apply(this,args);
      if(this.canvas.id==='world'){
        __atcPaintTimes.push(performance.now());
        if(__atcPaintTimes.length>8192)__atcPaintTimes.shift();
      }
      return result;
    };
  }
});
const result={schema:'atc.browser-comparison/1',observedAt:new Date().toISOString(),comparisonNote:'Baseline output 640×360; optimized output 2560×1440. Both world rasters 320×180; new geometry LOD differs. Counts final canvas image submissions, not physical refresh.',baselineCommit:'077160f7de6b354749d20957ae90b28b1dc42626',workloads:[]};
try {
  for(const [name,url,firstPerson] of [
    ['baseline-first-person','http://127.0.0.1:4188/evidence/performance-baseline/',false],
    ['optimized-first-person','http://127.0.0.1:4188/',true],
    ['optimized-third-person','http://127.0.0.1:4188/',false]
  ]){
    const page=await context.newPage();await page.goto(url);
    await page.waitForFunction(()=>globalThis.__ACROSS_THE_CANOPY__?.getSnapshot().provider.completed);
    if(firstPerson)await page.keyboard.press('v');
    await page.waitForTimeout(5000);
    const sampled=await page.evaluate(async()=>{
      const start=performance.now(),raf=[];let previous=start;
      while(performance.now()-start<30000){await new Promise(resolve=>requestAnimationFrame(resolve));const now=performance.now();raf.push(now-previous);previous=now;}
      const end=performance.now(),paints=__atcPaintTimes.filter(t=>t>=start&&t<=end),intervals=paints.slice(1).map((v,i)=>v-paints[i]);
      const stats=values=>{const s=[...values].sort((a,b)=>a-b);const p=t=>s[Math.floor((s.length-1)*t)];return{count:s.length,p50:p(.5),p95:p(.95),p99:p(.99),max:s.at(-1)}};
      const state=__ACROSS_THE_CANOPY__.getSnapshot();
      return {buildScripts:[...document.scripts].map(s=>s.src).filter(Boolean),elapsedMs:end-start,presentedFrames:paints.length,presentedFps:paints.length*1000/(end-start),presentationMs:stats(intervals),mainRafMs:stats(raf),provider:state.provider,camera:state.camera,userAgent:navigator.userAgent};
    });
    result.workloads.push({name,url,warmupMs:5000,...sampled});console.log(JSON.stringify(result.workloads.at(-1)));await page.close();
  }
  await mkdir('.agent/evidence/performance-third-person',{recursive:true});
  await writeFile('.agent/evidence/performance-third-person/comparison.json',JSON.stringify(result,null,2)+'\n');
} finally {await browser.close();}
