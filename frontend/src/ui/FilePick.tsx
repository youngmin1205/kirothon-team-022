/**
 * 파일 선택 부품.
 *
 * "사진을 올리면", "CSV를 올리면" 으로 시작하는 기능이 쓴다. 고른 파일은
 * `useDemo` 의 `send(text, { files })` 로 함께 보낸다.
 *
 * 왜 여기 있나: 입력이 텍스트 한 줄뿐이면 업로드형 아이디어를 당일에 받을 수
 * 없다. 그래서 주제와 무관하게 미리 열어 둔 입력 경로다.
 *
 * id 세 개(`file-pick` · `file-pick-input` · `file-pick-error`)는 테스트가 쓴다.
 */
import { useRef, useState } from 'react'
import type { Attachment } from '../types/api'
import { ACCEPT, MAX_FILES, readFilesAsAttachments, sizeLabel } from '../lib/files'

/** base64 길이로 원본 바이트 수를 되돌린다 (표시용) */
function approxBytes(dataBase64: string): number {
  return Math.floor((dataBase64.length * 3) / 4)
}

export function FilePick({
  files,
  onChange,
  disabled = false,
  accept = ACCEPT,
  max = MAX_FILES,
  label = '파일 첨부',
}: {
  files: Attachment[]
  onChange: (files: Attachment[]) => void
  disabled?: boolean
  accept?: string
  max?: number
  label?: string
}) {
  const [errors, setErrors] = useState<string[]>([])
  const [reading, setReading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const pick = async (picked: FileList | null) => {
    if (!picked || picked.length === 0) return
    setReading(true)
    const { attachments, errors: failed } = await readFilesAsAttachments(picked, max)
    setErrors(failed)
    setReading(false)
    if (attachments.length) onChange(attachments)
    // 같은 파일을 다시 골라도 change 가 뜨도록 비워 둔다
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="file-pick" id="file-pick">
      <button
        id="file-pick-open"
        className="btn ghost"
        type="button"
        disabled={disabled || reading}
        onClick={() => inputRef.current?.click()}
      >
        {reading ? '읽는 중…' : label}
      </button>
      <input
        ref={inputRef}
        id="file-pick-input"
        type="file"
        accept={accept}
        multiple={max > 1}
        disabled={disabled}
        aria-label={label}
        style={{ display: 'none' }}
        onChange={(e) => void pick(e.target.files)}
      />

      {files.length > 0 ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {files.map((f) => (
            <span key={f.name} className="chip info" data-file-chip={f.name}>
              {f.name} · {sizeLabel(approxBytes(f.dataBase64))}
              <button
                type="button"
                className="btn ghost"
                aria-label={`${f.name} 제거`}
                onClick={() => onChange(files.filter((x) => x.name !== f.name))}
                style={{ padding: '0 6px', marginLeft: 6 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {errors.length > 0 ? (
        <div id="file-pick-error" className="footnote" style={{ color: 'var(--bad)' }}>
          {errors.join(' / ')}
        </div>
      ) : null}
    </div>
  )
}
