import { describe, expect, it } from 'vitest'
import { parseFormattedNumber } from './parseFormattedNumber'

describe('parseFormattedNumber', () => {
  it('콤마가 포함된 정수 문자열을 숫자로 변환한다', () => {
    expect(parseFormattedNumber('10,000')).toBe(10000)
    expect(parseFormattedNumber('1,000,000')).toBe(1000000)
  })

  it('콤마와 소수부가 함께 있는 문자열을 숫자로 변환한다', () => {
    expect(parseFormattedNumber('1,234.56')).toBe(1234.56)
    expect(parseFormattedNumber('1,345.15')).toBe(1345.15)
  })

  it('콤마가 없는 일반 숫자 문자열도 그대로 변환한다', () => {
    expect(parseFormattedNumber('500')).toBe(500)
  })

  it('빈 문자열은 null을 반환한다', () => {
    expect(parseFormattedNumber('')).toBeNull()
  })

  it('숫자로 변환할 수 없는 값은 null을 반환한다(NaN 방어)', () => {
    expect(parseFormattedNumber('abc')).toBeNull()
    expect(parseFormattedNumber(',,,')).toBeNull()
  })

  it('Infinity 문자열은 null을 반환한다(Infinity 방어)', () => {
    expect(parseFormattedNumber('Infinity')).toBeNull()
    expect(parseFormattedNumber('-Infinity')).toBeNull()
  })

  it('음수 문자열도 숫자로 변환한다(음수 허용 여부는 필드 검증 규칙에서 처리)', () => {
    expect(parseFormattedNumber('-1,000')).toBe(-1000)
  })
})
