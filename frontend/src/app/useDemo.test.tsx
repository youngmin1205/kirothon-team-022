/**
 * 데모 재생 계약을 지키는지 확인한다.
 *
 * 여기서 깨지면 당일 녹화와 smoke 가 같이 깨진다.
 *   1. `#play` 를 한 번 누르면 모든 구간이 순서대로 done 이 된다
 *   2. 재생 중에는 `#play` 가 disabled, 끝나면 풀린다 (종료 신호)
 *   3. 구간마다 `data-beat` / `data-state` 가 DOM 에 남는다
 *
 * 그리고 사람이 쓰는 경로(입력창)가 실제로 동작하는지 — 이게 깨지면
 * 당일 개발 중에 화면을 확인할 방법이 없다.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SampleView } from '../features/sample'
import { useDemo } from './useDemo'
import { MAX_BYTES } from '../lib/files'
import type { Attachment, BeatsResponse, TurnResponse } from '../types/api'

const BEAT_IDS = ['intro', 'work', 'result', 'end']

let beatsResponse: BeatsResponse
const defaultBeats: BeatsResponse = {
  feature: 'sample',
  ids: BEAT_IDS,
  // 테스트에서는 대기 시간을 0 으로 둬서 빨리 끝나게 한다
  beats: BEAT_IDS.map((id, i) => ({ id, text: `구간 ${i}`, delayMs: 0 })),
}

function turn(i: number): TurnResponse {
  return {
    sessionId: 'test-session',
    turn: i,
    beatIndex: i + 1,
    state: { seenTurns: i },
    text: `구간 ${i} 응답`,
    source: 'mock',
    agent: 'main',
    data: { step: i },
  }
}

let replyCount = 0
/** #play 가 /reply 로 보낸 text 를 순서대로 */
let replyTexts: string[] = []
let lastReplyBody: {
  sessionId: string
  text: string
  scripted?: boolean
  payload?: Record<string, unknown> | null
  files?: Attachment[] | null
} | null = null
/** mock 모드 서버처럼 자유 입력에 안내만 돌려줄지 */
let advisoryOnFreeInput = false
/** /reply 응답을 붙잡아 두는 문. 전송 중 상태를 관찰할 때 쓴다 */
let replyGate: Promise<void> | null = null
let openReplyGate: (() => void) | null = null

beforeEach(() => {
  beatsResponse = defaultBeats
  replyCount = 0
  replyTexts = []
  lastReplyBody = null
  advisoryOnFreeInput = false
  replyGate = null
  openReplyGate = null
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const json = (body: unknown) =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })

      if (url.endsWith('/beats')) return json(beatsResponse)
      if (url.endsWith('/start')) return json(turn(0))
      if (url.endsWith('/reply')) {
        // 전송 중 상태를 관찰해야 하는 테스트는 여기서 응답을 붙잡는다
        if (replyGate) await replyGate
        lastReplyBody = JSON.parse(String(init?.body ?? '{}'))
        replyTexts.push(lastReplyBody?.text ?? '')
        if (advisoryOnFreeInput && !lastReplyBody?.scripted) {
          return json({
            ...turn(0),
            beatIndex: 0,
            text: '고정 시나리오에서는 자유 대화가 반영되지 않습니다. pnpm dev 로 실행하세요.',
            advisory: true,
            reason: 'free-input-ignored',
          })
        }
        return json(turn(++replyCount))
      }
      if (url.endsWith('/reset')) return json({ ...turn(0), beatIndex: 0, source: 'reset' })
      throw new Error(`테스트가 처리하지 않은 요청: ${url}`)
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('데모 자동 재생', () => {
  it('구간 목록을 불러와 모두 pending 으로 그린다', async () => {
    render(<SampleView />)
    await waitFor(() => {
      expect(document.querySelectorAll('[data-beat]')).toHaveLength(BEAT_IDS.length)
    })
    for (const id of BEAT_IDS) {
      expect(document.querySelector(`[data-beat="${id}"]`)).toHaveAttribute('data-state', 'pending')
    }
  })

  it('#play 한 번으로 모든 구간이 done 이 되고 버튼이 다시 살아난다', async () => {
    render(<SampleView />)
    await waitFor(() => expect(document.querySelector('[data-beat]')).not.toBeNull())

    const play = screen.getByRole('button', { name: /데모 재생/ })
    expect(play).not.toBeDisabled()

    await userEvent.click(play)

    // 모든 구간이 완료된다
    await waitFor(
      () => {
        for (const id of BEAT_IDS) {
          expect(document.querySelector(`[data-beat="${id}"]`)).toHaveAttribute(
            'data-state',
            'done',
          )
        }
      },
      { timeout: 5000 },
    )

    // 끝나면 #play 가 다시 눌릴 수 있다 — 녹화의 종료 신호
    await waitFor(() => expect(document.querySelector('#play')).not.toBeDisabled())
  })

  it('구간 수만큼 서버 호출이 일어난다 (start 1회 + reply N-1회)', async () => {
    render(<SampleView />)
    await waitFor(() => expect(document.querySelector('[data-beat]')).not.toBeNull())

    await userEvent.click(screen.getByRole('button', { name: /데모 재생/ }))
    await waitFor(() => expect(document.querySelector('#play')).not.toBeDisabled(), {
      timeout: 5000,
    })

    expect(replyCount).toBe(BEAT_IDS.length - 1)
  })

  it('재생 결과가 대화 버블로 보인다', async () => {
    render(<SampleView />)
    await waitFor(() => expect(document.querySelector('[data-beat]')).not.toBeNull())
    await userEvent.click(screen.getByRole('button', { name: /데모 재생/ }))
    await waitFor(() => expect(document.querySelector('#play')).not.toBeDisabled(), {
      timeout: 5000,
    })
    expect(document.querySelectorAll('[data-bubble-beat]')).toHaveLength(BEAT_IDS.length)
  })

  it('처음으로 누르면 구간이 전부 pending 으로 돌아간다', async () => {
    render(<SampleView />)
    await waitFor(() => expect(document.querySelector('[data-beat]')).not.toBeNull())
    await userEvent.click(screen.getByRole('button', { name: /데모 재생/ }))
    await waitFor(() => expect(document.querySelector('#play')).not.toBeDisabled(), {
      timeout: 5000,
    })

    await userEvent.click(screen.getByRole('button', { name: /처음으로/ }))
    await waitFor(() => {
      for (const id of BEAT_IDS) {
        expect(document.querySelector(`[data-beat="${id}"]`)).toHaveAttribute(
          'data-state',
          'pending',
        )
      }
    })
  })
})

