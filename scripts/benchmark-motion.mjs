import {readFile,writeFile} from 'node:fs/promises';
import {samplePresentation,checkResolution} from './verify-performance-third-person.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:false,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const directory='.agent/evidence/performance-third-person';
try {
  await page.goto(process.argv[2]??'http://127.0.0.1:4188/');
  await page.waitForFunction(()=>globalThis.__ACROSS_THE_CANOPY__?.getSnapshot().provider.completed);
  const {stationSave}=JSON.parse(await readFile(directory+'/browser-migration-proof.json','utf8'));
  await page.evaluate(payload=>__ACROSS_THE_CANOPY__.load(payload),stationSave);
  await page.waitForTimeout(1000);
  const resolution=await checkResolution(page);
  const encoded=await page.locator('#world').evaluate(canvas=>canvas.toDataURL('image/png').split(',')[1]);
  await writeFile(directory+'/output-1440p.png',Buffer.from(encoded,'base64'));
  const steering=async(seconds)=>{
    const started=Date.now();let cycle=0;
    while(Date.now()-started<seconds*1000){
      const key=cycle%2?'s':'w';await page.keyboard.down(key);await page.waitForTimeout(1000);await page.keyboard.up(key);
      await page.mouse.move(640,340);await page.mouse.down();await page.mouse.move(cycle%4<2?340:940,340,{steps:6});await page.mouse.up();
      cycle++;
    }
  };
  const [cold]=await Promise.all([samplePresentation(page,12000),steering(12)]);
  const [warm]=await Promise.all([samplePresentation(page,60000),steering(60)]);
  const state=await page.evaluate(()=>__ACROSS_THE_CANOPY__.getSnapshot());
  const movement=await page.evaluate(()=>__ACROSS_THE_CANOPY__.getMovementDiagnostics());
  await page.screenshot({path:directory+'/moving-camera.png'});
  const result={schema:'atc.motion-benchmark/1',resolution,buildScripts:await page.evaluate(()=>[...document.scripts].map(s=>s.src).filter(Boolean)),observedAt:new Date().toISOString(),workload:'Station save restored through public API; real alternating W/S and drag-orbit input. Cold turns include first-time forest resource admission.',cold,warm,movement,finalPlayer:state.player,finalCamera:state.camera};
  await writeFile(directory+'/motion.json',JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
} finally {await page.keyboard.up('w').catch(()=>{});await page.keyboard.up('s').catch(()=>{});await browser.close();}
