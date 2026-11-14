/**
 * 데모 화면의 상태 한 덩어리. 두 경로를 함께 들고 있다.
 *
 *   사람이 쓰는 경로   start() · send(text) · sending
 *     개발 중 기본이다. 입력창에 치면 실제 모델이 답한다. 이게 "앱"이다.
 *
 *   대본 재생 경로     play() · running · states · beats
 *     개발 중 아무 때나 같은 흐름을 재현하고, scripts/smoke.py 와 Playwright 가
 *     이걸 눌러 자동 검증한다. 피칭 때 무대에서 타이핑하지 않으려는 것도 있다.
 *
 * 왜 둘을 나누는가
 *   `sending` 과 `running` 을 섞으면 안 된다. `#play` 의 disabled 는
 *   "대본 재생이 끝났다"는 신호다(아래 DOM 계약). 사람이 한 줄 보낼 때마다
 *   `#play` 를 잠그면 녹화·검증이 종료를 잘못 읽는다.
 *
 * DOM 계약 (대본 재생 경로)
 *   구간마다 `data-beat="<id>"` 와 `data-state="pending|active|done"` 를 남긴다.
 *   신호는 BeatMarkers 가 렌더한다. 선택자는 `[data-beat="intro"][data-state="done"]`.
 *   마지막 구간이 끝나면 `#play` 의 disabled 를 푼다 → `#play:not([disabled])` 가 종료 신호.
 *
 * 구조화 값
 *   턴마다 서버가 `data` 를 함께 보낸다(mock 은 mock.json 의 `beats[].data`).
 *   `data`(마지막 턴) · `dataByBeat`(구간별) · `serverState`(봉투의 state) 로 꺼낸다.
 *   결과가 텍스트뿐이면 채점에서 깎이므로, 표·카드·게이지는 이 값으로 그린다.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import type { Beat, TurnInput, TurnResponse } from '../types/api'

export type BeatState = 'pending' | 'active' | 'done'

/** 첨부·폼 값만 보냈을 때 말풍선에 남길 문구 */
function describeInput(input?: TurnInput): string {
  const names = (input?.files ?? []).map((f) => f.name)
  if (names.length) return `📎 ${names.join(', ')}`
  if (input?.payload) return JSON.stringify(input.payload)
  return ''
}

export interface Line {
  beatId: string
  who: 'them' | 'me' | 'system'
  text: string
  source?: TurnResponse['source']
  agent?: string
}

interface Options {
  /** 기능 이름. /api/<feature>/… 로 호출한다 */
  feature: string
  /** 각 구간 사이 기본 대기(ms). mock.json 의 delayMs 가 있으면 그쪽이 우선 */
  defaultDelayMs?: number
}

