/**
 * 기능 목록.
 *
 * 새 기능을 추가하는 법
 *   1. src/features/<이름>/index.tsx 에 View 를 만든다
 *   2. 아래 배열에 한 줄 추가한다
 *
 * 한 줄만 고치므로 두 사람이 같은 파일을 동시에 건드려도 충돌이 거의 없다.
 * 백엔드 쪽 짝은 backend/features/<이름>/ 이고, 이름이 같아야 한다.
 */
import type { ComponentType } from 'react'
import type { Layout } from '../app/Shell'
import { SampleView } from './sample'
import { BabView } from './bab'

export interface FeatureDef {
  /** 백엔드 폴더 이름과 같아야 한다 (/api/<name>/…) */
  name: string
  label: string
  subtitle?: string
  layout: Layout
  View: ComponentType
}

export const features: FeatureDef[] = [
  {
    name: 'sample',
    label: '예시 에이전트',
    subtitle: '입력창으로 직접 대화하고, #play 로 같은 흐름을 재현합니다.',
    layout: 'phone',
    View: SampleView,
  },
  { name: 'bab', label: '밥은 먹었니', subtitle: '사진 한 번, 기분 버튼 하나로 엄마·아빠에게 각자 맞는 안부', layout: 'phone', View: BabView },
]

export function findFeature(name?: string | null): FeatureDef {
  return features.find((f) => f.name === name) ?? features[0]
}