describe('사람이 쓰는 경로 (입력창)', () => {
  async function ready() {
    render(<SampleView />)
    await waitFor(() => expect(document.querySelector('[data-beat]')).not.toBeNull())
    return document.querySelector<HTMLInputElement>('#composer-input')!
  }

  it('열면 입력창과 안내가 먼저 보인다', async () => {
    const input = await ready()
    expect(input).not.toBeNull()
    expect(input).not.toBeDisabled()
    expect(document.querySelector('#empty-hint')).not.toBeNull()
    expect(document.querySelectorAll('[data-bubble-beat]')).toHaveLength(0)
  })

  it('입력하고 Enter 를 누르면 내 말풍선이 생기고 입력창이 비워진다', async () => {
    const input = await ready()

    await userEvent.type(input, '누구세요?{Enter}')

    await waitFor(() => {
      expect(document.querySelector('.bubble.me')).toHaveTextContent('누구세요?')
    })
    expect(input).toHaveValue('')

    // 내 말풍선 뒤에 상대 응답이 온다
    await waitFor(() => {
      const bubbles = [...document.querySelectorAll('[data-bubble-beat]')]
      const meIndex = bubbles.findIndex((b) => b.classList.contains('me'))
      expect(meIndex).toBeGreaterThanOrEqual(0)
      expect(bubbles.slice(meIndex + 1).some((b) => b.classList.contains('them'))).toBe(true)
    })

    // 사람이 보낸 발화는 대본 재생이 아니다
    expect(lastReplyBody?.scripted).toBe(false)
    expect(lastReplyBody?.text).toBe('누구세요?')
  })

  it('전송 중에도 #play 는 눌릴 수 있다 (sending 과 running 을 섞지 않는다)', async () => {
    replyGate = new Promise<void>((resolve) => {
      openReplyGate = resolve
    })
    const input = await ready()

    await userEvent.type(input, '안녕{Enter}')

    // 응답을 기다리는 동안: 입력창은 잠기지만 #play 는 살아 있다
    await waitFor(() => expect(document.querySelector('#composer-input')).toBeDisabled())
    expect(document.querySelector('#play')).not.toBeDisabled()

    openReplyGate?.()
    await waitFor(() => expect(document.querySelector('#composer-input')).not.toBeDisabled())
  })

  it('빈 입력은 보내지 않는다', async () => {
    const input = await ready()
    await userEvent.type(input, '   {Enter}')
    expect(document.querySelector('#composer-send')).toBeDisabled()
    expect(document.querySelectorAll('[data-bubble-beat]')).toHaveLength(0)
  })

  it('mock 안내는 안내 말풍선으로 보이고 단계를 올리지 않는다', async () => {
    advisoryOnFreeInput = true
    const input = await ready()

    await userEvent.type(input, '아무말{Enter}')

    await waitFor(() => {
      expect(document.querySelector('.bubble.system')).toHaveTextContent('pnpm dev')
    })
    // 세션 첫 응답이 intro 를 소비했을 뿐, 안내는 다음 단계로 넘기지 않는다
    expect(document.querySelector('[data-beat="work"]')).toHaveAttribute('data-state', 'pending')
  })

  it('입력 뒤에 #play 를 눌러도 대본은 처음부터 끝까지 재생된다', async () => {
    const input = await ready()
    await userEvent.type(input, '안녕{Enter}')
    await waitFor(() => expect(document.querySelector('.bubble.me')).not.toBeNull())

    await userEvent.click(screen.getByRole('button', { name: /데모 재생/ }))
    await waitFor(
      () => {
        for (const id of BEAT_IDS) {
          expect(document.querySelector(`[data-beat="${id}"]`)).toHaveAttribute(
            'data-state',
            'done',
          )
        }
      },
      { timeout: 5000 },
    )
    await waitFor(() => expect(document.querySelector('#play')).not.toBeDisabled())
    // 재생 경로는 대본 진행을 허용한다고 알린다
    expect(lastReplyBody?.scripted).toBe(true)
  })

  it('구간에 say 가 있으면 #play 가 그 문장을 보내고, 없으면 다음 을 보낸다', async () => {
    beatsResponse = {
      ...defaultBeats,
      beats: defaultBeats.beats.map((b) =>
        b.id === 'result' ? { ...b, say: '결과 보여줘' } : b,
      ),
    }
    await ready()
    await userEvent.click(screen.getByRole('button', { name: /데모 재생/ }))
    await waitFor(() => expect(document.querySelector('#play')).not.toBeDisabled(), {
      timeout: 5000,
    })
    // 0번(intro)은 start, 1~3번이 reply
    expect(replyTexts).toEqual(['다음', '결과 보여줘', '다음'])
    expect(lastReplyBody?.scripted).toBe(true)
    // 녹화에 대화가 보이도록 사용자 버블로도 남긴다
    expect(screen.getByText('결과 보여줘')).toBeInTheDocument()
  })
})