export function useDemo({ feature, defaultDelayMs = 650 }: Options) {
  const [beats, setBeats] = useState<Beat[]>([])
  const [states, setStates] = useState<Record<string, BeatState>>({})
  const [lines, setLines] = useState<Line[]>([])
  const [running, setRunning] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<TurnResponse['source'] | null>(null)
  // 마지막 턴이 실어 온 구조화 값. 표·카드·게이지를 이걸로 그린다.
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  // 구간별 누적. 재생이 끝난 뒤에도 "3번 구간의 수치"를 꺼내 쓸 수 있다.
  const [dataByBeat, setDataByBeat] = useState<Record<string, Record<string, unknown>>>({})
  // 서버 봉투의 state (기능별 누적 상태). states(구간 상태)와 다른 것이다.
  const [serverState, setServerState] = useState<Record<string, unknown>>({})

  // 재생 세대. reset 이나 재진입 시 이전 재생이 상태를 덮어쓰지 않게 한다.
  const genRef = useRef(0)
  const sessionRef = useRef<string | null>(null)
  // 지금 몇 번째 응답인지. 두 경로가 같은 자리를 본다.
  const turnIndexRef = useRef(0)
  // 연속 전송 막기. setSending 은 비동기라 가드로 쓸 수 없다.
  const busyRef = useRef(false)
  // 비동기 콜백에서 최신 구간 목록을 보기 위한 사본
  const beatsRef = useRef<Beat[]>([])

  const loadBeats = useCallback(async () => {
    try {
      const res = await api.beats(feature)
      beatsRef.current = res.beats
      setBeats(res.beats)
      setStates(Object.fromEntries(res.ids.map((id) => [id, 'pending' as BeatState])))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [feature])

  useEffect(() => {
    void loadBeats()
  }, [loadBeats])

  const mark = useCallback((id: string, state: BeatState) => {
    setStates((prev) => ({ ...prev, [id]: state }))
  }, [])

  const push = useCallback((line: Line) => {
    setLines((prev) => [...prev, line])
  }, [])

  const clearBeatStates = useCallback(() => {
    setStates((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, 'pending'])))
  }, [])

  /** 턴이 실어 온 구조화 값을 보관한다. 구간 id 가 있으면 구간별로도 남긴다. */
  const absorbData = useCallback((beatId: string, turn: TurnResponse) => {
    setServerState(turn.state ?? {})
    if (!turn.data) return
    const payload = turn.data
    setData(payload)
    setDataByBeat((prev) => ({ ...prev, [beatId]: payload }))
  }, [])

  const clearData = useCallback(() => {
    setData(null)
    setDataByBeat({})
    setServerState({})
  }, [])

  const reset = useCallback(async () => {
    genRef.current += 1
    setRunning(false)
    setLines([])
    setSource(null)
    turnIndexRef.current = 0
    clearBeatStates()
    clearData()
    if (sessionRef.current) {
      try {
        await api.reset(feature, sessionRef.current)
      } catch {
        // 세션이 사라졌으면 다음 play 에서 새로 만든다
      }
      sessionRef.current = null
    }
  }, [clearBeatStates, clearData, feature])

  /* ── 사람이 쓰는 경로 ─────────────────────────────────────
     입력창이 쓰는 두 함수. 대본 길이와 무관하게 계속 대화할 수 있다. */

  /** 서버 응답 하나를 화면에 붙인다. 대본 안이면 그 구간을 done 으로 남긴다. */
  const absorb = useCallback(
    (turn: TurnResponse) => {
      setSource(turn.source)

      // 안내(advisory)는 대화가 아니다. 진행 단계를 올리지 않는다.
      if (turn.advisory) {
        push({ beatId: 'advisory', who: 'system', text: turn.text, source: turn.source })
        return
      }

      const idx = turnIndexRef.current
      const beat = idx < beatsRef.current.length ? beatsRef.current[idx] : undefined
      const beatId = beat?.id ?? `turn-${idx}`
      push({
        beatId,
        who: 'them',
        text: turn.text,
        source: turn.source,
        agent: turn.agent,
      })
      absorbData(beatId, turn)
      // 대본을 넘어선 턴은 단계 표식을 건드리지 않는다
      if (beat) mark(beat.id, 'done')
      turnIndexRef.current = idx + 1
    },
    [absorbData, mark, push],
  )

  /** 세션이 없으면 만들고 첫 응답을 화면에 붙인다. 있으면 그대로 쓴다. */
  const ensureSession = useCallback(
    async (payload?: Record<string, unknown>): Promise<string> => {
      if (sessionRef.current) return sessionRef.current
      const first = await api.start(feature, undefined, payload)
      sessionRef.current = first.sessionId
      absorb(first)
      return first.sessionId
    },
    [absorb, feature],
  )

  /**
   * 세션을 열고 첫 응답을 받는다.
   * 입력이 없는 화면(목록·대시보드형)은 이것만 호출하면 된다.
   * 폼을 한 번 제출하는 화면은 `start(값)` 으로 시작값을 함께 보낸다.
   */
  const start = useCallback(
    async (payload?: Record<string, unknown>) => {
      if (busyRef.current || sessionRef.current) return
      busyRef.current = true
      setSending(true)
      setError(null)
      try {
        await ensureSession(payload)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        busyRef.current = false
        setSending(false)
      }
    },
    [ensureSession],
  )

  /**
   * 사용자가 한 턴 보낸다. 세션이 없으면 먼저 만든다.
   *
   * `input` 으로 폼 값(payload)과 첨부(files)를 함께 보낼 수 있다. 첨부만 보내는
   * 경우가 있어 `text` 는 비어 있어도 된다.
   *
   * `#play` 는 건드리지 않는다. 여기서 `running` 을 켜면 녹화가 종료 신호를
   * 잘못 읽는다.
   */
  const send = useCallback(
    async (text: string, input?: TurnInput) => {
      const body = text.trim()
      const hasExtra = Boolean(input?.files?.length || input?.payload)
      if ((!body && !hasExtra) || busyRef.current) return
      busyRef.current = true
      setSending(true)
      setError(null)
      try {
        // 세션 첫 응답(인사)은 사용자 말풍선보다 앞에 온다. 그게 대화 순서다.
        const sid = await ensureSession()
        push({
          beatId: `me-${turnIndexRef.current}`,
          who: 'me',
          // 첨부만 보냈으면 무엇을 보냈는지 말풍선에 남긴다
          text: body || describeInput(input),
        })
        const turn = await api.reply(feature, sid, body, false, input)
        absorb(turn)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        busyRef.current = false
        setSending(false)
      }
    },
    [absorb, ensureSession, feature, push],
  )

  /* ── 대본 재생 경로 ───────────────────────────────────────
     smoke·녹화·체크포인트가 쓴다. 여기 계약은 바꾸지 않는다. */

  const play = useCallback(async () => {
    const gen = ++genRef.current
    setRunning(true)
    setLines([])
    setError(null)
    turnIndexRef.current = 0
    sessionRef.current = null
    clearBeatStates()
    clearData()

    const alive = () => gen === genRef.current

    const pushIfAlive = (line: Line) => {
      if (alive()) setLines((prev) => [...prev, line])
    }

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms)))

    try {
      const first = await api.start(feature)
      if (!alive()) return
      sessionRef.current = first.sessionId
      setSource(first.source)

      const order = beats.length ? beats : []
      const total = order.length || 1

      // 첫 응답은 0번 구간
      let idx = 0
      const applyTurn = (turn: TurnResponse) => {
        const beat = order[idx]
        const id = beat?.id ?? `beat-${idx}`
        mark(id, 'active')
        pushIfAlive({
          beatId: id,
          who: 'them',
          text: turn.text,
          source: turn.source,
          agent: turn.agent,
        })
        if (alive()) absorbData(id, turn)
        return { id, delay: beat?.delayMs ?? defaultDelayMs }
      }

      let { id, delay } = applyTurn(first)
      await sleep(delay)
      if (!alive()) return
      mark(id, 'done')
      idx += 1
      turnIndexRef.current = idx

      while (idx < total) {
        // 구간의 say 를 사용자 발화로 보낸다. live 에서는 모델이 이 말에 답한다.
        // 0번 구간은 start 응답이라 여기 오지 않는다 (say 를 쓰지 않는다)
        const say = order[idx]?.say
        if (say) pushIfAlive({ beatId: order[idx].id, who: 'me', text: say })
        // scripted: true — 서버가 대본을 진행시켜도 되는 호출이라는 뜻
        const turn = await api.reply(feature, first.sessionId, say ?? '다음', true)
        if (!alive()) return
        setSource(turn.source)
        ;({ id, delay } = applyTurn(turn))
        await sleep(delay)
        if (!alive()) return
        mark(id, 'done')
        idx += 1
        turnIndexRef.current = idx
      }
    } catch (e) {
      if (alive()) setError(e instanceof Error ? e.message : String(e))
    } finally {
      // 마지막에 반드시 #play 를 되살린다. 이게 종료 신호다.
      if (gen === genRef.current) setRunning(false)
    }
  }, [absorbData, beats, clearBeatStates, clearData, defaultDelayMs, feature, mark])

  const doneCount = Object.values(states).filter((s) => s === 'done').length

  return {
    // 사람이 쓰는 경로
    start,
    send,
    sending,
    // 대본 재생 경로
    play,
    running,
    states,
    beats,
    // 공통
    lines,
    error,
    source,
    /** 마지막 턴의 구조화 값. 표·카드·게이지를 이걸로 그린다 */
    data,
    /** 구간 id → 그 구간의 구조화 값 */
    dataByBeat,
    /** 서버 봉투의 state (기능별 누적 상태). 구간 상태(states) 와 다르다 */
    serverState,
    reset,
    reloadBeats: loadBeats,
    doneCount,
  }
}
