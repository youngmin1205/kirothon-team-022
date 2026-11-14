/**
 * deck.html → PRESENTATION.pdf (레포 최상단) + 슬라이드 PNG (영상 카드용, deck/out/).
 *   NODE_PATH=deliverables/node_modules node deliverables/deck/render.cjs
 * 슬라이드 밖으로 넘친 요소가 있으면 이름을 출력하고 실패한다 ("깨진 슬라이드" 방지).
 */
const path = require('path')
const fs = require('fs')
const { chromium } = require('playwright')

;(async () => {
  const root = path.resolve(__dirname, '../..')
  const src = 'file://' + path.join(__dirname, 'deck.html')
  const out = path.join(__dirname, 'out')
  fs.mkdirSync(out, { recursive: true })
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
  await p.goto(src, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)

  const overflow = await p.evaluate(() => {
    const bad = []
    for (const s of document.querySelectorAll('.slide')) {
      const r = s.getBoundingClientRect()
      for (const el of s.querySelectorAll('*')) {
        const e = el.getBoundingClientRect()
        if (e.width === 0) continue
        if (e.right > r.right + 1 || e.bottom > r.bottom + 1 || e.left < r.left - 1)
          bad.push(`${s.id}: <${el.tagName.toLowerCase()} class="${el.className}"> ${Math.round(e.bottom - r.bottom)}px 아래 / ${Math.round(e.right - r.right)}px 오른쪽`)
        if (el.scrollHeight > el.clientHeight + 2 && getComputedStyle(el).overflow === 'hidden' && el !== s)
          bad.push(`${s.id}: <${el.tagName.toLowerCase()} class="${el.className}"> 내용 잘림`)
      }
    }
    return bad
  })
  if (overflow.length) {
    console.error('넘친 요소:\n' + overflow.slice(0, 20).join('\n'))
    process.exitCode = 1
  }

  const ids = await p.$$eval('.slide', (s) => s.map((x) => x.id))
  for (const [i, id] of ids.entries()) {
    await p.locator('#' + id).screenshot({ path: path.join(out, `${String(i + 1).padStart(2, '0')}-${id}.png`) })
  }
  await p.pdf({ path: path.join(root, 'PRESENTATION.pdf'), width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true })
  console.log(`슬라이드 ${ids.length}장 → PRESENTATION.pdf, ${path.relative(root, out)}/*.png`)
  await b.close()
})()
