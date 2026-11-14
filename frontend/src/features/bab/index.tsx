/**
 * 밥은 먹었니 — 자녀 폰과 엄마 폰을 나란히 보여 주는 화면 (FE task 5~9).
 *
 * 설계 원칙 (근거: docs/ideas/bab-ux-evidence.md, 디자인 비평 14:30)
 *   1. 저녁 식탁 같은 따뜻한 무대. 지금 일이 일어나는 폰만 또렷하고 다른 폰은 한발 물러난다
 *   2. 화면마다 큰 버튼 하나. 고급 옵션(한마디, 받는 사람별 내용)은 조절 버튼 시트에 숨긴다
 *   3. 원인 → 결과가 보이게: 보내면 엄마 잠금 화면에 알림이 먼저 뜨고, 엄마 버튼은 하나씩 눌린다
 *   4. 사용자 화면에는 사용자 말만. "AI·프로필·코드" 같은 발표용 말은 계측 패널(?showcase=1)로
 *   5. 정점은 "엄마도 밥 드셨대요". 화면 전체를 쓰고, 마지막 문장으로 끝을 맺는다
 *
 * 두 경로
 *   사람이 쓰는 경로  사진·기분을 고르고 버튼을 누르면 send(say, { files, payload }) 로 보낸다
 *                     (입력 계약: docs/work-split.md 2장). mock 모드에서는 서버가 안내만 돌려준다
 *   대본 재생 경로    #play 가 say 만 보낸다. 화면은 서버 data(dataByBeat)로 그린다
 *   그래서 화면은 "직접 고른 값이 있으면 그것, 없으면 서버 값"으로 그린다.
 *
 * 고정 계약: `#play`, `data-beat`/`data-state` 는 Shell·BeatMarkers 가 그린다. 여기서 건드리지 않는다.
 * 녹화 주의: capture 는 `.toast` 를 숨기므로 답장 알림은 폰 안의 화면으로 그린다.
 */
import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useDemo } from '../../app/useDemo'
import { isShowcase, Shell } from '../../app/Shell'
import { ArchFlow, Card, Steps } from '../../ui/primitives'
import { PhoneFrame } from '../../ui/phone'
import { ACCEPT, MAX_FILES, readFilesAsAttachments } from '../../lib/files'
import type { Attachment } from '../../types/api'
import type { BabBeats, BeatId, ButtonKey, Check as CheckT, ItemKey, Mood, MoodKey, ToneKey } from './types'
import { BEAT_ORDER } from './types'
import { CHILD_NAME, ITEMS, MOOD_OPTIONS, PARENT_BUTTONS, PHOTO_EMOJI, RECIPIENTS, SAY, TONE_OPTIONS, MAX_VOICE } from './constants'
import { Avatar, ChevronLeft, Bowl, Camera, Check, Lock, Pencil, Send, Sliders, X } from './icons'
import { MomLinkPage } from './remote'
import { fetchLink, momLink, readView, shareMessage, type View } from './remote-link'
import './bab.css'

const FEATURE = 'bab'

type ChildStep = 'today' | 'check' | 'preview' | 'sent'
const STEP_ORDER: ChildStep[] = ['today', 'check', 'preview', 'sent']

/** 이 구간에는 엄마 폰에서 일이 일어난다. 나머지는 자녀 폰 */
const MOM_BEATS: BeatId[] = ['deliver', 'react']

const STATUS_LABEL = { done: '했어요', not_yet: '아직', unknown: '모르겠어요' } as const

/** 축하 조각 14개 — 이모지가 아니라 색 조각. 위치·회전·지연은 고정값(녹화마다 같게) */
const CONFETTI = Array.from({ length: 14 }, (_, i) => ({
  x: (i * 37) % 100,
  r: (i * 53) % 360,
  d: (i % 7) * 70,
  c: ['#E8613C', '#F2B33D', '#7FB685', '#E58FA0'][i % 4],
}))

/** 실제 폰 테스트: ?view=mom&s=<id> 면 부모님 답장 페이지, 아니면 두 폰 화면 */
export function BabView() {
  const { view, sid } = readView()
  if (view === 'mom' && sid) return <MomLinkPage sid={sid} />
  return <BabDuo view={view} />
}

