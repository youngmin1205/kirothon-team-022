/**
 * 파일을 서버로 보낼 모양(base64)으로 바꾼다.
 *
 * 왜 base64 인가: 요청·응답 형식이 `types/api.ts` 한 곳에서 끝나고, 화면은
 * `api.*` 래퍼만 쓰면 된다. 데모 크기(수 MB)에서는 multipart 보다 단순하다.
 *
 * 여기서 거르는 것은 **사용자에게 바로 알려주기 위한** 1차 확인이다.
 * 진짜 경계는 서버(`backend/core/attachments.py`)이고 거기서 다시 검사한다.
 */
import type { Attachment } from '../types/api'

/** 서버 `core/attachments.py` 의 MAX_FILES 와 같은 값 */
export const MAX_FILES = 3

/** 서버 `ATTACHMENT_MAX_MB` 기본값과 같은 값 */
export const MAX_BYTES = 5 * 1024 * 1024

/** 서버 ALLOWED_MIMES 와 같은 목록 */
export const ALLOWED_MIMES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'text/csv',
  'text/plain',
  'application/pdf',
] as const

/** `<input type="file" accept=...>` 에 넣는 문자열 */
export const ACCEPT = ALLOWED_MIMES.join(',')

export function sizeLabel(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)}KB`
  return `${(n / 1024 / 1024).toFixed(1)}MB`
}

export class FileRejected extends Error {}

/** 보낼 수 있는 파일인지 본다. 보낼 수 없으면 이유를 돌려준다. */
export function rejectReason(file: File): string | null {
  if (!ALLOWED_MIMES.includes(file.type as (typeof ALLOWED_MIMES)[number])) {
    return `${file.name}: 보낼 수 없는 형식입니다 (${file.type || '알 수 없음'})`
  }
  if (file.size > MAX_BYTES) {
    return `${file.name}: 너무 큽니다 (${sizeLabel(file.size)} / 상한 ${sizeLabel(MAX_BYTES)})`
  }
  if (file.size === 0) return `${file.name}: 빈 파일입니다`
  return null
}

/** 파일 하나를 첨부 모양으로 읽는다. */
export async function readFileAsAttachment(file: File): Promise<Attachment> {
  const reason = rejectReason(file)
  if (reason) throw new FileRejected(reason)

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new FileRejected(`${file.name}: 읽지 못했습니다`))
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  })

  // "data:image/png;base64,AAAA" → "AAAA"
  const dataBase64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  if (!dataBase64) throw new FileRejected(`${file.name}: 내용이 비어 있습니다`)

  return { name: file.name, mimeType: file.type, dataBase64 }
}

/** 여러 개를 읽는다. 개수 상한을 넘으면 앞에서부터 자른다. */
export async function readFilesAsAttachments(
  files: FileList | File[],
  max = MAX_FILES,
): Promise<{ attachments: Attachment[]; errors: string[] }> {
  const picked = [...files].slice(0, max)
  const attachments: Attachment[] = []
  const errors: string[] = []
  if ([...files].length > max) errors.push(`한 번에 ${max}개까지 보낼 수 있습니다`)

  for (const file of picked) {
    try {
      attachments.push(await readFileAsAttachment(file))
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e))
    }
  }
  return { attachments, errors }
}
