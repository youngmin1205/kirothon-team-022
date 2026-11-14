/**
 * 화면과 서버가 주고받는 형식.
 *
 * 이 파일은 lead 만 고친다. 11:55 에 먼저 커밋하면, 프런트는 백엔드를
 * 기다리지 않고 화면을 끝까지 만들 수 있다. 백엔드 쪽 짝은
 * backend/features/<기능>/router.py 다.
 */

/** 모든 응답에 공통으로 붙는 부분. */
export interface Envelope {
  sessionId: string
  /** 사용자 발화 횟수 */
  turn: number
  /** 다음에 재생할 데모 구간 위치 */
  beatIndex: number
  /** 기능별 임의 상태 (점수, 수집 항목 등) */
  state: Record<string, unknown>
}

/** 한 턴의 응답. */
export interface TurnResponse extends Envelope {
  text: string
  /** 실제 모델을 썼는지, 고정 시나리오를 재생했는지 */
  source: 'bedrock' | 'mock' | 'reset'
  /** mock 으로 떨어진 이유 (있을 때만) */
  reason?: string
  /**
   * 대화 내용이 아니라 개발자에게 주는 안내인가.
   * mock 모드에서 자유 입력을 보냈을 때 서버가 이걸 true 로 돌려준다.
   * 화면은 안내 버블로 보여주고 진행 단계는 올리지 않는다.
   */
  advisory?: boolean
  /** 어느 서브에이전트가 답했는지 */
  agent?: string
  /**
   * 화면이 그릴 구조화 값 (점수, 구역별 수치, 표 행 등).
   * mock 은 `backend/features/<기능>/mock.json` 의 `beats[].data`,
   * 실제 모델은 응답에서 뽑은 JSON 이 여기로 온다.
   * 결과가 텍스트뿐이면 채점에서 깎인다. 표·카드·게이지는 이 값으로 그린다.
   */
  data?: Record<string, unknown>
  /** 모델이 호출한 도구 이름 */
  toolCalls?: string[]
  usage?: Record<string, unknown>
}

/** 데모 구간 하나. backend/features/<기능>/mock.json 에서 온다. */
export interface Beat {
  id: string
  text?: string
  /**
   * 이 구간 직전에 사용자가 하는 말. `#play` 가 이 문장을 서버에 보낸다.
   * live(Bedrock) 녹화에서 모델이 대본대로 반응하게 하려면 채운다. 없으면 '다음'.
   * 0번 구간은 start 응답이라 쓰지 않는다. mock 모드는 이 값을 무시하고 대본을 재생한다.
   */
  say?: string
  delayMs?: number
  data?: Record<string, unknown>
  index?: number
  total?: number
  done?: boolean
}

export interface BeatsResponse {
  feature: string
  beats: Beat[]
  ids: string[]
}

/** JSON 으로 올려 보내는 파일 하나. 검증은 서버가 다시 한다 */
export interface Attachment {
  name: string
  mimeType: string
  /** 접두사(`data:...;base64,`) 없는 본문만 */
  dataBase64: string
}

/**
 * 텍스트 외의 입력. 셋 다 선택이다.
 *   payload — 폼 값·선택지·좌표 같은 구조화 입력
 *   files   — 사진·CSV·PDF 첨부
 */
export interface TurnInput {
  payload?: Record<string, unknown>
  files?: Attachment[]
}

export interface HealthResponse {
  status: string
  /** mock 이면 Bedrock 을 호출하지 않는다 */
  mode: 'mock' | 'bedrock'
  mockForced: boolean
  modelConfigured: boolean
  region: string
  profile: string | null
  features: string[]
  beats: Record<string, string[]>
}
