/**
 * 실제 폰 테스트용 도우미 (주소 읽기, 링크 조회, 공유 시트). 화면은 remote.tsx.
 */
import type { LinkInfo } from './types'

export type View = 'child' | 'mom' | null

export function readView(): { view: View; sid: string | null } {
  if (typeof window === 'undefined') return { view: null, sid: null }
  const q = new URLSearchParams(window.location.search)
  const v = q.get('view')
  return { view: v === 'child' || v === 'mom' ? v : null, sid: q.get('s') }
}

export async function fetchLink(sid: string): Promise<LinkInfo> {
  const res = await fetch(`/api/bab/link/${encodeURIComponent(sid)}`)
  if (!res.ok) throw new Error(res.status === 404 ? '링크가 만료됐어요. 자녀 폰에서 다시 보내 주세요.' : `오류 ${res.status}`)
  return (await res.json()) as LinkInfo
}

/** 부모님 폰에서 여는 링크 주소 */
export function momLink(sid: string): string {
  return `${window.location.origin}/?feature=bab&view=mom&s=${encodeURIComponent(sid)}`
}

/**
 * 메시지와 링크를 폰의 공유 시트(카톡·문자)로 넘긴다.
 * 공유 시트가 없으면(데스크톱) 문자는 sms: 로, 카톡은 클립보드 복사로 대신한다.
 */
export async function shareMessage(text: string, url: string, channel?: string): Promise<string> {
  const body = `${text}\n\n답하기 ▶ ${url}`
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text: body })
      return '공유했어요'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return ''
    }
  }
  if (channel === 'sms') {
    window.location.href = `sms:?&body=${encodeURIComponent(body)}`
    return '문자 앱을 열었어요'
  }
  await navigator.clipboard?.writeText(body)
  return '복사했어요. 카톡에 붙여 넣어 주세요'
}
