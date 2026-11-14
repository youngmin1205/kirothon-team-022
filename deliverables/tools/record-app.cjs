// 앱 화면 그대로 녹화. 구간 대기 시간만 SLOW 배로 늘린다 (레포 파일은 건드리지 않음)
const { chromium } = require('playwright');
const SLOW = Number(process.env.SLOW || 1.8);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2,
    recordVideo: { dir: '/tmp/apprec', size: { width: 1600, height: 1000 } } });
  const p = await ctx.newPage();
  await p.route('**/api/bab/beats', async (route) => {
    const r = await route.fetch(); const j = await r.json();
    j.beats = j.beats.map((x) => ({ ...x, delayMs: Math.round((x.delayMs || 650) * SLOW) }));
    await route.fulfill({ response: r, json: j });
  });
  await p.goto('http://127.0.0.1:8078/?feature=bab');
  await p.addStyleTag({ content: '.dev-bar{display:none!important} .wrap.product-only{padding-top:56px!important}' });
  await p.waitForSelector('[data-beat="home"]', { state: 'attached' });
  await p.waitForTimeout(2500);
  await p.locator('#play').dispatchEvent('click');
  await p.waitForSelector('#play:not([disabled])', { timeout: 120000, state: 'attached' });
  await p.waitForTimeout(3500);
  await ctx.close(); await b.close();
})();
