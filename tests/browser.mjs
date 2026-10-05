import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
mkdirSync('output', { recursive: true });
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function start(){await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='playing');}
async function drag(p,dx=0,dy=0){await page.locator('canvas').scrollIntoViewIfNeeded();const s=await state(),r=await page.locator('canvas').boundingBox();
const columns=new Set(s.pieces.map(p=>p.targetX)).size,rows=new Set(s.pieces.map(p=>p.targetY)).size;
const hw=s.board.w/columns/2,hh=s.board.h/rows/2;
const at=(x,y)=>({x:r.x+x*r.width/s.width,y:r.y+y*r.height/s.height});
const a=at(p.x+hw,p.y+hh),b=at(p.targetX+hw+dx,p.targetY+hh+dy);
await page.mouse.move(a.x,a.y);await page.mouse.down();assert.equal((await state()).dragging,p.id,'picked the correct piece');await page.mouse.move(b.x,b.y,{steps:12});await page.mouse.up();}
await start();assert.equal((await state()).total,9);
await page.screenshot({path:'output/desktop.png',fullPage:true});
await page.click('#preview');assert.equal((await state()).preview,true);await page.click('#preview');
let s=await state();await drag(s.pieces[0],70,60);assert.equal((await state()).placed,0,'wrong location does not snap');
await drag((await state()).pieces.find(p=>p.id===0),5,4);assert.equal((await state()).placed,1);
await page.screenshot({path:'output/one-piece.png',fullPage:true});
for(const p of (await state()).pieces.filter(p=>!p.locked))await drag(p);
assert.equal((await state()).mode,'complete');assert.equal((await state()).placed,9);await page.screenshot({path:'output/complete.png',fullPage:true});
await page.click('#shuffle');assert.equal((await state()).placed,0);await page.keyboard.press('f');await page.waitForTimeout(150);assert(await page.evaluate(()=>!!document.fullscreenElement));await page.keyboard.press('f');
await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).width===660);s=await state();assert.equal(s.width,660);await drag(s.pieces[0]);assert.equal((await state()).placed,1);await page.screenshot({path:'output/mobile.png',fullPage:true});
// Exercise configuration without modifying the delivered 3x3 default.
await page.addInitScript(()=>{Object.defineProperty(window,'PUZZLE_CONFIG',{configurable:true,get:()=>({columns:5,rows:4,image:'assets/lake-cottage.png'}),set:()=>{}});});
await start();assert.equal((await state()).total,20);await drag((await state()).pieces[0]);assert.equal((await state()).placed,1);
assert.deepEqual(errors,[]);console.log('PASS: 3x3; actual pointer drag on DPR2; wrong drop; all pieces + win; preview; shuffle; fullscreen; mobile; 5x4 configuration; no JS errors.');
await browser.close();
