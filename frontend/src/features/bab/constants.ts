/**
 * profiles.json 에서 화면이 미리 알아야 하는 값.
 *
 * 서버는 구간 data 로 대부분을 보내 주지만, 첫 화면(세션 전)과 선택지 목록은 서버 응답보다
 * 먼저 그려야 하므로 여기 둔다. 원본은 backend/features/bab/profiles.json 이다. 바뀌면 함께 고친다.
 */
import type { ButtonKey, ItemKey, MoodKey, ToneKey } from './types'

export const CHILD_NAME = '민지'

export const MOOD_OPTIONS: { key: MoodKey; emoji: string; label: string }[] = [
  { key: 'good', emoji: '😊', label: '좋아' },
  { key: 'ok', emoji: '🙂', label: '괜찮아' },
  { key: 'tired', emoji: '😪', label: '피곤해' },
  { key: 'busy', emoji: '😵', label: '바빠' },
  { key: 'sick', emoji: '🤒', label: '아파' },
  { key: 'custom', emoji: '✏️', label: '직접 입력' },
]

export const ITEMS: Record<ItemKey, { emoji: string; label: string }> = {
  meal: { emoji: '🍚', label: '밥' },
  home: { emoji: '🏠', label: '귀가' },
  mood: { emoji: '🙂', label: '기분' },
  note: { emoji: '💬', label: '한마디' },
}

export const RECIPIENTS: {
  id: string
  name: string
  emoji: string
  items: ItemKey[]
  tone: string
  channel: 'kakao' | 'sms'
}[] = [
  { id: 'mom', name: '엄마', emoji: '👩', items: ['meal', 'home', 'mood'], tone: '다정하고 구체적으로, 반말', channel: 'kakao' },
  { id: 'dad', name: '아빠', emoji: '👨', items: ['home'], tone: '짧게, 존댓말', channel: 'sms' },
]

export const PARENT_BUTTONS: { key: ButtonKey; emoji: string; label: string }[] = [
  { key: 'heart', emoji: '❤️', label: '잘 받았어' },
  { key: 'call', emoji: '📞', label: '전화할게' },
  { key: 'ate', emoji: '🍚', label: '나도 밥 먹었어' },
  { key: 'hospital', emoji: '🏥', label: '병원 다녀왔어' },
  { key: 'fine', emoji: '🙂', label: '오늘 괜찮아' },
]

/** 구간별 사용자 발화. 서버 beats[].say 가 있으면 그쪽을 쓴다 (mock.json 과 같은 문장) */
export const SAY: Record<string, string> = {
  upload: '점심이랑 현관 사진 올릴게, 오늘 좀 피곤해',
  judge: '이 사진으로 오늘 안부 정리해 줘',
  confirm: '맞아, 이대로 보내',
  compose: '엄마랑 아빠한테 보낼 메시지 만들어 줘',
  deliver: '보내기',
  react: '(엄마) 나도 밥 먹었어',
  reply: '다음',
}

export const PHOTO_EMOJI: Record<string, string> = { 점심: '🍲', 현관: '🚪' }

// 받는 분별 말투 칩 (R9). 말투는 "어떻게 쓸지"만 바꾸고, 무엇이 가는지는 바꾸지 않는다
export const TONE_OPTIONS: { key: ToneKey; label: string }[] = [
  { key: 'warm', label: '다정하게' },
  { key: 'brief', label: '짧게' },
  { key: 'formal', label: '존댓말' },
  { key: 'dialect', label: '사투리' },
  { key: 'cheerful', label: '밝게' },
]
export const MAX_VOICE = 3 // 서버 MAX_VOICE_ITEMS 와 같다
