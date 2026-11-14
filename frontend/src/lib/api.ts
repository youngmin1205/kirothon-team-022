/** 백엔드 호출. 호스트는 적지 않는다 — vite 가 /api 를 :8000 으로 프록시한다. */
import type { BeatsResponse, HealthResponse, TurnInput, TurnResponse } from '../types/api'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = (await res.json()) as { detail?: string }
      if (body.detail) detail = body.detail
    } catch {
      // 본문이 JSON 이 아니면 statusText 를 쓴다
    }
    throw new ApiError(detail, res.status)
  }
  return (await res.json()) as T
}

export const api = {
  health: () => request<HealthResponse>('/api/health'),

  beats: (feature: string) => request<BeatsResponse>(`/api/${feature}/beats`),

  start: (feature: string, agent?: string, payload?: Record<string, unknown>) =>
    request<TurnResponse>(`/api/${feature}/start`, {
      method: 'POST',
      body: JSON.stringify({ agent: agent ?? null, payload: payload ?? null }),
    }),

  /**
   * 한 턴 보낸다. `input` 으로 폼 값(payload)과 첨부(files)를 함께 보낼 수 있다.
   * 첨부만 보내는 경우가 있어 `text` 는 비어 있어도 된다.
   */
  reply: (
    feature: string,
    sessionId: string,
    text: string,
    scripted = false,
    input?: TurnInput,
  ) =>
    request<TurnResponse>(`/api/${feature}/reply`, {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        text,
        scripted,
        payload: input?.payload ?? null,
        files: input?.files ?? null,
      }),
    }),

  reset: (feature: string, sessionId: string) =>
    request<TurnResponse>(`/api/${feature}/reset`, {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),
}
