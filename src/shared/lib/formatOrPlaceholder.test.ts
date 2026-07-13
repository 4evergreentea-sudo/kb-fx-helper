import { describe, expect, it } from 'vitest'
import { formatOrPlaceholder } from './formatOrPlaceholder'

describe('formatOrPlaceholder', () => {
  it('값이 있으면 그대로 반환한다', () => {
    expect(formatOrPlaceholder('홍길동')).toBe('홍길동')
  })

  it('빈 문자열이면 기본 대체 문구(미입력)를 반환한다', () => {
    expect(formatOrPlaceholder('')).toBe('미입력')
  })

  it('공백만 있는 문자열도 미입력으로 처리한다', () => {
    expect(formatOrPlaceholder('   ')).toBe('미입력')
  })

  it('대체 문구를 지정하면 그 값을 사용한다', () => {
    expect(formatOrPlaceholder('', '없음')).toBe('없음')
  })
})
