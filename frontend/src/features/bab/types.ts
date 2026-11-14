/**
 * 밥은 먹었니 — 서버가 구간마다 보내는 `data` 의 모양.
 *
 * 원본은 backend/features/bab/mock.json 의 beats[].data 다 (서버 → 화면 계약).
 * 계약을 바꾸면 tests/test_bab_contract.py 가 깨지므로, 여기만 고치지 말고 먼저 공유한다.
 * live 모드에서는 값이 빠질 수 있으므로 화면은 모든 필드를 선택값으로 다룬다.
 */

export type ItemKey = 'meal' | 'home' | 'mood' | 'note'
export type MoodKey = 'good' | 'ok' | 'tired' | 'busy' | 'sick' | 'custom'
export type ButtonKey = 'heart' | 'call' | 'ate' | 'hospital' | 'fine'
export type CheckStatus = 'done' | 'not_yet' | 'unknown'

export interface Recipient {
  id: string
  name: string
  items: ItemKey[]
  channel: 'kakao' | 'sms'
}

export interface Mood {
  key: MoodKey
  emoji: string
  label: string
  custom: string | null
}

export interface Check {
  item: ItemKey
  emoji: string
  label: string
  status: CheckStatus
  detail: string
  photo?: string
}

export interface Message {
  to: string
  name: string
  channel: 'kakao' | 'sms'
  items: ItemKey[]
  summary: string
  text: string
}

export interface ParentButton {
  key: ButtonKey
  emoji: string
  label: string
}

/** 구간 id → 그 구간의 data */
export interface BabBeats {
  home: { child?: string; recipients?: Recipient[] }
  upload: { photos?: { name: string; label: string }[]; mood?: Mood; note?: string | null }
  judge: { checks?: Check[] }
  confirm: { confirmed?: boolean; checks?: Check[]; mood?: Mood }
  compose: { messages?: Message[] }
  deliver: {
    to?: string
    name?: string
    channel?: 'kakao' | 'sms'
    sentAt?: string
    bubble?: string
    preview?: { title?: string; description?: string; image?: string }
    link?: string
    /** 실제 폰 테스트용. 부모 링크와 답장 대기에 쓴다 */
    session?: string
  }
  react: { from?: string; name?: string; buttons?: ParentButton[]; pressed?: ButtonKey[] }
  reply: { from?: string; name?: string; chips?: ParentButton[]; toast?: string; celebrate?: boolean }
}

export type BeatId = keyof BabBeats

/** 데모 구간 순서. .kiro/steering/product.md 의 데모 구간 표와 같다 */
export const BEAT_ORDER: BeatId[] = [
  'home',
  'upload',
  'judge',
  'confirm',
  'compose',
  'deliver',
  'react',
  'reply',
]

/** GET /api/bab/link/{sid} — 부모님 폰 답장 페이지 (실제 폰 테스트용) */
export type LinkInfo = {
  child: string
  name: string
  summary: string
  buttons: { key: ButtonKey; emoji: string; label: string }[]
  pressed: ButtonKey[]
  next: string | null
}