/**
 * 서버가 턴마다 보내는 구조화 값이 화면까지 오는지 확인한다.
 *
 * 왜 중요한가: 결과가 텍스트뿐이면 채점에서 깎인다. 표·카드·게이지를 그리려면
 * 화면이 턴마다 숫자를 받아야 한다. 계측 패널은 `?showcase=1` 에서만 보이므로
 * 여기서는 훅의 반환값을 직접 들여다보는 작은 부품을 쓴다.
 */
function DataProbe() {
  const { play, send, reset, data, dataByBeat, serverState } = useDemo({
    feature: 'sample',
    defaultDelayMs: 0,
  })
  return (
    <div>
      <button id="probe-play" type="button" onClick={() => void play()}>
        재생
      </button>
      <button id="probe-send" type="button" onClick={() => void send('아무말')}>
        보내기
      </button>
      <button id="probe-reset" type="button" onClick={() => void reset()}>
        처음으로
      </button>
      <span id="probe-data">{JSON.stringify(data)}</span>
      <span id="probe-by-beat">{JSON.stringify(dataByBeat)}</span>
      <span id="probe-state">{JSON.stringify(serverState)}</span>
    </div>
  )
}

describe('구조화 값 (data)', () => {
  const text = (sel: string) => document.querySelector(sel)?.textContent ?? ''

  it('재생하면 마지막 턴의 값과 구간별 값이 모두 노출된다', async () => {
    render(<DataProbe />)
    await userEvent.click(document.querySelector<HTMLButtonElement>('#probe-play')!)

    await waitFor(
      () => {
        expect(JSON.parse(text('#probe-by-beat'))).toEqual({
          intro: { step: 0 },
          work: { step: 1 },
          result: { step: 2 },
          end: { step: 3 },
        })
      },
      { timeout: 5000 },
    )
    // 마지막 턴의 값과 봉투의 state 도 함께 온다
    expect(JSON.parse(text('#probe-data'))).toEqual({ step: 3 })
    expect(JSON.parse(text('#probe-state'))).toEqual({ seenTurns: 3 })
  })

  it('안내(advisory)는 들고 있던 값을 덮지 않는다', async () => {
    advisoryOnFreeInput = true
    render(<DataProbe />)

    await userEvent.click(document.querySelector<HTMLButtonElement>('#probe-play')!)
    // 재생이 끝나기를 기다린다. 중간 구간에서 값을 집으면 경합이 된다
    await waitFor(() => expect(JSON.parse(text('#probe-data'))).toEqual({ step: 3 }), {
      timeout: 5000,
    })
    const before = text('#probe-data')

    await userEvent.click(document.querySelector<HTMLButtonElement>('#probe-send')!)
    // 안내 응답은 replyCount 를 올리지 않는다. 자유 입력이 서버에 닿았는지로 기다린다
    await waitFor(() => expect(lastReplyBody?.scripted).toBe(false))
    expect(text('#probe-data')).toBe(before)
  })

  it('처음으로 돌리면 값도 비워진다', async () => {
    render(<DataProbe />)
    await userEvent.click(document.querySelector<HTMLButtonElement>('#probe-play')!)
    await waitFor(() => expect(text('#probe-data')).toContain('step'), { timeout: 5000 })

    await userEvent.click(document.querySelector<HTMLButtonElement>('#probe-reset')!)
    await waitFor(() => expect(text('#probe-data')).toBe('null'))
    expect(JSON.parse(text('#probe-by-beat'))).toEqual({})
    expect(JSON.parse(text('#probe-state'))).toEqual({})
  })
})

