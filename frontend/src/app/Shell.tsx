/**
 * 화면 껍데기. 당일 거의 손대지 않는다.
 *
 * 세 층을 분리한다.
 *
 *   1. 제품 화면   — 실제 사용자가 보는 것. `children` 으로 들어온다. 개발 중 기본 화면
 *   2. 개발 바     — `#play` · `#reset` · 현재 모드. 사용자용이 아니다.
 *                    녹화할 때는 숨긴다 (`.dev-bar` 를 capture 의 hide 목록에 넣는다)
 *   3. 계측 패널   — 진행 단계 · 에이전트 흐름도 · 점수. 심사·디버그용.
 *                    `?showcase=1` 일 때만 보인다
 *
 * 왜 나누는가: 개발 중에 보는 화면은 **실제 사용자가 보는 화면**이어야 한다.
 * 계측 패널을 늘 띄워 두면 제품 화면이 좁아지고, 무엇을 만들고 있는지 흐려진다.
 *
 * `#play` id 와 "끝나면 disabled 가 풀린다"는 동작은 고정 계약이다.
 * 단계 신호는 BeatMarkers 가 항상 렌더하므로 계측 패널과 무관하다.
 */
import type { ReactNode } from 'react'
import { BeatMarkers } from './BeatMarkers'
import type { BeatState } from './useDemo'
import { Button, Chip } from '../ui/primitives'
import type { TurnResponse } from '../types/api'

export type Layout = 'phone' | 'browser'

/** `?showcase=1` 이면 계측 패널을 함께 보여준다. */
export function isShowcase(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('showcase') === '1'
}

export function Shell({
  title,
  subtitle,
  layout,
  running,
  source,
  error,
  states,
  onPlay,
  onReset,
  children,
  showcase,
}: {
  title: string
  subtitle?: string
  layout: Layout
  running: boolean
  source: TurnResponse['source'] | null
  error?: string | null
  /** 단계 상태. BeatMarkers 가 DOM 신호로 남긴다 */
  states: Record<string, BeatState>
  onPlay: () => void
  onReset: () => void
  /** 제품 화면 — 실제 사용자가 보는 것 */
  children: ReactNode
  /** 계측 패널 — 심사·디버그용. `?showcase=1` 일 때만 렌더된다 */
  showcase?: ReactNode
}) {
  const showPanels = isShowcase() && Boolean(showcase)

  return (
    <>
      {/* 단계 신호: 계측 패널이 없어도 항상 있다 */}
      <BeatMarkers states={states} />

      {/* 개발 바 — 사용자용이 아니다. 녹화 시 숨긴다 */}
      <header className="topbar dev-bar">
        <span className="title">{title}</span>
        {source ? (
          <Chip tone={source === 'bedrock' ? 'ok' : 'warn'} id="source-chip">
            {source === 'bedrock' ? 'Bedrock' : '고정 시나리오'}
          </Chip>
        ) : null}
        {running ? (
          <Chip tone="info" dot id="running-chip">
            재생 중
          </Chip>
        ) : null}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {/* id="play" 는 고정이다. 바꾸면 smoke 와 녹화가 깨진다. */}
          <Button id="play" onClick={onPlay} disabled={running}>
            {running ? '재생 중…' : '데모 재생'}
          </Button>
          <Button id="reset" variant="ghost" onClick={onReset} disabled={running}>
            처음으로
          </Button>
        </span>
      </header>

      {error ? (
        <div className="wrap" style={{ paddingBottom: 0 }}>
          <div className="card dev-bar" id="error" style={{ borderColor: 'var(--bad)' }}>
            <strong style={{ color: 'var(--bad)' }}>문제가 생겼습니다</strong>
            <div className="mono" style={{ marginTop: 6 }}>
              {error}
            </div>
            <div className="footnote" style={{ marginTop: 10 }}>
              백엔드가 떠 있는지 확인하세요: <span className="mono">pnpm mock</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* 제품 화면 */}
      <main className={showPanels ? 'wrap' : 'wrap product-only'}>
        {showPanels ? (
          <div className={layout === 'phone' ? 'grid g23' : 'grid'}>
            <div>{children}</div>
            <div>
              <div className="eyebrow">계측 (심사·디버그용)</div>
              {showcase}
              {subtitle ? <p className="footnote">{subtitle}</p> : null}
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </>
  )
}
