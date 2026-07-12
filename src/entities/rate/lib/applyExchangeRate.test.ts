import { describe, expect, it } from 'vitest'
import { applyExchangeRate } from './applyExchangeRate'
import {
  validateBaseRate,
  validatePreferentialRate,
  validateSpreadRate,
} from './validate'

describe('applyExchangeRate', () => {
  describe('환전 계산기 시나리오', () => {
    it('USD 기준환율 1540, 스프레드 1.75%, 우대 0%, buy 거래 시 적용환율은 1566.95이다', () => {
      const result = applyExchangeRate({
        baseRate: 1540,
        spreadRate: 1.75,
        preferentialRate: 0,
        transactionType: 'buy',
      })

      expect(result).toBe(1566.95)
    })

    it('USD 기준환율 1540, 스프레드 1.75%, 우대 80%, buy 거래 시 적용환율은 1545.39이다', () => {
      const result = applyExchangeRate({
        baseRate: 1540,
        spreadRate: 1.75,
        preferentialRate: 80,
        transactionType: 'buy',
      })

      expect(result).toBe(1545.39)
    })

    it('USD 기준환율 1540, 스프레드 1.75%, 우대 0%, sell 거래 시 적용환율은 1513.05이다', () => {
      const result = applyExchangeRate({
        baseRate: 1540,
        spreadRate: 1.75,
        preferentialRate: 0,
        transactionType: 'sell',
      })

      expect(result).toBe(1513.05)
    })

    it('JPY 기준환율 980, 스프레드 1.75%, 우대 0%, buy 거래 시 적용환율은 997.15이다', () => {
      const result = applyExchangeRate({
        baseRate: 980,
        spreadRate: 1.75,
        preferentialRate: 0,
        transactionType: 'buy',
      })

      expect(result).toBe(997.15)
    })

    it('우대율이 100%이면 스프레드가 완전히 상쇄되어 적용환율이 기준환율(1540)과 같아진다', () => {
      const buyResult = applyExchangeRate({
        baseRate: 1540,
        spreadRate: 1.75,
        preferentialRate: 100,
        transactionType: 'buy',
      })
      const sellResult = applyExchangeRate({
        baseRate: 1540,
        spreadRate: 1.75,
        preferentialRate: 100,
        transactionType: 'sell',
      })

      expect(buyResult).toBe(1540)
      expect(sellResult).toBe(1540)
    })
  })

  describe('Validation', () => {
    it('validateBaseRate: 기준환율이 0이면 valid: false와 메시지를 반환한다', () => {
      const result = validateBaseRate(0)

      expect(result.valid).toBe(false)
      expect(result.message).toBe('기준환율은 0보다 커야 합니다.')
    })

    it('validateBaseRate: 기준환율이 음수이면 valid: false와 메시지를 반환한다', () => {
      const result = validateBaseRate(-1540)

      expect(result.valid).toBe(false)
      expect(result.message).toBe('기준환율은 0보다 커야 합니다.')
    })

    it('validateSpreadRate: 스프레드율이 음수이면 valid: false와 메시지를 반환한다', () => {
      const result = validateSpreadRate(-1.75)

      expect(result.valid).toBe(false)
      expect(result.message).toBe('스프레드율은 0 이상이어야 합니다.')
    })

    it('validatePreferentialRate: 우대율이 0보다 작으면 valid: false와 메시지를 반환한다', () => {
      const result = validatePreferentialRate(-1)

      expect(result.valid).toBe(false)
      expect(result.message).toBe('우대율은 0 이상 100 이하이어야 합니다.')
    })

    it('validatePreferentialRate: 우대율이 100보다 크면 valid: false와 메시지를 반환한다', () => {
      const result = validatePreferentialRate(101)

      expect(result.valid).toBe(false)
      expect(result.message).toBe('우대율은 0 이상 100 이하이어야 합니다.')
    })
  })

  describe('Boundary Test', () => {
    it('우대율이 하한값 0%여도 정상적으로 계산된다', () => {
      const result = applyExchangeRate({
        baseRate: 1540,
        spreadRate: 1.75,
        preferentialRate: 0,
        transactionType: 'buy',
      })

      expect(result).toBe(1566.95)
    })

    it('우대율이 상한값 100%여도 정상적으로 계산된다', () => {
      const result = applyExchangeRate({
        baseRate: 1540,
        spreadRate: 1.75,
        preferentialRate: 100,
        transactionType: 'buy',
      })

      expect(result).toBe(1540)
    })

    it('스프레드율이 하한값 0%여도 정상적으로 계산된다', () => {
      const result = applyExchangeRate({
        baseRate: 1540,
        spreadRate: 0,
        preferentialRate: 0,
        transactionType: 'buy',
      })

      expect(result).toBe(1540)
    })

    it('기준환율이 0보다 아주 작은 양수(0.01)여도 정상적으로 계산된다', () => {
      const result = applyExchangeRate({
        baseRate: 0.01,
        spreadRate: 1.75,
        preferentialRate: 0,
        transactionType: 'buy',
      })

      expect(result).toBe(0.01)
    })
  })

  describe('Regression Test', () => {
    it('buy 거래는 "기준환율 × (1 + 스프레드 × (1 - 우대))" 공식을 그대로 따른다', () => {
      const baseRate = 1234.56
      const spreadRate = 2.5
      const preferentialRate = 30

      const result = applyExchangeRate({
        baseRate,
        spreadRate,
        preferentialRate,
        transactionType: 'buy',
      })
      const expected =
        Math.round(
          baseRate * (1 + (spreadRate / 100) * (1 - preferentialRate / 100)) * 100,
        ) / 100

      expect(result).toBe(expected)
    })

    it('sell 거래는 "기준환율 × (1 - 스프레드 × (1 - 우대))" 공식을 그대로 따른다', () => {
      const baseRate = 1234.56
      const spreadRate = 2.5
      const preferentialRate = 30

      const result = applyExchangeRate({
        baseRate,
        spreadRate,
        preferentialRate,
        transactionType: 'sell',
      })
      const expected =
        Math.round(
          baseRate * (1 - (spreadRate / 100) * (1 - preferentialRate / 100)) * 100,
        ) / 100

      expect(result).toBe(expected)
    })

    it('부동소수점 오차가 발생하기 쉬운 입력에서도 소수점 둘째 자리까지 정확히 반환한다', () => {
      const result = applyExchangeRate({
        baseRate: 1112.33,
        spreadRate: 1.5,
        preferentialRate: 33,
        transactionType: 'buy',
      })

      expect(result).toBe(1123.51)
      expect(Number.isInteger(result * 100)).toBe(true)
    })

    it('기준환율과 스프레드율이 동시에 유효하지 않으면 applyExchangeRate가 두 에러 메시지를 모두 포함해 에러를 던진다', () => {
      expect(() =>
        applyExchangeRate({
          baseRate: -1,
          spreadRate: -1,
          preferentialRate: 0,
          transactionType: 'buy',
        }),
      ).toThrowError('기준환율은 0보다 커야 합니다. 스프레드율은 0 이상이어야 합니다.')
    })
  })
})
