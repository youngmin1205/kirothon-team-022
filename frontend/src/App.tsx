/**
 * 어떤 기능 화면을 보여줄지 고른다.
 *
 * `?feature=<이름>` 으로 전환한다. 기본은 registry 의 첫 항목이다.
 * 당일 기능이 여러 개가 되면 녹화 설정에서 주소로 골라 쓸 수 있다.
 */
import { findFeature } from './features/registry'

export default function App() {
  const name = new URLSearchParams(window.location.search).get('feature')
  const feature = findFeature(name)
  const { View } = feature
  return <View />
}
