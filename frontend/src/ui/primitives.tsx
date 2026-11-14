/**
 * 공용 화면 부품.
 *
 * deliverables/samples/mockups/ 의 목업 3종(통화형·문서점검형·일정알림형)에서
 * 반복되는 것만 뽑았다. 당일에는 이것들을 조립해서 화면을 만든다.
 * 새 부품이 필요하면 여기에 추가한다 (기능 폴더에 흩뿌리지 않는다).
 */
import type { CSSProperties, ReactNode } from 'react'

type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'violet' | 'muted'

/* ── 카드 ──────────────────────────────────────────────── */
export function Card({
  title,
  children,
  id,
  style,
}: {
  title?: string
  children: ReactNode
  id?: string
  style?: CSSProperties
}) {
  return (
    <section className="card" id={id} style={style}>
      {title ? <h3>{title}</h3> : null}
      {children}
    </section>
  )
}

/* ── 버튼 ──────────────────────────────────────────────── */
export function Button({
  children,
  onClick,
  disabled,
  variant = 'primary',
  id,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'ghost' | 'danger'
  id?: string
}) {
  const cls = variant === 'primary' ? 'btn' : `btn ${variant}`
  return (
    <button id={id} className={cls} onClick={onClick} disabled={disabled} type="button">
      {children}
    </button>
  )
}

/* ── 상태 칩 ───────────────────────────────────────────── */
export function Chip({
  children,
  tone = 'muted',
  dot,
  id,
}: {
  children: ReactNode
  tone?: Tone
  dot?: boolean
  id?: string
}) {
  const cls = tone === 'muted' ? 'chip' : `chip ${tone}`
  return (
    <span className={cls} id={id}>
      {dot ? <i className="dot pulse" /> : null}
      {children}
    </span>
  )
}

/* ── 단계 타임라인 ─────────────────────────────────────── */
/**
 * 데모 단계 진행을 눈으로 보여준다. **계측 패널용이다** (심사·디버그).
 *
 * 자동 검증과 녹화가 쓰는 `data-beat` / `data-state` 신호는 여기가 아니라
 * `app/BeatMarkers.tsx` 가 항상 렌더한다. 이 부품을 지워도 검증은 안 깨진다.
 */
export function Steps({
  items,
}: {
  items: { id: string; label: string; caption?: string; state: 'pending' | 'active' | 'done' }[]
}) {
  return (
    <div className="steps" id="steps">
      {items.map((it) => (
        <div
          key={it.id}
          className={`step ${it.state === 'pending' ? '' : it.state}`}
          data-step={it.id}
        >
          <b>{it.label}</b>
          {it.caption ?? it.id}
        </div>
      ))}
    </div>
  )
}

/* ── 표 ────────────────────────────────────────────────── */
/**
 * 서버가 보낸 배열을 표로 그린다. 결과가 목록·순위인 기능(대시보드형)이 쓴다.
 *
 * 열을 주지 않으면 첫 행의 키 순서를 그대로 쓴다. 그래서 `mock.json` 의
 * `data` 에 배열만 적어 두면 백엔드 로직 없이 표가 채워진다.
 */
export function DataTable({
  rows,
  columns,
  id = 'table',
  markKey,
  empty = '아직 값이 없습니다.',
}: {
  rows: Record<string, unknown>[]
  /** 열 지정. 생략하면 첫 행의 키를 쓴다 */
  columns?: { key: string; label?: string }[]
  id?: string
  /** 이 키가 참인 행을 강조한다 (위험 행 등) */
  markKey?: string
  empty?: string
}) {
  if (rows.length === 0) return <p className="footnote">{empty}</p>

  const cols = columns ?? Object.keys(rows[0]).map((key) => ({ key, label: key }))
  const isNum = (v: unknown) => typeof v === 'number'

  return (
    <table className="table" id={id}>
      <thead>
        <tr>
          {cols.map((c) => (
            <th key={c.key} className={isNum(rows[0][c.key]) ? 'num' : undefined}>
              {c.label ?? c.key}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} data-row={i} data-row-mark={markKey ? String(Boolean(row[markKey])) : undefined}>
            {cols.map((c) => (
              <td key={c.key} className={isNum(row[c.key]) ? 'num' : undefined}>
                {row[c.key] === null || row[c.key] === undefined ? '—' : String(row[c.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ── 숫자 강조 ─────────────────────────────────────────── */
export function Kpi({ value, label, id }: { value: ReactNode; label: string; id?: string }) {
  return (
    <div className="kpi" id={id}>
      <span className="v">{value}</span>
      <span className="l">{label}</span>
    </div>
  )
}

/* ── 진행 바 / 점수 게이지 ─────────────────────────────── */
export function Bar({ percent, id }: { percent: number; id?: string }) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div className="bar" id={id} role="progressbar" aria-valuenow={clamped}>
      <i style={{ width: `${clamped}%` }} />
    </div>
  )
}

/* ── 에이전트 흐름도 ───────────────────────────────────── */
/** 오케스트레이터 → 서브에이전트 흐름을 보여준다. 심사에서 "에이전트답다"가 보이는 지점. */
export function ArchFlow({
  nodes,
  id = 'arch',
}: {
  nodes: { id: string; label: string; on?: boolean }[]
  id?: string
}) {
  return (
    <div className="arch" id={id}>
      {nodes.map((n, i) => (
        <span key={n.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className={n.on ? 'node on' : 'node'} data-node={n.id}>
            {n.label}
          </span>
          {i < nodes.length - 1 ? <span className="arrow">→</span> : null}
        </span>
      ))}
    </div>
  )
}

/* ── 로그 ──────────────────────────────────────────────── */
export function LogView({
  lines,
  id = 'log',
}: {
  lines: { tone?: Tone; text: string }[]
  id?: string
}) {
  return (
    <div className="log" id={id}>
      {lines.map((l, i) => (
        <div key={i}>
          <span className={l.tone && l.tone !== 'muted' ? l.tone : 't'}>{l.text}</span>
        </div>
      ))}
    </div>
  )
}

/* ── 토스트 ────────────────────────────────────────────── */
export function Toast({ message, show }: { message: string; show: boolean }) {
  return (
    <div className={show ? 'toast show' : 'toast'} id="toast" role="status">
      {message}
    </div>
  )
}
