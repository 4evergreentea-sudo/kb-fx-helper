import { describe, expect, it } from 'vitest'
import { createExchangeCalculator } from './createExchangeCalculator'

describe('createExchangeCalculator', () => {
  describe('환전 계산기 시나리오', () => {
    it('USD 기준환율 1540, 스프레드 1.75%, 우대 80%, buy 거래 시 적용환율 1545.39, 원화금액 772695를 반환한다', () => {
      const result = createExchangeCalculator({
        currencyCode: 'USD',
        baseRate: 1540,
        spreadRate: 1.75,
        preferentialRate: 80,
        transactionType: 'buy',
        amount: 500,
      })

      expect(result.appliedRate).toBe(1545.39)
      expect(result.krwAmount).toBe(772695)
      expect(result.validation.valid).toBe(true)
    })

    it('JPY 기준환율 980, 스프레드 1.75%, 우대 0%, buy 거래 시 적용환율 997.15, 원화금액 997150을 반환한다', () => {
      const result = createExchangeCalculator({
        currencyCode: 'JPY',
        baseRate: 980,
        spreadRate: 1.75,
        preferentialRate: 0,
        transactionType: 'buy',
        amount: 100000,
      })

      expect(result.appliedRate).toBe(997.15)
      expect(result.krwAmount).toBe(997150)
      expect(result.validation.valid).toBe(true)
    })

    it('USD 기준환율 1540, 스프레드 1.75%, 우대 0%, sell 거래 시 적용환율 1513.05, 원화금액 756525를 반환한다', () => {
      const result = createExchangeCalculator({
        currencyCode: 'USD',
        baseRate: 1540,
        spreadRate: 1.75,
        preferentialRate: 0,
        transactionType: 'sell',
        amount: 500,
      })

      expect(result.appliedRate).toBe(1513.05)
      expect(result.krwAmount).toBe(756525)
      expect(result.validation.valid).toBe(true)
    })
  })

  describe('Validation', () => {
    it('기준환율이 0이면 validation.valid는 false이고 appliedRate와 krwAmount는 null이다', () => {
      const result = createExchangeCalculator({
        currencyCode: 'USD',
        baseRate: 0,
        spreadRate: 1.75,
        preferentialRate: 0,
        transactionType: 'buy',
        amount: 500,
      })

      expect(result.validation.valid).toBe(false)
      expect(result.appliedRate).toBeNull()
      expect(result.krwAmount).toBeNull()
    })

    it('금액이 0이면 validation.valid는 false이고 appliedRate와 krwAmount는 null이다', () => {
      const result = createExchangeCalculator({
        currencyCode: 'USD',
        baseRate: 1540,
        spreadRate: 1.75,
        preferentialRate: 0,
        transactionType: 'buy',
        amount: 0,
      })

      expect(result.validation.valid).toBe(false)
      expect(result.appliedRate).toBeNull()
      expect(result.krwAmount).toBeNull()
    })
  })
})
