import { describe, expect, it } from 'vitest'
import { formatNumericInput } from './formatNumericInput'

describe('formatNumericInput', () => {
  it('10000을 10,000으로 변환한다', () => {
    expect(formatNumericInput('10000')).toBe('10,000')
  })

  it('1000000을 1,000,000으로 변환한다', () => {
    expect(formatNumericInput('1000000')).toBe('1,000,000')
  })

  it('세 자리 미만 정수는 콤마를 붙이지 않는다', () => {
    expect(formatNumericInput('500')).toBe('500')
    expect(formatNumericInput('12')).toBe('12')
  })

  it('콤마가 포함된 입력을 다시 넣어도 소수부를 유지한 채 동일한 형태를 반환한다', () => {
    expect(formatNumericInput('1,234.56')).toBe('1,234.56')
  })

  it('소수부가 있는 정수 그룹에도 콤마를 적용한다', () => {
    expect(formatNumericInput('1234567.89')).toBe('1,234,567.89')
  })

  it('빈 문자열은 빈 문자열을 그대로 반환한다', () => {
    expect(formatNumericInput('')).toBe('')
  })

  it('숫자가 아닌 문자는 제거한다', () => {
    expect(formatNumericInput('10a0b0')).toBe('1,000')
    expect(formatNumericInput('₩10,000원')).toBe('10,000')
  })

  it('숫자로 변환할 수 없는 입력(문자만)은 빈 문자열을 반환한다', () => {
    expect(formatNumericInput('abc')).toBe('')
  })

  it('앞자리 불필요한 0을 제거한다', () => {
    expect(formatNumericInput('0100')).toBe('100')
  })

  it('단독 0은 그대로 유지한다', () => {
    expect(formatNumericInput('0')).toBe('0')
  })

  it('맨 앞의 음수 기호는 유지하고 나머지 부호 문자는 제거한다(허용 여부는 검증 규칙에 맡김)', () => {
    expect(formatNumericInput('-10000')).toBe('-10,000')
  })

  it('두 번째 이후의 소수점은 무시한다', () => {
    expect(formatNumericInput('1.234.56')).toBe('1.23456')
  })

  it('소수점만 입력된 경우 정수부 없이 그대로 반환한다', () => {
    expect(formatNumericInput('.56')).toBe('.56')
  })
})
