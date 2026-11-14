/**
 * 표 부품. 결과가 목록·순위인 기능(대시보드형)이 쓴다.
 *
 * 열을 주지 않아도 서버가 보낸 배열을 그대로 그려야 한다. 그래야 `mock.json` 의
 * `data` 에 배열만 적어 두고 백엔드 로직 없이 화면을 끝까지 만들 수 있다.
 */
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataTable } from './primitives'

const rows = [
  { zone: 'A', score: 81, risk: true },
  { zone: 'B', score: 44, risk: false },
]

describe('DataTable', () => {
  it('열을 주지 않으면 첫 행의 키를 그대로 머리로 쓴다', () => {
    render(<DataTable rows={rows} />)
    const headers = [...document.querySelectorAll('#table thead th')].map((th) => th.textContent)
    expect(headers).toEqual(['zone', 'score', 'risk'])
    expect(document.querySelectorAll('#table tbody tr')).toHaveLength(2)
  })

  it('숫자 칸은 오른쪽으로 맞춘다', () => {
    render(<DataTable rows={rows} />)
    const cells = [...document.querySelectorAll('[data-row="0"] td')]
    expect(cells[0]).not.toHaveClass('num') // zone (문자)
    expect(cells[1]).toHaveClass('num') // score (숫자)
  })

  it('markKey 가 참인 행을 강조한다', () => {
    render(<DataTable rows={rows} markKey="risk" />)
    expect(document.querySelector('[data-row="0"]')).toHaveAttribute('data-row-mark', 'true')
    expect(document.querySelector('[data-row="1"]')).toHaveAttribute('data-row-mark', 'false')
  })

  it('열 이름을 바꿔 줄 수 있고 빈 값은 — 로 그린다', () => {
    render(
      <DataTable
        rows={[{ zone: 'A', score: null }]}
        columns={[
          { key: 'zone', label: '구역' },
          { key: 'score', label: '점수' },
        ]}
      />,
    )
    const headers = [...document.querySelectorAll('#table thead th')].map((th) => th.textContent)
    expect(headers).toEqual(['구역', '점수'])
    expect(document.querySelectorAll('[data-row="0"] td')[1]).toHaveTextContent('—')
  })

  it('행이 없으면 안내 문구만 보인다', () => {
    render(<DataTable rows={[]} empty="값이 없습니다" />)
    expect(document.querySelector('#table')).toBeNull()
    expect(document.body).toHaveTextContent('값이 없습니다')
  })
})