function BabDuo({ view }: { view: View }) {
  const { play, running, states, beats, error, source, reset, dataByBeat, send, sending, lines } =
    useDemo({ feature: FEATURE })

  // dataByBeat 는 구간 id → data. 구간마다 모양이 정해져 있으므로 여기서 한 번만 좁힌다
  const raw = dataByBeat as Partial<BabBeats>
  // 실제 폰 테스트(view=child): react 턴은 부모님 폰이 보내므로, 자녀 폰이 부른 답장 응답이
  // 한 칸 앞(react 자리)에 기록된다. 답장 모양(chips)이면 reply 로 옮겨 읽는다
  const d: Partial<BabBeats> =
    view === 'child' && !raw.reply && raw.react && 'chips' in raw.react
      ? { ...raw, reply: raw.react as BabBeats['reply'], react: undefined }
      : raw
  const reached = (id: BeatId) =>
    d[id] !== undefined || states[id] === 'active' || states[id] === 'done'
  const busy = running || sending

  /* ── 사람이 고른 값 (대본 재생 중에는 비어 있다) ─────────── */
  const [photos, setPhotos] = useState<Attachment[]>([])
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [moodKey, setMoodKey] = useState<MoodKey | null>(null)
  const [customMood, setCustomMood] = useState('')
  const [note, setNote] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [tones, setTones] = useState<Partial<Record<string, ToneKey>>>({})
  const [voice, setVoice] = useState('')
  const [addresses, setAddresses] = useState<Record<string, string>>({})
  const [edited, setEdited] = useState<CheckT[] | null>(null)
  const [editing, setEditing] = useState<ItemKey | null>(null)
  const [pressed, setPressed] = useState<ButtonKey[]>([])
  const [linkOpen, setLinkOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const [shareNote, setShareNote] = useState<string | null>(null)

  // 처음으로·데모 재생을 누르면 직접 고른 값도 비운다 (effect 대신 이벤트에서 비운다)
  const clearLocal = () => {
    setPhotos([])
    setPhotoError(null)
    setMoodKey(null)
    setCustomMood('')
    setNote('')
    setSheetOpen(false)
    setTones({})
    setVoice('')
    setAddresses({})
    setEdited(null)
    setEditing(null)
    setPressed([])
    setLinkOpen(false)
    setShareNote(null)
  }

  /* ── 화면에 그릴 값: 직접 고른 값 → 서버 값 순서 ─────────── */
  const child = d.home?.child ?? CHILD_NAME
  const recipients = d.home?.recipients ?? RECIPIENTS
  const pickedMood: Mood | undefined = moodKey
    ? {
        ...(MOOD_OPTIONS.find((m) => m.key === moodKey) ?? MOOD_OPTIONS[0]),
        key: moodKey,
        custom: moodKey === 'custom' ? customMood.trim() || null : null,
      }
    : (d.confirm?.mood ?? d.upload?.mood)
  const checks = edited ?? d.confirm?.checks ?? d.judge?.checks ?? []
  const messages = d.compose?.messages ?? []
  const momMessage = messages.find((m) => m.to === (d.deliver?.to ?? 'mom'))
  const parentName = d.deliver?.name ?? d.react?.name ?? '엄마'

  const childStep: ChildStep = reached('deliver')
    ? 'sent'
    : reached('compose')
      ? 'preview'
      : reached('judge')
        ? 'check'
        : 'today'
  const parentView = reached('react') ? 'link' : reached('deliver') ? (linkOpen ? 'link' : 'chat') : 'lock'

  // 지금 일이 일어나는 폰. 재생 중이면 active 구간, 아니면 마지막으로 도착한 구간 기준
  const activeBeat =
    BEAT_ORDER.find((id) => states[id] === 'active') ?? [...BEAT_ORDER].reverse().find(reached) ?? null
  // 재생·전송이 끝나면 두 폰 모두 또렷하게 둔다 (마지막 장면에서 엄마 폰이 흐리면 결과가 안 보인다)
  const focus = activeBeat && (running || sending) ? (MOM_BEATS.includes(activeBeat) ? 'mom' : 'child') : null

  // 실제 폰 테스트(view=child): 보낸 뒤 부모님 링크에서 답장이 왔는지 2초마다 본다.
  // 답장이 오면 reply 구간을 자녀 폰이 직접 불러 정점 화면을 그린다.
  const remoteSid = view === 'child' ? d.deliver?.session : undefined
  const waiting = Boolean(remoteSid) && reached('deliver') && !reached('reply') && !running
  useEffect(() => {
    if (!waiting || !remoteSid) return
    let alive = true
    const timer = window.setInterval(() => {
      fetchLink(remoteSid)
        .then((info) => {
          if (alive && info.pressed.length && info.next === 'reply') {
            alive = false
            window.clearInterval(timer)
            void send(beats.find((b) => b.id === 'reply')?.say ?? SAY.reply)
          }
        })
        .catch(() => undefined)
    }, 2000)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [waiting, remoteSid, send, beats])

  // mock 모드에서 직접 누르면 서버가 안내만 돌려준다. 개발용 안내라 계측 모드에서만 보인다
  const lastLine = lines.at(-1)
  const advisory = isShowcase() && !running && lastLine?.who === 'system' ? lastLine.text : null
  // 고정 시나리오(USE_MOCK=1)는 직접 누른 입력을 반영하지 않는다. 아무 반응이 없어 보이지 않게 알린다
  const mockIgnored = source === 'mock' && !running && lastLine?.who === 'system'

  /* ── 사람이 누르는 버튼 → 입력 계약대로 send ───────────── */
  const sayOf = (id: BeatId) => beats.find((b) => b.id === id)?.say ?? SAY[id]

  const askAI = async () => {
    setSheetOpen(false)
    const mood = moodKey
      ? { key: moodKey, custom: moodKey === 'custom' ? customMood.trim() || null : null }
      : null
    await send(sayOf('upload'), {
      files: photos.length ? photos : undefined,
      payload: { mood, note: note.trim() || null },
    })
    // judge 는 별도 요청이라 사진을 다시 실어 보낸다. 빠지면 서버가 데모 사진(samples/)으로
    // 판정해서, 밥이 아닌 사진도 "밥 먹었어요"가 된다.
    await send(sayOf('judge'), { files: photos.length ? photos : undefined })
  }

  /**
   * 뒤로가기. 서버 세션은 앞으로만 가므로, 세션을 처음으로 돌리고 직접 고른 값(사진·기분·고친 항목)은
   * 그대로 둔 채 필요한 단계까지 다시 보낸다. 보낸 뒤(sent)에는 되돌리지 않는다.
   *   확인 → 오늘: 세션만 처음으로
   *   미리보기 → 확인: 처음으로 돌린 뒤 사진을 다시 판정 (고친 항목은 그대로 덮인다)
   */
  const goBack = async () => {
    if (busy) return
    setEditing(null)
    setSheetOpen(false)
    await reset()
    if (childStep === 'preview') await askAI()
  }
  const canBack = !running && (childStep === 'check' || childStep === 'preview')

  const confirm = async () => {
    setEditing(null)
    await send(sayOf('confirm'), {
      payload: { checks: checks.map(({ item, status, detail }) => ({ item, status, detail })) },
    })
    // 말투를 고르지 않았으면 payload 를 보내지 않는다 → 서버는 프로필 기본 말투 (R9)
    const voiceLines = voice.split('\n').map((v) => v.trim()).filter(Boolean).slice(0, MAX_VOICE)
    const calls = Object.fromEntries(
      Object.entries(addresses).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v),
    )
    const style = {
      ...(Object.keys(tones).length ? { tones } : {}),
      ...(Object.keys(calls).length ? { addresses: calls } : {}),
      ...(voiceLines.length ? { voice: voiceLines } : {}),
    }
    await send(sayOf('compose'), Object.keys(style).length ? { payload: style } : undefined)
  }

  const deliver = () => send(sayOf('deliver'))

  const answer = async () => {
    await send(sayOf('react'), { payload: { from: 'mom', pressed } })
    await send(sayOf('reply'))
  }

  const editCheck = (item: ItemKey, patch: Partial<CheckT>) =>
    setEdited(checks.map((c) => (c.item === item ? { ...c, ...patch } : c)))

  const pickPhotos = async (list: FileList | null) => {
    if (!list?.length) return
    const room = MAX_FILES - photos.length
    const { attachments, errors } = await readFilesAsAttachments(list, room)
    setPhotoError(errors.length ? errors.join(' / ') : null)
    if (attachments.length) setPhotos((prev) => [...prev, ...attachments].slice(0, MAX_FILES))
    if (fileInput.current) fileInput.current.value = ''
  }

  // 받는 사람마다 빠지는 항목. 오늘 실제로 있는 항목 중 그 사람 프로필에 없는 것
  const present: ItemKey[] = [
    ...checks.filter((c) => c.status === 'done').map((c) => c.item),
    ...(pickedMood ? (['mood'] as ItemKey[]) : []),
  ]
  const itemEmoji = (it: ItemKey) => (it === 'mood' && pickedMood ? pickedMood.emoji : ITEMS[it].emoji)
  const toneOf = (id: string) => (id === 'dad' ? 'dad' : 'mom') as 'mom' | 'dad'
  const channelName = (c?: string) => (c === 'sms' ? '문자' : '카톡')

  const on = (id: BeatId) => states[id] === 'active' || states[id] === 'done'
  const stepIdx = STEP_ORDER.indexOf(childStep)

  return (
    <Shell
      title="밥은 먹었니"
      subtitle="사진 한 번, 기분 버튼 하나로 엄마·아빠에게 각자 맞는 안부가 갑니다."
      layout="phone"
      running={running}
      source={source}
      error={error}
      states={states}
      onPlay={() => {
        clearLocal()
        void play()
      }}
      onReset={() => {
        clearLocal()
        void reset()
      }}
      showcase={
        <div className="grid">
          <Card title="진행 단계">
            <Steps
              items={beats.map((b, i) => ({
                id: b.id,
                label: `${i + 1}`,
                caption: b.id,
                state: states[b.id] ?? 'pending',
              }))}
            />
          </Card>
          <Card title="AI 가 하는 일 · 코드가 지키는 일">
            <ArchFlow
              nodes={[
                { id: 'photo', label: '사진·기분', on: on('upload') },
                { id: 'judge', label: 'judge (AI)', on: on('judge') },
                { id: 'confirm', label: '자녀 확인', on: on('confirm') },
                { id: 'filter', label: '프로필 필터 (코드)', on: on('compose') },
                { id: 'compose', label: 'compose (AI)', on: on('compose') },
                { id: 'deliver', label: '부모님', on: on('deliver') },
              ]}
            />
          </Card>
          {advisory ? <Card title="서버 안내">{advisory}</Card> : null}
        </div>
      }
    >
      <div className="bab-stage" id="bab-duo" data-focus={focus ?? 'none'} data-view={view ?? undefined}>
        {/* ══ 자녀 폰 ══════════════════════════════════════ */}
        <figure className="bab-device" data-device="child" data-dim={focus === 'mom'}>
          <PhoneFrame>
            <div className="bab-app" id="bab-child" data-step={childStep}>
              <header className="bab-appbar">
                {canBack ? (
                  <button type="button" className="bab-back" id="bab-back" aria-label="뒤로" disabled={busy} onClick={() => void goBack()}>
                    <ChevronLeft size={24} />
                  </button>
                ) : null}
                <span className="bab-brand">
                  <Bowl size={22} />
                  밥은 먹었니
                </span>
                <span className="bab-progress" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={stepIdx + 1} aria-label="오늘 안부 진행">
                  {STEP_ORDER.map((s, i) => (
                    <i key={s} className={i <= stepIdx ? 'on' : undefined} />
                  ))}
                </span>
              </header>

              <div className="bab-scroll" key={childStep}>
                {/* ── 1. 오늘: 사진 + 기분 ─────────────── */}
                {childStep === 'today' ? (
                  <>
                    <div className="bab-hero">
                      <h2>오늘 안부, 10초면 끝나요</h2>
                      <p>사진 한 장과 지금 기분만 골라 주세요</p>
                    </div>

                    <div className="bab-to" id="bab-home" data-section="home">
                      {recipients.map((r) => (
                        <span key={r.id} className="bab-to-person" data-recipient={r.id}>
                          <Avatar name={r.name} tone={toneOf(r.id)} size={28} />
                          {r.name}
                        </span>
                      ))}
                      <span className="bab-to-label">께 보내요</span>
                    </div>

                    <section className="bab-block" id="bab-upload" data-section="upload">
                      <h3>오늘 사진</h3>
                      <div className="bab-photos">
                        {photos.length
                          ? photos.map((p) => (
                              <span key={p.name} className="bab-photo has-img" data-photo={p.name}>
                                <img src={`data:${p.mimeType};base64,${p.dataBase64}`} alt={p.name} />
                                <button
                                  type="button"
                                  className="bab-x"
                                  aria-label={`${p.name} 빼기`}
                                  onClick={() => setPhotos(photos.filter((x) => x.name !== p.name))}
                                >
                                  <X size={14} />
                                </button>
                              </span>
                            ))
                          : (d.upload?.photos ?? []).map((p, i) => (
                              <span
                                key={p.name}
                                className="bab-photo sample pop"
                                data-photo={p.name}
                                style={{ '--n': i } as CSSProperties}
                              >
                                <b aria-hidden="true">{PHOTO_EMOJI[p.label] ?? '📷'}</b>
                                {p.label}
                              </span>
                            ))}
                        {photos.length < MAX_FILES && !d.upload?.photos?.length ? (
                          <button
                            type="button"
                            className="bab-photo add"
                            id="bab-photo-add"
                            disabled={busy}
                            onClick={() => fileInput.current?.click()}
                          >
                            <Camera size={24} />
                            사진 추가
                          </button>
                        ) : null}
                        <input
                          ref={fileInput}
                          type="file"
                          accept={ACCEPT}
                          multiple
                          hidden
                          aria-label="사진 고르기"
                          onChange={(e) => void pickPhotos(e.target.files)}
                        />
                      </div>
                      {photoError ? (
                        <p className="bab-error" role="alert">
                          {photoError}
                        </p>
                      ) : null}
                      {mockIgnored ? (
                        <p className="bab-error" role="status" id="bab-mock-hint">
                          고정 시나리오에서는 직접 고른 값이 반영되지 않아요. 위의 ‘데모 재생’을 눌러 주세요.
                        </p>
                      ) : null}

                      <h3>지금 기분은?</h3>
                      <div className="bab-moods" id="bab-moods" role="radiogroup" aria-label="오늘 기분">
                        {MOOD_OPTIONS.map((m) => {
                          const picked = pickedMood?.key === m.key
                          return (
                            <button
                              key={m.key}
                              type="button"
                              role="radio"
                              aria-checked={picked}
                              className={picked ? 'bab-mood picked' : 'bab-mood'}
                              data-mood={m.key}
                              disabled={busy}
                              onClick={() => setMoodKey(picked && moodKey ? null : m.key)}
                            >
                              <span aria-hidden="true">{m.emoji}</span>
                              {m.label}
                            </button>
                          )
                        })}
                      </div>
                      {moodKey === 'custom' ? (
                        <input
                          className="bab-input"
                          id="bab-mood-custom"
                          value={customMood}
                          maxLength={40}
                          placeholder="예: 발표 끝나서 후련해"
                          aria-label="기분 직접 입력"
                          onChange={(e) => setCustomMood(e.target.value)}
                        />
                      ) : null}
                    </section>
                  </>
                ) : null}

                {/* ── 2. 확인: 사진에서 읽은 것, 눌러서 수정 ── */}
                {childStep === 'check' ? (
                  <>
                    <div className="bab-hero">
                      <h2>사진 보고 이렇게 적었어요</h2>
                      <p>틀린 곳은 눌러서 고쳐 주세요</p>
                    </div>
                    <p className="bab-reading" aria-hidden="true">
                      <i className="bab-dots">
                        <b />
                        <b />
                        <b />
                      </i>
                      사진을 보는 중
                    </p>
                    <section className="bab-checks" id="bab-checks" data-section="judge">
                      {checks.map((c, i) => (
                        <div key={c.item} className="bab-check-wrap pop" style={{ '--n': i + 2 } as CSSProperties}>
                          <button
                            type="button"
                            className={`bab-check ${c.status}`}
                            data-check={c.item}
                            data-status={c.status}
                            aria-expanded={editing === c.item}
                            disabled={busy || reached('confirm')}
                            onClick={() => setEditing(editing === c.item ? null : c.item)}
                          >
                            <span className="bab-check-emoji" aria-hidden="true">
                              {c.emoji}
                            </span>
                            <span className="bab-check-body">
                              <span className="bab-check-head">
                                {c.label}
                                <em className={`bab-status ${c.status}`}>
                                  {c.status === 'done' ? <Check size={14} /> : null}
                                  {STATUS_LABEL[c.status] ?? '모르겠어요'}
                                </em>
                              </span>
                              <small>{c.detail}</small>
                            </span>
                            {!reached('confirm') ? (
                              <span className="bab-pencil">
                                <Pencil size={18} />
                              </span>
                            ) : null}
                          </button>
                          {editing === c.item ? (
                            <div className="bab-editor" data-editor={c.item}>
                              <div className="bab-seg" role="radiogroup" aria-label={`${c.label} 상태`}>
                                {(
                                  [
                                    ['done', '했어요'],
                                    ['not_yet', '아직'],
                                  ] as const
                                ).map(([st, label]) => (
                                  <button
                                    key={st}
                                    type="button"
                                    role="radio"
                                    aria-checked={c.status === st}
                                    className={c.status === st ? 'on' : undefined}
                                    data-set-status={st}
                                    onClick={() => editCheck(c.item, { status: st })}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                              <input
                                className="bab-input"
                                value={c.detail}
                                maxLength={30}
                                aria-label={`${c.label} 내용`}
                                onChange={(e) => editCheck(c.item, { detail: e.target.value })}
                              />
                            </div>
                          ) : null}
                        </div>
                      ))}
                      {reached('confirm') ? (
                        <p className="bab-confirmed" id="bab-confirmed">
                          <Check size={16} /> 확인했어요
                        </p>
                      ) : null}
                    </section>
                    {pickedMood ? (
                      <p className="bab-mood-line pop" id="bab-mood-line" style={{ '--n': 4 } as CSSProperties}>
                        <span aria-hidden="true">{pickedMood.emoji}</span>
                        <span>
                          기분 「{pickedMood.custom ?? pickedMood.label}」
                          <small>직접 고른 그대로 보내요</small>
                        </span>
                      </p>
                    ) : null}
                  </>
                ) : null}

                {/* ── 3. 미리보기: 받는 사람마다 다르게 ───── */}
                {childStep === 'preview' ? (
                  <>
                    <div className="bab-hero">
                      <h2>엄마와 아빠께 이렇게 가요</h2>
                      <p>같은 하루라도 받는 분에 맞춰 말을 바꿨어요</p>
                    </div>
                    <div className="bab-msgs" id="bab-messages" data-section="compose">
                      {messages.map((m, i) => {
                        const omitted = present.filter((it) => !m.items.includes(it))
                        return (
                          <article
                            key={m.to}
                            className="bab-msg pop"
                            data-message={m.to}
                            style={{ '--n': i * 2 + 1 } as CSSProperties}
                          >
                            <header>
                              <Avatar name={m.name} tone={toneOf(m.to)} size={30} />
                              <b>{m.name}</b>
                              <small>{channelName(m.channel)}</small>
                            </header>
                            <p className="bab-msg-text" data-message-text={m.to}>
                              {m.text}
                            </p>
                            <div className="bab-msg-items">
                              {m.items.map((it) => (
                                <span key={it} className="bab-tag">
                                  {itemEmoji(it)} {ITEMS[it].label}
                                </span>
                              ))}
                            </div>
                            {omitted.length ? (
                              <p className="bab-why" data-why={m.to}>
                                <Lock size={16} />
                                <span>
                                  {m.name}께는 {m.items.map((it) => ITEMS[it].label).join('·')}만 보내요
                                </span>
                                <span className="bab-omitted">
                                  {omitted.map((it) => (
                                    <s key={it} data-omitted={it}>
                                      {itemEmoji(it)} {ITEMS[it].label}
                                    </s>
                                  ))}
                                </span>
                              </p>
                            ) : null}
                          </article>
                        )
                      })}
                    </div>
                  </>
                ) : null}

                {/* ── 4. 보냄 → 답장 ─────────────────────── */}
                {childStep === 'sent' && !reached('reply') ? (
                  <div className="bab-sent" id="bab-sent" data-section="deliver">
                    <span className="bab-sent-icon">
                      <Send size={30} />
                    </span>
                    <h2>보냈어요</h2>
                    <p className="bab-sent-time">{d.deliver?.sentAt ?? ''}</p>
                    <ul className="bab-sent-list">
                      {recipients.map((r) => (
                        <li key={r.id}>
                          <Avatar name={r.name} tone={toneOf(r.id)} size={28} />
                          <b>{r.name}</b>
                          <span>{channelName(r.channel)}</span>
                          <Check size={18} />
                        </li>
                      ))}
                    </ul>
                    {remoteSid ? (
                      <div className="bab-share" id="bab-share">
                        <p>카톡·문자로 직접 보내 주세요</p>
                        {messages.map((m) => (
                          <button
                            key={m.to}
                            type="button"
                            className="bab-share-btn"
                            data-share={m.to}
                            onClick={() =>
                              void shareMessage(m.text || m.summary, momLink(remoteSid), m.channel).then(setShareNote)
                            }
                          >
                            <Avatar name={m.name} tone={toneOf(m.to)} size={24} />
                            {m.name}께 {channelName(m.channel)} 보내기
                          </button>
                        ))}
                        {shareNote ? <small role="status">{shareNote}</small> : null}
                      </div>
                    ) : null}
                    <p className="bab-wait">
                      <i className="bab-dots">
                        <b />
                        <b />
                        <b />
                      </i>
                      답장을 기다리는 중
                    </p>
                  </div>
                ) : null}

                {childStep === 'sent' && reached('reply') ? (
                  <section
                    className={d.reply?.celebrate ? 'bab-peak celebrate' : 'bab-peak'}
                    id="bab-reply"
                    data-section="reply"
                    role="status"
                  >
                    {/* id 는 녹화·테스트가 쓴다. 보냄 기록은 정점 화면 아래에 작게 남긴다 */}
                    <span id="bab-sent" className="bab-peak-meta">
                      {d.deliver?.sentAt ? `${d.deliver.sentAt}에 보낸 안부에` : '보낸 안부에'}
                    </span>
                    {d.reply?.celebrate ? (
                      <span className="bab-confetti" aria-hidden="true">
                        {CONFETTI.map((c, i) => (
                          <i
                            key={i}
                            style={{ '--x': `${c.x}%`, '--r': `${c.r}deg`, '--d': `${c.d}ms`, background: c.c } as CSSProperties}
                          />
                        ))}
                      </span>
                    ) : null}
                    <span className="bab-peak-avatar">
                      <Avatar name={parentName} tone="mom" size={84} />
                      <i aria-hidden="true">❤️</i>
                    </span>
                    <strong className="bab-peak-title">{d.reply?.toast ?? `${parentName}가 답했어요`}</strong>
                    <div className="bab-peak-chips">
                      {(d.reply?.chips ?? []).map((c) => (
                        <span key={c.key} className="bab-chip" data-reply-chip={c.key}>
                          <span aria-hidden="true">{c.emoji}</span> {c.label}
                        </span>
                      ))}
                    </div>
                    <p className="bab-peak-end">오늘도 서로 밥 챙겼어요</p>
                  </section>
                ) : null}
              </div>

              {/* ── 아래 고정: 조절 버튼과 주요 버튼 하나 ───── */}
              {childStep !== 'sent' ? (
                <>
                {childStep === 'today' && !running ? (
                  <button
                    type="button"
                    className="bab-persona-link"
                    id="bab-persona-link"
                    disabled={busy}
                    onClick={() => setSheetOpen(true)}
                  >
                    <Sliders size={16} />
                    {Object.keys(tones).length
                      ? RECIPIENTS.filter((r) => tones[r.id])
                          .map((r) => `${r.name} ${TONE_OPTIONS.find((t) => t.key === tones[r.id])?.label}`)
                          .join(' · ')
                      : '받는 분별 말투·호칭 정하기'}
                    <span aria-hidden="true">›</span>
                  </button>
                ) : null}
                <footer className="bab-footer">
                  {childStep === 'today' ? (
                    <button
                      type="button"
                      className="bab-more"
                      id="bab-more"
                      aria-label="더 많은 옵션"
                      aria-expanded={sheetOpen}
                      disabled={busy}
                      onClick={() => setSheetOpen(!sheetOpen)}
                    >
                      <Sliders size={22} />
                    </button>
                  ) : null}
                  {childStep === 'today' ? (
                    <button
                      type="button"
                      className={running ? 'bab-cta demo' : 'bab-cta'}
                      id="bab-cta"
                      disabled={busy || (!photos.length && !moodKey)}
                      onClick={() => void askAI()}
                    >
                      {sending ? '사진을 보는 중…' : !photos.length && !moodKey && !running ? '사진이나 기분을 골라 주세요' : '오늘 안부 정리하기'}
                    </button>
                  ) : childStep === 'check' ? (
                    <button
                      type="button"
                      className={running ? 'bab-cta demo' : 'bab-cta'}
                      id="bab-cta"
                      disabled={busy || reached('confirm')}
                      onClick={() => void confirm()}
                    >
                      {sending ? '메시지 쓰는 중…' : '맞아요, 이대로 보낼게요'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={running ? 'bab-cta demo' : 'bab-cta'}
                      id="bab-cta"
                      disabled={busy}
                      onClick={() => void deliver()}
                    >
                      <Send size={20} />
                      {sending ? '보내는 중…' : '엄마·아빠께 보내기'}
                    </button>
                  )}
                </footer>
                </>
              ) : null}

              {/* ── 조절 시트: 고급 옵션 ──────────────────── */}
              {sheetOpen && childStep === 'today' ? (
                <div
                  className="bab-sheet-wrap"
                  onClick={() => setSheetOpen(false)}
                  onKeyDown={(e) => e.key === 'Escape' && setSheetOpen(false)}
                >
                  <div
                    className="bab-sheet"
                    id="bab-sheet"
                    role="dialog"
                    aria-modal="true"
                    aria-label="더 많은 옵션"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="bab-grabber" aria-hidden="true" />
                    <h3>조금 더 (선택)</h3>

                    <label className="bab-opt">
                      <span>한마디 덧붙이기</span>
                      <input
                        className="bab-input"
                        id="bab-note"
                        value={note}
                        maxLength={60}
                        placeholder="예: 이번 주말에 내려갈게"
                        autoFocus
                        onChange={(e) => setNote(e.target.value)}
                      />
                      <small>한마디를 받기로 한 분께만 가요</small>
                    </label>

                    <div className="bab-opt">
                      <span>누구에게 무엇이 가나요</span>
                      {RECIPIENTS.map((r) => (
                        <div key={r.id} className="bab-who" data-who={r.id}>
                          <Avatar name={r.name} tone={toneOf(r.id)} size={32} />
                          <div>
                            <b>{r.name}</b>
                            <small>
                              {r.tone} · {channelName(r.channel)}
                            </small>
                          </div>
                          <ul>
                            {(['meal', 'home', 'mood', 'note'] as ItemKey[]).map((it) => (
                              <li key={it} className={r.items.includes(it) ? 'yes' : 'no'}>
                                {r.items.includes(it) ? <Check size={13} /> : <Lock size={13} />}
                                {ITEMS[it].label}
                              </li>
                            ))}
                          </ul>
                          <div className="bab-tones" role="radiogroup" aria-label={`${r.name}께 보낼 말투`}>
                            {TONE_OPTIONS.map((t) => (
                              <button
                                key={t.key}
                                type="button"
                                role="radio"
                                aria-checked={tones[r.id] === t.key}
                                data-tone={`${r.id}:${t.key}`}
                                className={tones[r.id] === t.key ? 'on' : ''}
                                onClick={() =>
                                  setTones((prev) => {
                                    const next = { ...prev }
                                    if (next[r.id] === t.key) delete next[r.id]
                                    else next[r.id] = t.key
                                    return next
                                  })
                                }
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                          <input
                            className="bab-input bab-address"
                            data-address={r.id}
                            value={addresses[r.id] ?? ''}
                            maxLength={12}
                            placeholder={`부르는 말 (기본: ${r.name})`}
                            aria-label={`${r.name}을 부르는 말`}
                            onChange={(e) => setAddresses((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          />
                        </div>
                      ))}
                      <small>말투는 어떻게 쓸지만 바꿔요. 무엇이 가는지는 그대로예요</small>
                    </div>

                    <label className="bab-opt">
                      <span>내 말투 예시 (줄마다 한 문장)</span>
                      <textarea
                        className="bab-input"
                        id="bab-voice"
                        rows={2}
                        value={voice}
                        maxLength={240}
                        placeholder={'예: 오늘도 화이팅 ㅎㅎ\n밥 잘 챙겨 먹는 중!'}
                        onChange={(e) => setVoice(e.target.value)}
                      />
                      <small>이 말버릇을 따라 써요. 최대 {MAX_VOICE}문장</small>
                    </label>

                    <button type="button" className="bab-cta" onClick={() => setSheetOpen(false)}>
                      완료
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </PhoneFrame>
          <figcaption>
            <Avatar name={child} tone="child" size={26} />
            {child}의 폰
          </figcaption>
        </figure>

        {/* 보내는 순간 자녀 폰 → 엄마 폰으로 날아가는 안부 */}
        <span className={states.deliver === 'active' ? 'bab-relay fly' : 'bab-relay'} aria-hidden="true">
          <Send size={22} />
        </span>

        {/* ══ 엄마 폰 ══════════════════════════════════════ */}
        <figure className="bab-device" data-device="mom" data-dim={focus === 'child'}>
          <PhoneFrame>
            {parentView === 'link' ? (
              <div className="bab-app bab-link" id="bab-react" data-section="react">
                <header className="bab-urlbar">
                  {!reached('react') ? (
                    <button type="button" className="bab-back" id="bab-link-back" aria-label="대화방으로" onClick={() => setLinkOpen(false)}>
                      <ChevronLeft size={22} />
                    </button>
                  ) : null}
                  <Lock size={13} /> {hostOf(d.deliver?.link)}
                </header>
                <div className="bab-scroll">
                  <div className="bab-link-head">
                    <Avatar name={child} tone="child" size={44} />
                    <h2 className="bab-big">{child} 오늘 안부</h2>
                  </div>
                  <ul className="bab-big-list">
                    {(momMessage?.summary ?? d.deliver?.preview?.description ?? '')
                      .split(' · ')
                      .filter(Boolean)
                      .map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                  </ul>
                  <h3>누르면 {child}에게 바로 가요</h3>
                  <div className="bab-buttons">
                    {(d.react?.buttons ?? PARENT_BUTTONS).map((b) => {
                      const order = d.react?.pressed?.indexOf(b.key) ?? -1
                      const isOn = reached('react') ? order >= 0 : pressed.includes(b.key)
                      return (
                        <button
                          key={b.key}
                          type="button"
                          className={[
                            'bab-pbtn',
                            isOn ? 'pressed' : '',
                            reached('react') && isOn ? 'replay' : '',
                          ].join(' ')}
                          data-parent-button={b.key}
                          data-pressed={isOn}
                          aria-pressed={isOn}
                          disabled={busy || reached('react')}
                          style={{ '--n': Math.max(order, 0) } as CSSProperties}
                          onClick={() =>
                            setPressed(isOn ? pressed.filter((k) => k !== b.key) : [...pressed, b.key])
                          }
                        >
                          <span aria-hidden="true">{b.emoji}</span>
                          {b.label}
                          <span className="bab-pbtn-check">
                            <Check size={20} />
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {reached('react') ? (
                    <p className="bab-sent-note">
                      <Check size={18} /> {child}에게 보냈어요
                    </p>
                  ) : (
                    <button
                      type="button"
                      className="bab-cta big"
                      id="bab-answer"
                      disabled={busy || pressed.length === 0}
                      onClick={() => void answer()}
                    >
                      {pressed.length ? `답장 보내기 · ${pressed.length}개` : '답장 보내기'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bab-lock" data-section="lock">
                <span className="bab-clock">{d.deliver?.sentAt ?? '21:04'}</span>
                <span className="bab-date">11월 14일 금요일</span>
                {parentView === 'chat' ? (
                  <div className="bab-notify" id="bab-notify">
                    <span className="bab-notify-app">
                      <i className={d.deliver?.channel === 'sms' ? 'sms' : 'kakao'} />
                      {channelName(d.deliver?.channel)} · 지금
                    </span>
                    <b>{child}</b>
                    <span className="bab-notify-body">{momMessage?.summary ?? d.deliver?.preview?.description}</span>
                  </div>
                ) : (
                  <span className="bab-lock-empty">새 알림이 없어요</span>
                )}
              </div>
            )}

            {/* 알림이 뜬 뒤 엄마가 열어 보는 대화방. 잠금 화면 위로 천천히 올라온다 */}
            {parentView === 'chat' ? (
              <div className="bab-app bab-chat" id="bab-deliver" data-section="deliver">
                <header className={`bab-chatbar ${d.deliver?.channel ?? 'kakao'}`}>
                  <Avatar name={child} tone="child" size={30} />
                  {child}
                </header>
                <div className="bab-scroll">
                  <div className="bab-bubble-row">
                    <div className="bab-bubble" id="bab-bubble">
                      {d.deliver?.bubble}
                    </div>
                    <small className="bab-time">{d.deliver?.sentAt}</small>
                  </div>
                  {d.deliver?.preview ? (
                    <button
                      type="button"
                      className="bab-preview"
                      id="bab-preview"
                      disabled={busy}
                      onClick={() => setLinkOpen(true)}
                    >
                      <span className="bab-preview-img" aria-hidden="true">
                        🍲
                      </span>
                      <strong>{d.deliver.preview.title}</strong>
                      <span>{d.deliver.preview.description}</span>
                      <em>눌러서 답하기</em>
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </PhoneFrame>
          <figcaption>
            <Avatar name={parentName} tone="mom" size={26} />
            {parentName}의 폰
          </figcaption>
        </figure>
      </div>
    </Shell>
  )
}

/** 링크에서 호스트만 보여 준다 (주소창 흉내) */
function hostOf(link?: string): string {
  if (!link) return 'bab.example.com'
  try {
    return new URL(link).host
  } catch {
    return link
  }
}
