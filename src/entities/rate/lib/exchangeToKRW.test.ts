import { describe, expect, it } from 'vitest'
import { exchangeToKRW } from './exchangeToKRW'
import { validateAmount } from './validate'

describe('exchangeToKRW', () => {
  describe('환전 계산기 시나리오', () => {
    it('JPY 100000엔을 적용환율 997.15, 통화단위 100으로 환전하면 997150원이다', () => {
      const result = exchangeToKRW({
        amount: 100000,
        appliedRate: 997.15,
        unit: 100,
      })

      expect(result).toBe(997150)
    })
  })

  describe('기본 동작', () => {
    it('외화금액을 통화단위로 나눈 뒤 적용환율을 곱해 원화금액을 계산한다', () => {
      const result = exchangeToKRW({
        amount: 200,
        appliedRate: 1500,
        unit: 100,
      })

      expect(result).toBe(3000)
    })

    it('통화단위가 1인 경우 외화금액에 적용환율을 곱한 값과 같다', () => {
      const result = exchangeToKRW({
        amount: 100,
        appliedRate: 1350.5,
        unit: 1,
      })

      expect(result).toBe(135050)
    })

    it('계산 결과를 정수로 반올림하여 반환한다', () => {
      const result = exchangeToKRW({
        amount: 3,
        appliedRate: 1000,
        unit: 7,
      })

      expect(result).toBe(Math.round((3 / 7) * 1000))
      expect(Number.isInteger(result)).toBe(true)
    })
  })

  describe('Validation', () => {
    it('validateAmount: 금액이 0이면 valid: false와 메시지를 반환한다', () => {
      const result = validateAmount(0)

      expect(result.valid).toBe(false)
      expect(result.message).toBe('금액은 0보다 커야 합니다.')
    })

    it('validateAmount: 금액이 음수이면 valid: false와 메시지를 반환한다', () => {
      const result = validateAmount(-100000)

      expect(result.valid).toBe(false)
      expect(result.message).toBe('금액은 0보다 커야 합니다.')
    })
  })

  describe('Boundary Test', () => {
    it('금액이 0보다 아주 작은 양수(0.01)여도 정상적으로 계산된다', () => {
      const result = exchangeToKRW({
        amount: 0.01,
        appliedRate: 1500,
        unit: 1,
      })

      expect(result).toBe(15)
    })

    it('계산 결과 소수부가 정확히 0.5인 경우 Math.round의 반올림 규칙을 따른다', () => {
      const result = exchangeToKRW({
        amount: 1,
        appliedRate: 2.5,
        unit: 1,
      })

      expect(result).toBe(3)
    })
  })

  describe('Regression Test', () => {
    it('동일한 입력에 대해 항상 같은 결과를 반환한다(순수 함수 검증)', () => {
      const params = { amount: 100000, appliedRate: 997.15, unit: 100 }

      const first = exchangeToKRW(params)
      const second = exchangeToKRW(params)

      expect(first).toBe(second)
      expect(first).toBe(997150)
    })

    it('적용환율에 소수점이 있는 경우에도 반올림 오차 없이 계산한다', () => {
      const result = exchangeToKRW({
        amount: 12345,
        appliedRate: 1113.27,
        unit: 100,
      })

      expect(result).toBe(Math.round((12345 / 100) * 1113.27))
    })

    it('금액이 0 이하이면 exchangeToKRW는 validateAmount의 메시지로 에러를 던진다', () => {
      expect(() =>
        exchangeToKRW({ amount: 0, appliedRate: 1500, unit: 1 }),
      ).toThrowError('금액은 0보다 커야 합니다.')
    })
  })
})
