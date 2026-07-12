import { describe, expect, it } from 'vitest'
import { formatTransactionDateTime } from './formatTransactionDateTime'

describe('formatTransactionDateTime', () => {
  it('ISO 8601 문자열을 "YYYY-MM-DD HH:mm:ss" 형식으로 포맷한다', () => {
    const iso = new Date(2026, 6, 12, 14, 30, 5).toISOString()

    expect(formatTransactionDateTime(iso)).toBe('2026-07-12 14:30:05')
  })

  it('한 자리 월/일/시/분/초를 0으로 패딩한다', () => {
    const iso = new Date(2026, 0, 2, 3, 4, 5).toISOString()

    expect(formatTransactionDateTime(iso)).toBe('2026-01-02 03:04:05')
  })

  it('잘못된 날짜 문자열은 "-"를 반환한다', () => {
    expect(formatTransactionDateTime('not-a-date')).toBe('-')
  })
})
