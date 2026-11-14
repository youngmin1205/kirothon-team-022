/**
 * 밥은 먹었니 화면 (FE task 5~9).
 *
 *   1. #play 한 번으로 8구간이 끝까지 그려진다 (녹화·smoke 경로)
 *   2. 사람이 직접 누르는 경로가 입력 계약(docs/work-split.md 2장)대로 보낸다
 *
 * pnpm smoke 는 API 만 본다. 화면이 구간 data 를 실제로 그리는지는 여기서 본다.
 * mock.json 을 그대로 읽으므로 계약이 바뀌면 이 테스트도 함께 깨진다.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Beat, TurnResponse } from '../../types/api'
import { BabView } from '.'

// vite 는 frontend/ 밖 파일 import 를 막으므로 node:fs 로 읽는다.
// 문자열 변수로 import 하는 이유: 앱 tsconfig 에 node 타입이 없어서 정적 import 는 타입 검사에 걸린다.
const NODE_FS: string = 'node:fs'
const fs = (await import(/* @vite-ignore */ NODE_FS)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
}
const mock = JSON.parse(
  // vitest 는 frontend/ 에서 돈다 (jsdom 환경이라 import.meta.url 은 file: 이 아니다)
  fs.readFileSync('../backend/features/bab/mock.json', 'utf8'),
) as { beats: Beat[] }
const ids = mock.beats.map((b) => b.id)

function turn(i: number): TurnResponse {
  const beat = mock.beats[i]
  return {
    sessionId: 't',
    turn: i,
    beatIndex: i + 1,
    state: {},
    text: beat?.text ?? '',
    source: 'mock',
    data: beat?.data,
  }
}

type ReplyBody = { text: string; scripted: boolean; payload: Record<string, unknown> | null }
let bodies: ReplyBody[] = []

