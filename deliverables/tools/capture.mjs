// Demo capture: drives the demo path, records a clip, saves screenshots and beat timings.
// Doubles as a smoke test: fails if any beat does not appear.
import { chromium } from 'playwright';
import { readFile, writeFile, rename, readdir, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('captures');
// URL and beats come from the ```json capture``` block of product.md, so switching topics means editing one file.
const md = await readFile('product.md', 'utf8');
const block = md.match(/```json capture\n([\s\S]*?)```/);
if (!block) throw new Error('product.md: no ```json capture block');
const CAP = JSON.parse(block[1]);
const URL = process.env.DEMO_URL ?? 'file://' + path.resolve(CAP.url);
// device "phone": crop the phone screen (default selector `.phone .screen`) and show it in a phone frame.
// device "browser": record the whole viewport (or `screen` selector) and show it in a browser window frame.
const DEVICE = CAP.device ?? 'phone';
const SCREEN = CAP.screen ?? (DEVICE === 'phone' ? '.phone .screen' : null);
const PLAY = CAP.play ?? '#play';
const VIEW = DEVICE === 'phone' ? { width: 1240, height: 1440 } : { width: 1600, height: 1000 };
// Each beat: selector that proves the step happened. Element screenshots are NOT taken during recording:
// they scroll the page and break the emulator crop.
const BEATS = CAP.beats;

// `npm run shot`: only the representative screen (captures/home.png) for the slides, no recording, no beats.
const SHOT = process.argv.includes('--shot');
if (!SHOT) await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
// Prefer installed Google Chrome (better video codecs); fall back to Playwright's bundled Chromium on PCs without it.
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
// Record at viewport size. A larger recordVideo size does not upscale: Playwright pads the frame with gray.
const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2, ...(SHOT ? {} : { recordVideo: { dir: OUT, size: VIEW } }) });
const t0 = Date.now();
const page = await ctx.newPage();
await page.goto(URL);
await page.waitForTimeout(800);
const hide = `.toast{display:none!important}`;
if (DEVICE === 'phone') {
  // Pin the phone to the top-left at 2x so the crop stays sharp. Logic and panels keep running.
  const pin = CAP.pin ?? '.phone';
  await page.addStyleTag({ content: `${pin}{position:fixed!important;left:0;top:0;transform:scale(2);transform-origin:0 0;z-index:9999;margin:0!important}${hide}` });
} else {
  await page.addStyleTag({ content: hide });
}
await page.waitForTimeout(200);
const screenBox = SCREEN ? await page.locator(SCREEN).boundingBox() : { x: 0, y: 0, ...VIEW }; // crop in video px
if (SCREEN) await page.locator(SCREEN).screenshot({ path: path.join(OUT, 'home.png') }); // representative app screen
else await page.screenshot({ path: path.join(OUT, 'home.png') });
if (SHOT) {
  await writeFile(path.join(OUT, 'shot.json'), JSON.stringify({ device: DEVICE }, null, 2));
  await browser.close();
  console.log('done -> captures/home.png');
  process.exit(0);
}
const clickAt = (Date.now() - t0) / 1000;
await page.click(PLAY);

// For each beat we also store where it happened (box, relative to the screen crop) so the film can zoom the
// camera there. `focus` overrides the element to frame (e.g. a whole card instead of its last row).
// Browser mode follows the action: if the element is below the fold, the page scrolls to it smoothly.
const boxOf = async (sel) => {
  const bb = await page.locator(sel).first().boundingBox();
  if (!bb) return null;
  // Clip to the screen crop; elements outside it (e.g. side panels next to the phone) get no camera move.
  const x0 = Math.max(0, bb.x - screenBox.x), y0 = Math.max(0, bb.y - screenBox.y);
  const x1 = Math.min(screenBox.width, bb.x + bb.width - screenBox.x), y1 = Math.min(screenBox.height, bb.y + bb.height - screenBox.y);
  if (x1 - x0 < 4 || y1 - y0 < 4) return null;
  return { x: +x0.toFixed(1), y: +y0.toFixed(1), w: +(x1 - x0).toFixed(1), h: +(y1 - y0).toFixed(1) };
};
const beats = [];
for (const b of BEATS) {
  await page.waitForSelector(b.sel, { timeout: 20000 }); // throws -> smoke test fails
  const at = (Date.now() - t0) / 1000;
  const focus = b.focus ?? b.sel;
  if (DEVICE === 'browser' && b.id !== 'end') {
    const moved = await page.locator(focus).first().evaluate((el, vh) => {
      const r = el.getBoundingClientRect();
      if (r.top >= 0 && r.bottom <= vh) return false;
      el.scrollIntoView({ block: r.height > vh * 0.8 ? 'start' : 'center', behavior: 'smooth' });
      return true;
    }, VIEW.height);
    if (moved) await page.waitForTimeout(700);
  }
  const box = b.id === 'end' ? null : await boxOf(focus);
  // `frame`: the widest ancestor that still fits in 3/4 of the window (usually the content grid or a column group).
  // The film frames it edge to edge, so zoomed shots cut at gutters instead of through a neighbouring column.
  const frame = DEVICE === 'browser' && box ? await page.locator(focus).first().evaluate((el, maxW) => {
    let best = el.getBoundingClientRect();
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const r = a.getBoundingClientRect();
      if (r.width > maxW) break;
      best = r;
    }
    return { x: best.x, w: best.width };
  }, VIEW.width * 0.75) : null;
  const boxAt = (Date.now() - t0) / 1000; // after any scroll: the film moves the camera at this moment, not at `at`
  beats.push({ id: b.id, at: +at.toFixed(2), caption: b.caption, ...(box ? { box, boxAt: +boxAt.toFixed(2) } : {}), ...(frame ? { frame: { x: +(frame.x - screenBox.x).toFixed(1), w: +frame.w.toFixed(1) } } : {}), ...(b.tap ? { tap: true } : {}) });
  console.log(`ok  ${b.id.padEnd(9)} ${at.toFixed(2)}s${box ? `  box ${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.w)}x${Math.round(box.h)}` : ''}`);
}
await page.waitForTimeout(1500);
const end = (Date.now() - t0) / 1000;
await ctx.close();
await browser.close();

const webm = (await readdir(OUT)).find((f) => f.endsWith('.webm'));
await rename(path.join(OUT, webm), path.join(OUT, 'demo.webm'));
await writeFile(path.join(OUT, 'beats.json'), JSON.stringify({ device: DEVICE, clickAt, screenBox, end: +end.toFixed(2), view: VIEW, beats }, null, 2));
console.log(`done ${end.toFixed(1)}s -> captures/demo.webm, beats.json`);
