/**
 * 실제 브라우저로 데모가 끝까지 재생되는지 확인하고 스크린샷을 남긴다.
 *
 * 녹화 도구(deliverables/tools/capture.mjs)와 같은 방식으로 확인한다.
 *   `#play` 를 누르고, 구간마다 `[data-beat="<id>"][data-state="done"]` 가
 *   나타나기를 기다리고, 마지막에 `#play:not([disabled])` 로 종료를 확인한다.
 * 다른 점은 product.md 설정 없이 구간 id 만 받는다는 것이다. 그래서 주제가
 * 정해지기 전에도 쓸 수 있다.
 *
 * playwright 는 deliverables 에 설치된 것을 재사용한다 (중복 설치 방지).
 *
 * 사용법
 *   node scripts/ui-check.mjs --url http://127.0.0.1:8000 --beats intro,work,result,end
 *   node scripts/ui-check.mjs --url ... --beats ... --out .artifacts/smoke.png
 */
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const REPO = path.resolve(import.meta.dirname, '..')

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const url = arg('url', 'http://127.0.0.1:8000')
const beats = (arg('beats', '') || '').split(',').map((s) => s.trim()).filter(Boolean)
const out = arg('out', '.artifacts/ui-check.png')
const timeout = Number(arg('timeout', '20000'))

if (beats.length === 0) {
  console.error('구간 id 가 필요합니다: --beats intro,work,result,end')
  process.exit(2)
}

// deliverables/node_modules 의 playwright 를 쓴다
let chromium
try {
  const require = createRequire(path.join(REPO, 'deliverables', 'package.json'))
  ;({ chromium } = require('playwright'))
} catch (e) {
  console.error('playwright 를 찾지 못했습니다. 먼저 설치하세요:')
  console.error('  npm --prefix deliverables install')
  console.error(`  (원인: ${e.message})`)
  process.exit(1)
}

const failures = []
const consoleErrors = []

let browser
try {
  browser = await chromium.launch()
} catch (e) {
  const msg = String(e.message || e)
  console.error('\n브라우저를 실행하지 못했습니다.')
  const lib = msg.match(/(lib[\w.+-]+\.so[\w.]*): cannot open shared object/)
  if (lib) {
    console.error(`  빠진 시스템 라이브러리: ${lib[1]}`)
    console.error('  Linux 에서는 시스템 패키지가 따로 필요합니다:')
    console.error('    sudo npx playwright install-deps chromium')
    console.error('    (또는 Debian/Ubuntu: sudo apt-get install -y libasound2t64 libnss3 libatk1.0-0)')
    console.error('  macOS 는 추가 설치가 필요하지 않습니다.')
  } else {
    console.error(`  ${msg.split('\n')[0]}`)
  }
  console.error('\n  영상 녹화와 브라우저 검증만 막힙니다. API 수준 확인은')
  console.error('  pnpm smoke 로 계속 쓸 수 있습니다.')
  process.exit(3) // 3 = 환경 미비 (코드 문제와 구분한다)
}

const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', (err) => consoleErrors.push(String(err)))

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout })
  await page.waitForSelector('#play', { timeout })
  console.log(`  ✓ 화면 로드 — ${url}`)

  // 구간 요소가 먼저 그려져야 한다 (서버에서 beats 를 받아왔다는 뜻)
  await page.waitForSelector('[data-beat]', { timeout })

  await page.click('#play')
  console.log('  ✓ #play 클릭')

  for (const id of beats) {
    const sel = `[data-beat="${id}"][data-state="done"]`
    try {
      // 단계 신호는 보이지 않는 표식(#beat-markers)이다. 'attached' 로 기다린다.
      await page.waitForSelector(sel, { timeout, state: 'attached' })
      console.log(`  ✓ 단계 완료: ${id}`)
    } catch {
      failures.push(`단계가 완료되지 않았습니다: ${id}  (선택자 ${sel})`)
      break // 순서대로 진행되므로 하나 막히면 뒤도 안 온다
    }
  }

  if (failures.length === 0) {
    // 녹화 도구가 종료 신호로 쓰는 조건
    try {
      await page.waitForSelector('#play:not([disabled])', { timeout })
      console.log('  ✓ 재생 종료 (#play 다시 활성화)')
    } catch {
      failures.push('재생이 끝나도 #play 가 다시 활성화되지 않았습니다')
    }
  }

  await mkdir(path.dirname(path.resolve(REPO, out)), { recursive: true })
  await page.screenshot({ path: path.resolve(REPO, out), fullPage: true })
  console.log(`  ✓ 스크린샷: ${out}`)
} catch (e) {
  failures.push(`${e.name}: ${e.message}`)
} finally {
  await browser.close()
}

if (consoleErrors.length) {
  console.log('\n  브라우저 콘솔 오류:')
  for (const line of consoleErrors.slice(0, 5)) console.log(`    ${line}`)
}

if (failures.length) {
  console.error('\nui-check 실패:')
  for (const f of failures) console.error(`  ✗ ${f}`)
  process.exit(1)
}

console.log('\nui-check 통과')
