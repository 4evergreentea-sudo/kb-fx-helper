import { describe, expect, it } from 'vitest'
import { roundToTwo } from './roundToTwo'

describe('roundToTwo', () => {
  describe('기본 동작', () => {
    it('소수점 셋째 자리 이하 값을 반올림하여 둘째 자리까지 반환한다', () => {
      expect(roundToTwo(1.236)).toBe(1.24)
    })

    it('이미 소수점 둘째 자리인 값은 그대로 반환한다', () => {
      expect(roundToTwo(3.14)).toBe(3.14)
    })

    it('정수를 입력하면 그대로 반환한다', () => {
      expect(roundToTwo(5)).toBe(5)
    })

    it('음수도 동일한 규칙으로 반올림한다', () => {
      expect(roundToTwo(-1.236)).toBe(-1.24)
    })
  })

  describe('Boundary Test', () => {
    it('0을 입력하면 0을 반환한다', () => {
      expect(roundToTwo(0)).toBe(0)
    })

    it('소수점 셋째 자리가 정확히 5인 값(1.115)은 1.12로 올림된다', () => {
      expect(roundToTwo(1.115)).toBe(1.12)
    })
  })

  describe('Regression Test', () => {
    it('부동소수점 표현 오차로 인해 1.005는 1.01이 아닌 1로 반올림되는 현재 동작을 고정한다', () => {
      expect(roundToTwo(1.005)).toBe(1)
    })

    it('0.1 + 0.2 계열의 부동소수점 오차가 있는 값에서도 안정적으로 동작한다', () => {
      expect(roundToTwo(0.1 + 0.2)).toBe(0.3)
    })
  })
})
