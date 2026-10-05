import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
mkdirSync('output', { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 });
const errors = []; page.on('pageerror', e => errors.push(e.message));
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function start() {
  await page.goto('http://127.0.0.1:5173');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'playing');
}
async function drawType(typeId) {
  const s = await state();
  // Force rare duplicate outcomes in tests while exercising the real draw button.
  await page.evaluate(value => { Math.random = () => value; }, (typeId + .25) / s.total);
  await page.click('#draw-piece');
  return (await state()).pieces.at(-1);
}
async function dragTo(p, destination) {
  await page.locator('canvas').scrollIntoViewIfNeeded();
  const s = await state(), rect = await page.locator('canvas').boundingBox();
  const hw = s.board.w / s.columns / 2, hh = s.board.h / s.rows / 2;
  const at = (x, y) => ({ x: rect.x + x * rect.width / s.width, y: rect.y + y * rect.height / s.height });
  const a = at(p.x + hw * p.scale, p.y + hh * p.scale), b = at(destination.x, destination.y);
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  assert.equal((await state()).dragging, p.id, 'picked correct instance on DPR2');
  await page.mouse.move(b.x, b.y, { steps: 12 }); await page.mouse.up();
}
async function place(p, dx = 0, dy = 0) {
  const s = await state();
  await dragTo(p, { x: p.targetX + s.board.w / s.columns / 2 + dx, y: p.targetY + s.board.h / s.rows / 2 + dy });
}
async function clickPiece(p, jitter = 0) {
  await page.locator('canvas').scrollIntoViewIfNeeded();
  const s = await state(), rect = await page.locator('canvas').boundingBox();
  const x = rect.x + (p.x + s.board.w / s.columns / 2 * p.scale) * rect.width / s.width;
  const y = rect.y + (p.y + s.board.h / s.rows / 2 * p.scale) * rect.height / s.height;
  await page.mouse.move(x, y); await page.mouse.down();
  if (jitter) await page.mouse.move(x + jitter, y + jitter);
  await page.mouse.up();
}
async function scrap(p) {
  const s = await state(); await dragTo(p, { x: s.recycler.x + s.recycler.w / 2, y: s.recycler.y + s.recycler.h / 2 });
}
await start();
assert.equal(await page.locator('#hero-image').getAttribute('src'), 'assets/40mysticgem_tile_large.jpg');
assert(Math.abs((await state()).board.w / (await state()).board.h - 1406 / 860) < 1e-6, 'source aspect ratio preserved');
assert.equal((await state()).total, 9); assert.equal((await state()).pieces.length, 0); assert.equal((await state()).mode, 'playing');
assert(await page.locator('#recycle').isDisabled());
assert(await page.locator('#choose-reward').isHidden());
await page.screenshot({ path: 'output/empty.png', fullPage: true });
await page.click('#preview'); assert.equal((await state()).preview, true); await page.click('#preview');
let p = await drawType(0);
await place(p, 70, 60); assert.equal((await state()).placed, 0, 'wrong drop does not snap');
p = (await state()).pieces.find(item => item.id === p.id);
await place(p, 5, 4); assert.equal((await state()).placed, 1);
let duplicate = await drawType(0);
assert(duplicate.duplicate); assert.notEqual(duplicate.id, p.id); assert.deepEqual(duplicate.edges, p.edges);
await place(duplicate); assert.equal((await state()).placed, 1, 'duplicate does not double count or lock');
assert.equal((await state()).pieces.filter(p => p.locked).length, 1);
await scrap((await state()).pieces.find(item => item.id === duplicate.id));
assert.equal((await state()).recyclerIds.length, 1); assert(await page.locator('#recycle').isDisabled());
// Pull a scaled piece from recycler back to the inventory, then put it in again.
let selected = (await state()).pieces.find(item => item.id === duplicate.id);
let s = await state(); await dragTo(selected, { x: 970, y: 200 });
assert.equal((await state()).recyclerIds.length, 0);
await scrap((await state()).pieces.find(item => item.id === duplicate.id));
await scrap(await drawType(0)); assert.equal((await state()).recyclerIds.length, 2);
const beforeInvalid = (await state()).pieces.length;
await page.evaluate(() => document.querySelector('#recycle').click()); assert.equal((await state()).pieces.length, beforeInvalid);
await scrap(await drawType(0)); assert.equal((await state()).recyclerIds.length, 3);
assert(!(await page.locator('#recycle').isDisabled()));
const extra = await drawType(1); await scrap(extra);
assert.equal((await state()).recyclerIds.length, 3, 'fourth piece cannot enter full recycler');
assert.equal((await state()).pieces.find(item => item.id === extra.id).location, 'inventory');
await page.screenshot({ path: 'output/recycler-ready.png', fullPage: true });
const consumedIds = (await state()).recyclerIds, beforeExchange = (await state()).pieces.length;
await page.evaluate(() => { Math.random = () => .01; }); await page.click('#recycle');
s = await state();
assert.equal(s.pieces.length, beforeExchange - 2, 'exactly three consumed, one created');
assert(consumedIds.every(id => !s.pieces.some(p => p.id === id)));
assert.equal(s.recyclerIds.length, 0); assert.equal(s.pieces.at(-1).typeId, 0); assert(s.pieces.at(-1).duplicate, 'exchange also permits duplicates');
assert.equal(s.placed, 1, 'placed piece survives exchange');
await page.screenshot({ path: 'output/exchanged.png', fullPage: true });
// Returning selected pieces never gives a free random draw.
await scrap(s.pieces.at(-1)); const beforeReturn = (await state()).pieces.length;
await page.click('#return-pieces'); assert.equal((await state()).recyclerIds.length, 0); assert.equal((await state()).pieces.length, beforeReturn);
// Inventory pages must support repeated draws without hiding them permanently.
for (let i = 0; i < 11; i++) await drawType(0);
s = await state(); assert.equal(s.pages, 2); assert.equal(s.page, 2);
assert.equal(s.pieces.filter(p => p.location === 'inventory' && p.visible).length, s.inventoryCount - 9);
await page.click('#previous-page'); assert.equal((await state()).page, 1);
await page.click('#next-page'); assert.equal((await state()).page, 2);
// Clicking no longer moves a piece into or out of the recycler.
await page.click('#shuffle');
let clicked = await drawType(0);
await clickPiece(clicked); assert.equal((await state()).recyclerIds.length, 0);
assert.equal((await state()).inventoryCount, 1);
await scrap((await state()).pieces.find(p => p.id === clicked.id));
await clickPiece((await state()).pieces.find(p => p.id === clicked.id)); assert.equal((await state()).recyclerIds.length, 1);
await page.click('#return-pieces');
// Complete entire puzzle by drawing and placing each type through real controls.
await page.click('#shuffle'); assert.equal((await state()).pieces.length, 0); assert.equal((await state()).placed, 0); assert.equal((await state()).elapsed, 0);
await page.keyboard.press('f'); await page.waitForTimeout(150); assert(await page.evaluate(() => !!document.fullscreenElement)); await page.keyboard.press('f');
// Keep a full recycler and several inventory pages when winning to test every lock.
for (let i = 0; i < 3; i++) await scrap(await drawType(0));
for (let i = 0; i < 11; i++) await drawType(0);
for (let typeId = 0; typeId < 9; typeId++) await place(await drawType(typeId));
assert.equal((await state()).mode, 'complete'); assert.equal((await state()).placed, 9);
const finishedTime = (await state()).elapsed; await page.evaluate(() => window.advanceTime(3000)); assert.equal((await state()).elapsed, finishedTime);
await page.screenshot({ path: 'output/complete.png', fullPage: true });
assert.equal((await state()).uiLocked, true);
assert(await page.locator('#choose-reward').isVisible());
const lockedState = await state();
for (const id of ['draw-piece', 'preview', 'shuffle', 'fullscreen', 'recycle', 'return-pieces', 'previous-page', 'next-page']) {
  assert(await page.locator(`#${id}`).isDisabled(), `${id} locked after win`);
  // Dispatch bypasses the HTML disabled attribute: handlers must also guard game state.
  await page.locator(`#${id}`).dispatchEvent('click');
}
await page.keyboard.press('f');
assert.equal(await page.evaluate(() => !!document.fullscreenElement), false);
const freePiece = lockedState.pieces.find(p => p.location === 'inventory' && p.visible);
await clickPiece(freePiece, 25);
await clickPiece(lockedState.pieces.find(p => p.location === 'recycler'), 25);
assert.deepEqual(await state(), lockedState, 'locked actions do not change game state');
await page.click('#choose-reward'); assert.equal((await state()).rewardDialogOpen, true);
await page.screenshot({ path: 'output/reward-dialog.png', fullPage: true });
await page.click('#reward-dialog button'); assert.equal((await state()).rewardDialogOpen, false);
assert.equal((await state()).uiLocked, true);
await page.setViewportSize({ width: 390, height: 844 });
await page.locator('#choose-reward').scrollIntoViewIfNeeded();
assert(await page.locator('#choose-reward').isVisible());
await page.screenshot({ path: 'output/mobile-complete.png', fullPage: true });
await start(); await page.setViewportSize({ width: 390, height: 844 });
await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).width === 660);
p = await drawType(0); await scrap(p); assert.equal((await state()).recyclerIds.length, 1);
await page.click('#return-pieces'); p = (await state()).pieces.find(item => item.id === p.id); await place(p); assert.equal((await state()).placed, 1);
p = await drawType(0); await clickPiece(p); assert.equal((await state()).recyclerIds.length, 0);
await scrap(p); assert.equal((await state()).recyclerIds.length, 1);
await page.screenshot({ path: 'output/mobile.png', fullPage: true });
await page.addInitScript(() => { Object.defineProperty(window, 'PUZZLE_CONFIG', { configurable: true, get: () => ({ columns: 5, rows: 4, image: 'assets/lake-cottage.png' }), set: () => {} }); });
await start(); assert.equal((await state()).total, 20); assert.equal((await state()).pieces.length, 0); await place(await drawType(19)); assert.equal((await state()).placed, 1);
await scrap(await drawType(19)); await scrap(await drawType(19)); await scrap(await drawType(19)); await page.click('#recycle'); assert.equal((await state()).recyclerIds.length, 0);
assert.deepEqual(errors, []);
console.log('PASS: new Mystic Gem image and native aspect ratio; drag-only; click has no transfer effect in inventory or recycler; mobile drag; empty start; draws with duplicates; stable geometry; DPR2 drag; wrong drop; duplicate snap blocked; recycler 1/2/3/4 slots; exact 3→1 including duplicate reward; return; paging; reset; full win; reward button/dialog; all UI and pointer/keyboard actions locked with leftovers; mobile reward; stopped timer; fullscreen; mobile; 5x4; no JS errors.');
await browser.close();
