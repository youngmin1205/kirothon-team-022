/**
 * 데모 단계 신호를 DOM 에 남기는 보이지 않는 표식.
 *
 * 왜 따로 두는가
 *   단계 신호(`data-beat` / `data-state`)는 자동 검증과 녹화가 쓰는 계약이다.
 *   이걸 "진행 단계" 같은 계측 패널 안에 두면, 그 패널을 숨기거나 지우는 순간
 *   검증이 깨진다. 계측 패널은 심사·개발용이고 실제 사용자 화면이 아니므로
 *   얼마든지 사라질 수 있다. 그래서 신호만 따로 떼어 항상 렌더한다.
 *
 * 보이지 않지만 DOM 에는 있고 크기도 1px 있다. Playwright 가 기본으로
 * "보이는 요소"를 기다리기 때문에 display:none 으로 두면 안 된다.
 */
import type { BeatState } from './useDemo'

export function BeatMarkers({ states }: { states: Record<string, BeatState> }) {
  return (
    <div
      id="beat-markers"
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 1,
        height: 1,
        overflow: 'hidden',
        opacity: 0,
        pointerEvents: 'none',
      }}
    >
      {Object.entries(states).map(([id, state]) => (
        <span key={id} data-beat={id} data-state={state} style={{ display: 'block', width: 1, height: 1 }} />
      ))}
    </div>
  )
}
