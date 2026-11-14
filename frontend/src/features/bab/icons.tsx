/**
 * 밥은 먹었니 — 시스템 아이콘. 한 가지 선 굵기(1.8)와 둥근 끝으로 그린다.
 *
 * 이모지는 "내용"(기분 버튼, 부모님 버튼, 메시지 본문)에만 쓰고, 화면의 장치
 * (확인 표시, 연필, 자물쇠, 보내기)는 여기 아이콘으로 통일한다. 이모지와 유니코드
 * 기호가 섞이면 아이콘 체계가 없어 보인다 (디자인 리뷰 지적).
 */
import type { ReactNode } from 'react'

function Svg({ children, size = 20, title }: { children: ReactNode; size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      className="bab-icon"
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

type P = { size?: number; title?: string }

/** 브랜드 — 김이 오르는 밥그릇 */
export const Bowl = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 12h17a8.5 8.5 0 0 1-17 0Z" fill="currentColor" stroke="none" />
    <path d="M8 21h8" />
    <path d="M9 8c-.8-1 .8-2 0-3M12 8c-.8-1 .8-2 0-3M15 8c-.8-1 .8-2 0-3" />
  </Svg>
)

export const Check = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5 10 17.5 19 7" />
  </Svg>
)

export const Pencil = (p: P) => (
  <Svg {...p}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
    <path d="m13.5 6.5 4 4" />
  </Svg>
)

export const Plus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const Camera = (p: P) => (
  <Svg {...p}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4Z" />
    <circle cx="12" cy="13" r="3.5" />
  </Svg>
)

export const Lock = (p: P) => (
  <Svg {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
)

export const Send = (p: P) => (
  <Svg {...p}>
    <path d="M21 3 10 14" />
    <path d="M21 3 14.5 21l-4.5-7-7-4.5Z" />
  </Svg>
)

export const Sliders = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Svg>
)

export const ChevronLeft = (p: P) => (
  <Svg {...p}>
    <path d="M15 5 8 12l7 7" />
  </Svg>
)

export const X = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)

/** 사람 — 이모지 대신 이름 첫 글자를 담은 원 */
export function Avatar({ name, tone, size = 36 }: { name: string; tone: 'mom' | 'dad' | 'child'; size?: number }) {
  return (
    <span className={`bab-avatar ${tone}`} style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  )
}
