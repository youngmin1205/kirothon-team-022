/**
 * 예시 기능 화면 — 당일 이 폴더를 복사해서 시작한다.
 *
 * 이 화면은 "쓸 수 있는 앱"이다. 열면 입력창이 먼저 보이고, 치면 실제 모델이
 * 답한다. 대본 자동 재생(`#play`)은 그 위에 얹힌 검증·녹화 장치다.
 *
 * 두 층으로 나뉜다.
 *
 *   제품 화면 (기본)        실제 사용자가 보는 것. 개발 중에는 이것만 보인다
 *   계측 패널 (?showcase=1)  진행 단계 · 에이전트 흐름 · 점수. 심사·디버그용
 *
 * 당일 고치는 곳은 JSX 뿐이다. 호출과 상태는 useDemo 가 담당한다.
 */
import { useDemo } from '../../app/useDemo'
import { useState } from 'react'
import { Shell } from '../../app/Shell'
import { ArchFlow, Bar, Card, Chip, DataTable, Kpi, Steps } from '../../ui/primitives'
import { Bubbles, CallHeader, Composer, EmptyHint, PhoneFrame } from '../../ui/phone'
import { FilePick } from '../../ui/FilePick'
import type { Attachment } from '../../types/api'

const FEATURE = 'sample'

export function SampleView() {
  // 첨부는 화면이 들고 있다가 보낼 때 함께 넘긴다
  const [files, setFiles] = useState<Attachment[]>([])
  const {
    // 사람이 쓰는 경로 — 개발 중 기본
    send,
    sending,
    // 대본 재생 경로 — 검증·녹화
    play,
    running,
    states,
    beats,
    // 공통
    lines,
    error,
    source,
    reset,
    doneCount,
    // 서버가 턴마다 실어 보낸 구조화 값
    data,
  } = useDemo({ feature: FEATURE })

  const total = beats.length || 1
  const percent = Math.round((doneCount / total) * 100)
  const activeBeat = beats.find((b) => states[b.id] === 'active')?.id ?? null

  // 서버가 보낸 값을 둘로 나눠 그린다: 배열은 표로, 나머지는 키·값으로.
  // 당일에는 이 자리에 기능에 맞는 카드·게이지를 둔다.
  const dataEntries = Object.entries(data ?? {})
  const tableRows = dataEntries
    .map(([, v]) => v)
    .find(
      (v): v is Record<string, unknown>[] =>
        Array.isArray(v) && v.every((x) => typeof x === 'object' && x !== null),
    )
  const dataRows = dataEntries.filter(([, v]) => !Array.isArray(v))

  const headerSubtitle = sending
    ? '답하는 중…'
    : running
      ? '대본 재생 중…'
      : '무엇이든 입력해 보세요'

  return (
    <Shell
      title="예시 에이전트"
      subtitle="입력창으로 직접 대화하고, #play 로 같은 흐름을 재현합니다."
      layout="phone"
      running={running}
      source={source}
      error={error}
      states={states}
      onPlay={play}
      onReset={() => void reset()}
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
            <div style={{ marginTop: 14 }}>
              <Bar percent={percent} id="progress" />
              <div className="footnote" style={{ marginTop: 6 }}>
                {doneCount} / {total} 단계 완료
              </div>
            </div>
          </Card>

          <Card title="에이전트 흐름">
            <ArchFlow
              nodes={[
                { id: 'ui', label: '화면', on: running || sending },
                { id: 'api', label: 'API', on: running || sending },
                { id: 'orch', label: '오케스트레이터', on: running || sending },
                { id: 'sub', label: '서브에이전트', on: activeBeat !== null || sending },
              ]}
            />
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {lines.at(-1)?.agent ? <Chip tone="violet">{lines.at(-1)?.agent}</Chip> : null}
              {activeBeat ? <Chip tone="info" dot>{activeBeat}</Chip> : null}
            </div>
          </Card>

          <Card title="완주율">
            <Kpi value={`${percent}%`} label="데모 완주율" id="score" />
          </Card>

          {/* 서버가 턴마다 보낸 구조화 값. 당일에는 이 자리에 표·게이지를 그린다.
              결과가 텍스트뿐이면 채점에서 깎이므로, 숫자가 오는 경로를 뼈대에서 보여 둔다. */}
          <Card title="구간 값 (data)">
            {dataRows.length === 0 && !tableRows ? (
              <p className="footnote">아직 받은 값이 없습니다. 데모를 재생해 보세요.</p>
            ) : (
              <div id="turn-data" className="grid">
                {dataRows.map(([key, value]) => (
                  <div
                    key={key}
                    data-data-key={key}
                    style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
                  >
                    <span className="footnote">{key}</span>
                    <span className="mono">{String(value)}</span>
                  </div>
                ))}
                {tableRows ? <DataTable rows={tableRows} markKey="risk" /> : null}
              </div>
            )}
          </Card>
        </div>
      }
    >
      {/* ── 제품 화면 — 실제 사용자가 보는 것 ───────────────────── */}
      <PhoneFrame>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <CallHeader
            title="예시 에이전트"
            subtitle={headerSubtitle}
            tone={running ? 'alert' : 'normal'}
          />
          {lines.length === 0 ? (
            <EmptyHint>아무 말이나 입력해 보세요.</EmptyHint>
          ) : (
            <Bubbles lines={lines} />
          )}
          {/* 입력 경로 두 개: 텍스트 한 줄과 첨부. 업로드형 기능은 이 자리를 그대로 쓴다 */}
          <div style={{ padding: '8px 12px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
            <FilePick files={files} onChange={setFiles} disabled={sending || running} />
            {files.length > 0 ? (
              <button
                id="send-files"
                className="btn"
                type="button"
                disabled={sending || running}
                onClick={() => {
                  void send('', { files })
                  setFiles([])
                }}
              >
                첨부 보내기
              </button>
            ) : null}
          </div>
          <Composer
            onSend={(text) => {
              void send(text, files.length ? { files } : undefined)
              setFiles([])
            }}
            disabled={sending || running}
            placeholder={running ? '대본 재생 중…' : '메시지를 입력하세요'}
          />
        </div>
      </PhoneFrame>
    </Shell>
  )
}
