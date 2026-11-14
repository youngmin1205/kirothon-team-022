/**
 * 실제 폰 테스트용 화면 두 가지.
 *
 *   ?feature=bab&view=child        자녀 폰 한 대만 (BabView 가 data-view 로 엄마 폰을 숨긴다)
 *   ?feature=bab&view=mom&s=<id>   부모님이 카톡·문자 링크로 여는 답장 페이지 (이 파일)
 *
 * 부모님 페이지는 자녀와 같은 세션에 react payload 를 보낸다. 자녀 폰은
 * GET /api/bab/link/<id> 를 읽다가 답장이 오면 reply 구간을 스스로 부른다.
 * 녹화·#play 경로와는 섞이지 않는다 (view 파라미터가 있을 때만 켜진다).
 */
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { PARENT_BUTTONS, SAY } from './constants'
import { Avatar, Check } from './icons'
import type { ButtonKey, LinkInfo } from './types'
import { fetchLink } from './remote-link'

export function MomLinkPage({ sid }: { sid: string }) {
  const [info, setInfo] = useState<LinkInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pressed, setPressed] = useState<ButtonKey[]>([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    let alive = true
    fetchLink(sid)
      .then((i) => {
        if (!alive) return
        setInfo(i)
        if (i.pressed.length) setSent(true)
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      alive = false
    }
  }, [sid])

  const answer = async () => {
    setSending(true)
    setError(null)
    try {
      await api.reply('bab', sid, SAY.react, false, { payload: { from: 'mom', pressed } })
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  const child = info?.child ?? ''
  const canAnswer = info?.next === 'react' && !sent
  const shown = sent && info?.pressed.length ? info.pressed : pressed

  return (
    <div className="bab-stage bab-solo" data-view="mom" id="bab-remote">
      <div className="bab-app bab-link" id="bab-react">
        <div className="bab-scroll">
          {error ? <p className="bab-error" role="alert">{error}</p> : null}
          {info ? (
            <>
              <div className="bab-link-head">
                <Avatar name={child} tone="child" size={44} />
                <h2 className="bab-big">{child} 오늘 안부</h2>
              </div>
              <ul className="bab-big-list">
                {info.summary
                  .split(' · ')
                  .filter(Boolean)
                  .map((line) => (
                    <li key={line}>{line}</li>
                  ))}
              </ul>
              <h3>누르면 {child}에게 바로 가요</h3>
              <div className="bab-buttons">
                {(info.buttons.length ? info.buttons : PARENT_BUTTONS).map((b) => {
                  const isOn = shown.includes(b.key)
                  return (
                    <button
                      key={b.key}
                      type="button"
                      className={isOn ? 'bab-pbtn pressed' : 'bab-pbtn'}
                      data-parent-button={b.key}
                      data-pressed={isOn}
                      aria-pressed={isOn}
                      disabled={!canAnswer || sending}
                      onClick={() => setPressed(isOn ? pressed.filter((k) => k !== b.key) : [...pressed, b.key])}
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
              {sent ? (
                <p className="bab-sent-note">
                  <Check size={18} /> {child}에게 보냈어요
                </p>
              ) : info.next !== 'react' ? (
                <p className="bab-sent-note">아직 답할 수 없는 링크예요</p>
              ) : (
                <button
                  type="button"
                  className="bab-cta big"
                  id="bab-answer"
                  disabled={sending || pressed.length === 0}
                  onClick={() => void answer()}
                >
                  {sending ? '보내는 중…' : pressed.length ? `답장 보내기 · ${pressed.length}개` : '답장 보내기'}
                </button>
              )}
            </>
          ) : error ? null : (
            <p className="bab-wait">불러오는 중…</p>
          )}
        </div>
      </div>
    </div>
  )
}