beforeEach(() => {
  let n = 0
  bodies = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const json = (body: unknown) =>
        new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
      if (url.endsWith('/beats'))
        return json({ feature: 'bab', ids, beats: mock.beats.map((b) => ({ ...b, delayMs: 0 })) })
      if (url.endsWith('/start')) return json(turn(0))
      if (url.endsWith('/reply')) {
        bodies.push(JSON.parse(String(init?.body ?? '{}')))
        return json(turn(++n))
      }
      if (url.endsWith('/reset')) return json({ ...turn(0), source: 'reset' })
      throw new Error(`처리하지 않은 요청: ${url}`)
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const q = (sel: string) => document.querySelector(sel)

describe('밥은 먹었니', () => {
  it('#play 한 번으로 8구간이 끝까지 그려진다', async () => {
    render(<BabView />)
    await waitFor(() => expect(document.querySelectorAll('[data-beat]')).toHaveLength(8))

    await userEvent.click(screen.getByRole('button', { name: '데모 재생' }))
    await waitFor(() => expect(q('[data-beat="reply"]')).toHaveAttribute('data-state', 'done'))

    // 자녀 폰: 마지막 화면은 보냄 + 답장
    expect(q('#bab-child')).toHaveAttribute('data-step', 'sent')
    expect(q('#bab-sent')).toHaveTextContent('21:05')
    expect(q('#bab-reply')).toHaveTextContent('엄마도 밥 드셨대요')
    expect(document.querySelectorAll('[data-reply-chip]')).toHaveLength(2)

    // 엄마 폰: 링크 페이지, 누른 버튼 두 개
    expect(q('#bab-react')).not.toBeNull()
    const pressed = [...document.querySelectorAll('[data-pressed="true"]')].map((el) =>
      el.getAttribute('data-parent-button'),
    )
    expect(pressed).toEqual(['heart', 'ate'])

    // #play 는 payload 를 보내지 않는다 (서버가 기본값을 쓴다)
    expect(bodies.every((b) => b.scripted && b.payload === null)).toBe(true)
  })

  it('직접 누르는 경로가 입력 계약대로 보내고, 아빠 카드에 빠진 항목을 보여 준다', async () => {
    const user = userEvent.setup()
    render(<BabView />)
    await waitFor(() => expect(document.querySelectorAll('[data-beat]')).toHaveLength(8))

    const cta = () => q('#bab-cta') as HTMLButtonElement

    // 1. 오늘: 아무것도 고르지 않으면 주요 버튼이 잠겨 있다 → 기분을 고르면 풀린다
    expect(cta()).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: /피곤해/ }))
    await user.click(cta())
    await waitFor(() => expect(q('#bab-child')).toHaveAttribute('data-step', 'check'))
    expect(bodies[0]).toMatchObject({
      scripted: false,
      payload: { mood: { key: 'tired', custom: null }, note: null },
    })

    // 2. 확인: 밥 칩을 눌러 "아직" 으로 고친다 → confirm payload 에 반영
    await user.click(q('[data-check="meal"]') as HTMLElement)
    await user.click(q('[data-set-status="not_yet"]') as HTMLElement)
    await user.click(cta())
    await waitFor(() => expect(q('#bab-child')).toHaveAttribute('data-step', 'preview'))
    const confirmBody = bodies.find((b) => b.payload && 'checks' in b.payload)
    expect(confirmBody?.payload).toMatchObject({
      checks: [
        { item: 'meal', status: 'not_yet', detail: '점심 김치찌개' },
        { item: 'home', status: 'done', detail: '21시 귀가' },
      ],
    })

    // 3. 미리보기: 아빠 메시지 본문에 기분이 없고, 빠진 항목 칩이 뜬다
    expect(q('[data-message-text="dad"]')?.textContent).not.toMatch(/피곤|😪/)
    expect(q('[data-message="dad"] [data-omitted="mood"]')).not.toBeNull()
    expect(q('[data-why="dad"]')).toHaveTextContent('아빠께는 귀가만 보내요')
    expect(q('[data-message="mom"] [data-omitted="mood"]')).toBeNull()

    // 4. 보내기 → 엄마 폰 메신저 → 링크 열기 → 버튼 두 개 → 답장
    await user.click(cta())
    await waitFor(() => expect(q('#bab-preview')).not.toBeNull())
    await user.click(q('#bab-preview') as HTMLElement)
    await user.click(q('[data-parent-button="heart"]') as HTMLElement)
    await user.click(q('[data-parent-button="ate"]') as HTMLElement)
    await user.click(q('#bab-answer') as HTMLElement)
    await waitFor(() => expect(q('#bab-reply')).not.toBeNull())
    expect(bodies.find((b) => b.payload && 'pressed' in b.payload)?.payload).toEqual({
      from: 'mom',
      pressed: ['heart', 'ate'],
    })
  })

  it('올린 사진은 judge 요청에도 실린다 (빠지면 서버가 데모 밥 사진으로 판정한다)', async () => {
    const user = userEvent.setup()
    render(<BabView />)
    await waitFor(() => expect(document.querySelectorAll('[data-beat]')).toHaveLength(8))

    const photo = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], 'desk.jpg', { type: 'image/jpeg' })
    await user.upload(q('input[type=file]') as HTMLInputElement, photo)
    await user.click(screen.getByRole('radio', { name: /피곤해/ }))
    await user.click(q('#bab-cta') as HTMLButtonElement)
    await waitFor(() => expect(bodies).toHaveLength(2))

    const fileNames = (b: ReplyBody) =>
      ((b as ReplyBody & { files?: { name: string }[] }).files ?? []).map((f) => f.name)
    expect(fileNames(bodies[0])).toEqual(['desk.jpg']) // upload
    expect(fileNames(bodies[1])).toEqual(['desk.jpg']) // judge
  })

  it('＋ 시트의 말투 칩과 내 말투 예시가 compose payload 로 간다 (R9)', async () => {
    const user = userEvent.setup()
    render(<BabView />)
    await waitFor(() => expect(document.querySelectorAll('[data-beat]')).toHaveLength(8))

    await user.click(screen.getByRole('radio', { name: /피곤해/ }))
    await user.click(screen.getByRole('button', { name: '더 많은 옵션' }))
    await user.click(q('[data-tone="dad:dialect"]') as HTMLElement)
    await user.click(q('[data-tone="mom:warm"]') as HTMLElement)
    await user.type(q('#bab-voice') as HTMLElement, '오늘도 화이팅 ㅎㅎ')
    await user.type(q('[data-address="dad"]') as HTMLElement, '아부지')
    await user.click(screen.getByRole('button', { name: '완료' }))

    await user.click(q('#bab-cta') as HTMLButtonElement)
    await waitFor(() => expect(q('#bab-child')).toHaveAttribute('data-step', 'check'))
    await user.click(q('#bab-cta') as HTMLButtonElement)
    await waitFor(() => expect(bodies.some((b) => b.payload && 'tones' in b.payload)).toBe(true))
    expect(bodies.find((b) => b.payload && 'tones' in b.payload)?.payload).toEqual({
      tones: { dad: 'dialect', mom: 'warm' },
      addresses: { dad: '아부지' },
      voice: ['오늘도 화이팅 ㅎㅎ'],
    })
  })

  it('말투를 고르지 않으면 compose 에 payload 를 보내지 않는다', async () => {
    const user = userEvent.setup()
    render(<BabView />)
    await waitFor(() => expect(document.querySelectorAll('[data-beat]')).toHaveLength(8))
    await user.click(screen.getByRole('radio', { name: /피곤해/ }))
    await user.click(q('#bab-cta') as HTMLButtonElement)
    await waitFor(() => expect(q('#bab-child')).toHaveAttribute('data-step', 'check'))
    await user.click(q('#bab-cta') as HTMLButtonElement)
    await waitFor(() => expect(bodies.length).toBeGreaterThanOrEqual(4))
    expect(bodies[3].payload).toBeNull() // upload, judge, confirm, compose
  })

  it('＋ 시트에 한마디와 받는 사람별 내용이 숨어 있다', async () => {
    const user = userEvent.setup()
    render(<BabView />)
    expect(q('#bab-sheet')).toBeNull()
    await user.click(screen.getByRole('button', { name: '더 많은 옵션' }))
    expect(q('#bab-sheet')).not.toBeNull()
    expect(q('#bab-note')).not.toBeNull()
    expect(document.querySelectorAll('[data-who]')).toHaveLength(2)
  })

  it('뒤로가기: 확인 화면에서 오늘 화면으로 돌아가도 고른 기분이 남는다', async () => {
    const user = userEvent.setup()
    render(<BabView />)
    await waitFor(() => expect(document.querySelectorAll('[data-beat]')).toHaveLength(8))
    expect(q('#bab-back')).toBeNull()
    await user.click(screen.getByRole('radio', { name: /피곤해/ }))
    await user.click(q('#bab-cta') as HTMLElement)
    await waitFor(() => expect(q('#bab-child')).toHaveAttribute('data-step', 'check'))
    await user.click(q('#bab-back') as HTMLElement)
    await waitFor(() => expect(q('#bab-child')).toHaveAttribute('data-step', 'today'))
    expect(screen.getByRole('radio', { name: /피곤해/ })).toHaveAttribute('aria-checked', 'true')
  })
})
