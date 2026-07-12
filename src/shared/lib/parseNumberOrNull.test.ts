import { describe, expect, it } from 'vitest'
import { parseNumberOrNull } from './parseNumberOrNull'

describe('parseNumberOrNull', () => {
  describe('기본 동작', () => {
    it('정상적인 숫자 문자열을 숫자로 변환한다', () => {
      expect(parseNumberOrNull('1234.5')).toBe(1234.5)
    })

    it('음수 문자열을 숫자로 변환한다', () => {
      expect(parseNumberOrNull('-42')).toBe(-42)
    })

    it('앞뒤 공백이 있는 숫자 문자열은 trim 후 변환한다', () => {
      expect(parseNumberOrNull('  100  ')).toBe(100)
    })

    it('0을 나타내는 문자열은 0을 반환한다', () => {
      expect(parseNumberOrNull('0')).toBe(0)
    })
  })

  describe('Validation', () => {
    it('빈 문자열이면 null을 반환한다', () => {
      expect(parseNumberOrNull('')).toBeNull()
    })

    it('공백만 있는 문자열이면 null을 반환한다', () => {
      expect(parseNumberOrNull('   ')).toBeNull()
    })

    it('숫자로 변환할 수 없는 문자열(NaN)이면 null을 반환한다', () => {
      expect(parseNumberOrNull('abc')).toBeNull()
    })

    it('Infinity 문자열이면 null을 반환한다', () => {
      expect(parseNumberOrNull('Infinity')).toBeNull()
    })

    it('-Infinity 문자열이면 null을 반환한다', () => {
      expect(parseNumberOrNull('-Infinity')).toBeNull()
    })
  })

  describe('Boundary Test', () => {
    it('소수점이 있는 경계값 문자열도 정확히 변환한다', () => {
      expect(parseNumberOrNull('0.01')).toBe(0.01)
    })
  })
})
