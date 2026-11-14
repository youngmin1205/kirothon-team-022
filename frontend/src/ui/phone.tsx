/**
 * 휴대폰 화면 부품.
 *
 * `.phone > .screen` 구조는 녹화 도구 계약이다. product.md 의
 * `capture.device: "phone"` 이면 `.phone .screen` 영역만 잘라 쓴다.
 * 웹 서비스 형태라면 `device: "browser"` 로 두고 이 부품을 쓰지 않아도 된다.
 *
 * 출처: deliverables/samples/mockups/h-phishing-sparring.html
 */
import type { ReactNode } from 'react'
import { useState } from 'react'
import type { Line } from '../app/useDemo'

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="phone">
      <div className="notch" />
      <div className="screen">{children}</div>
    </div>
  )
}

/** 통화 화면 머리 — 상대 이름과 상태. */
export function CallHeader({
  title,
  subtitle,
  tone = 'normal',
}: {
  title: string
  subtitle?: string
  tone?: 'normal' | 'alert'
}) {
  return (
    <div
      style={{
        padding: '44px 18px 12px',
        textAlign: 'center',
        background: tone === 'alert' ? 'linear-gradient(180deg,#2a1420,#1a2233)' : 'linear-gradient(180deg,#1a2233,#0b0f17)',
        color: '#e6edf7',
      }}
      data-call-header={tone}
    >
      <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
      {subtitle ? <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{subtitle}</div> : null}
    </div>
  )
}

/** 대화 목록. useDemo 의 lines 를 그대로 받는다. */
export function Bubbles({ lines }: { lines: Line[] }) {
  return (
    <div className="bubbles" id="bubbles" style={{ flex: 1 }}>
      {lines.map((l, i) => (
        <div
          key={`${l.beatId}-${i}`}
          className={`bubble ${l.who} fade-in`}
          data-bubble-beat={l.beatId}
        >
          {l.text}
        </div>
      ))}
    </div>
  )
}

/** 화면 아래 고정 영역 (입력창이나 통화 버튼 자리). */
export function PhoneFooter({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: 12,
        borderTop: '1px solid rgba(0,0,0,.08)',
        background: '#fff',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}
    >
      {children}
    </div>
  )
}

/**
 * 입력창. 대화형 화면의 기본 부품이다.
 *
 * 개발 중에는 이걸로 직접 쳐 보는 것이 기본이고, `#play` 는 검증·녹화용이다.
 * 그래서 입력 중에는 `#play` 를 잠그지 않는다 (useDemo 의 sending 과 running 을
 * 섞지 않는 이유).
 *
 * id 두 개(`composer-input` · `composer-send`)는 테스트가 쓴다.
 */
export function Composer({
  onSend,
  disabled = false,
  placeholder = '메시지를 입력하세요',
}: {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [text, setText] = useState('')

  const submit = () => {
    const body = text.trim()
    if (!body || disabled) return
    setText('')
    onSend(body)
  }

  return (
    <PhoneFooter>
      <input
        id="composer-input"
        className="composer-input"
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        aria-label="메시지 입력"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault()
            submit()
          }
        }}
      />
      <button
        id="composer-send"
        className="btn composer-send"
        type="button"
        onClick={submit}
        disabled={disabled || text.trim().length === 0}
      >
        {disabled ? '…' : '보내기'}
      </button>
    </PhoneFooter>
  )
}

/** 대화가 아직 없을 때 보여주는 한 줄 안내. */
export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <div className="empty-hint" id="empty-hint">
      {children}
    </div>
  )
}
