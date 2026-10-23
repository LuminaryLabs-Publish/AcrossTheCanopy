import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {storySavePayload} from '../source/src/game/story-model.js';
import {resolve} from 'node:path';
import {verifyBrowserMigration} from './verify-browser-migration.mjs';
import {checkThirdPerson,samplePresentation,checkResolution} from './verify-performance-third-person.mjs';

// Caller supplies Playwright; no browser package is added to the game bundle.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const directory=resolve('.agent/evidence/performance-third-person');
await mkdir(directory,{recursive:true});
const browser=await chromium.launch({headless:false,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
let result={schema:'atc.performance-third-person/1',observedAt:new Date().toISOString(),url:process.argv[2]??'http://127.0.0.1:4188/',stages:[],errors};
const resumeStage=process.argv.find(a=>a.startsWith('--resume='))?.split('=')[1];
try {
  if(resumeStage){
    result=JSON.parse(await readFile(directory+'/acceptance.json','utf8'));
    const failed=result.failureState;
    await page.goto(result.url);await page.waitForFunction(()=>globalThis.__ACROSS_THE_CANOPY__?.getSnapshot().provider.completed);
    await page.evaluate(payload=>__ACROSS_THE_CANOPY__.load(payload),storySavePayload(failed.story,{position:failed.player.position,fov:failed.camera.fov}));
    delete result.failure;delete result.failureState;
  }
  const stages=['open','starter','branch','rows','market','puzzle','station','answer','recover','controls','optional','host'];
  for(const stage of stages.slice(resumeStage?stages.indexOf(resumeStage):0)) {
    const checked=await verifyBrowserMigration(page,{stage,url:result.url,evidenceDirectory:directory,resume:Boolean(resumeStage)});
    result.stages.push({stage,passed:true,storyCompleted:checked.completed,choice:checked.choice});
    console.log(JSON.stringify(result.stages.at(-1)));
    if(stage==='open') {
      result.buildScripts=await page.evaluate(()=>[...document.scripts].map(script=>script.src).filter(Boolean));
      result.resolution=await checkResolution(page);
      const encoded=await page.locator('#world').evaluate(canvas=>canvas.toDataURL('image/png').split(',')[1]);
      await writeFile(directory+'/output-1440p.png',Buffer.from(encoded,'base64'));
    }
    if(stage==='starter') {
      result.thirdPerson=await checkThirdPerson(page);
      await page.screenshot({path:directory+'/third-person-walking.png'});
    }
    await writeFile(directory+'/acceptance.json',JSON.stringify(result,null,2)+'\n');
  }
  // The host stage ends at the completed scene. Sample both the forest-facing
  // spawn and the completed chapter, without repeated full-state cloning.
  await page.evaluate(()=>__ACROSS_THE_CANOPY__.reset());
  await page.waitForTimeout(3000);
  result.performance=await samplePresentation(page,60000);
  console.log(JSON.stringify({performance:result.performance}));
  await page.screenshot({path:directory+'/final-spawn.png'});
  if(errors.length)throw new Error('Browser recorded application errors.');
  await writeFile(directory+'/acceptance.json',JSON.stringify(result,null,2)+'\n');
} catch(error) {
  result.failure={message:error.message,stack:error.stack};
  result.failureState=await page.evaluate(()=>globalThis.__ACROSS_THE_CANOPY__?.getSnapshot()).catch(()=>null);
  await writeFile(directory+'/acceptance.json',JSON.stringify(result,null,2)+'\n');
  await page.screenshot({path:directory+'/failure.png'}).catch(()=>{});
  throw error;
} finally {await browser.close();}