/**
 * 파일 입력 경로. "사진을 올리면" 으로 시작하는 기능이 이 경로를 쓴다.
 *
 * 왜 중요한가: 입력이 텍스트 한 줄뿐이면 업로드형 아이디어를 당일에 받을 수
 * 없다. 서버까지 base64 로 닿는지 여기서 고정한다.
 */
describe('파일 입력 (첨부)', () => {
  async function ready() {
    render(<SampleView />)
    await waitFor(() => expect(document.querySelector('[data-beat]')).not.toBeNull())
    return document.querySelector<HTMLInputElement>('#file-pick-input')!
  }

  it('고른 파일이 base64 로 서버까지 간다', async () => {
    const input = await ready()
    const file = new File(['a,b\n1,2\n'], 'zones.csv', { type: 'text/csv' })

    await userEvent.upload(input, file)
    await waitFor(() => expect(document.querySelector('[data-file-chip="zones.csv"]')).not.toBeNull())

    await userEvent.click(document.querySelector<HTMLButtonElement>('#send-files')!)

    await waitFor(() => expect(lastReplyBody?.files?.length).toBe(1))
    const sent = lastReplyBody!.files![0]
    expect(sent.name).toBe('zones.csv')
    expect(sent.mimeType).toBe('text/csv')
    expect(atob(sent.dataBase64)).toBe('a,b\n1,2\n')
    // 첨부만 보내도 자유 입력이다 (대본을 진행시키지 않는다)
    expect(lastReplyBody?.scripted).toBe(false)
    // 무엇을 보냈는지 말풍선에 남는다
    expect(document.querySelector('.bubble.me')).toHaveTextContent('zones.csv')
  })

  it('허용하지 않는 형식은 파일 선택에서 걸러진다', async () => {
    const input = await ready()
    const file = new File(['x'], 'bad.zip', { type: 'application/zip' })

    await userEvent.upload(input, file)

    // accept 목록에 없으면 브라우저가 애초에 받지 않는다 → 칩도 전송 버튼도 없다
    expect(document.querySelector('[data-file-chip="bad.zip"]')).toBeNull()
    expect(document.querySelector('#send-files')).toBeNull()
    expect(lastReplyBody).toBeNull()
  })

  it('상한을 넘는 파일은 이유를 보여주고 서버에 가지 않는다', async () => {
    const input = await ready()
    // 형식은 맞지만 크기가 상한(5MB)을 넘는다
    const big = new File([new Uint8Array(MAX_BYTES + 1)], 'big.png', { type: 'image/png' })

    await userEvent.upload(input, big)

    await waitFor(() => expect(document.querySelector('#file-pick-error')).not.toBeNull())
    expect(document.querySelector('#file-pick-error')).toHaveTextContent('너무 큽니다')
    expect(document.querySelector('#send-files')).toBeNull()
    expect(lastReplyBody).toBeNull()
  })

  it('텍스트와 첨부를 함께 보낼 수 있다', async () => {
    const input = await ready()
    await userEvent.upload(input, new File(['hi'], 'note.txt', { type: 'text/plain' }))
    await waitFor(() => expect(document.querySelector('[data-file-chip="note.txt"]')).not.toBeNull())

    await userEvent.type(document.querySelector('#composer-input')!, '이것도 봐줘{Enter}')

    await waitFor(() => expect(lastReplyBody?.files?.length).toBe(1))
    expect(lastReplyBody?.text).toBe('이것도 봐줘')
    // 보낸 뒤에는 첨부 목록이 비워진다
    await waitFor(() => expect(document.querySelector('[data-file-chip="note.txt"]')).toBeNull())
  })
})
