import { describe, expect, it } from 'vitest'
import { createRemittanceCalculator } from './createRemittanceCalculator'

describe('createRemittanceCalculator', () => {
  describe('해외송금 계산기 시나리오', () => {
    it('USD 기준환율 1400, 스프레드 1.75%, 우대 80%, 외화송금액 1000이면 적용환율 1404.9, 송금원금 1404900, 총출금액 1417900을 반환한다', () => {
      const result = createRemittanceCalculator({
        currencyCode: 'USD',
        foreignAmount: 1000,
        baseRate: 1400,
        spreadRate: 1.75,
        preferentialRate: 80,
        remittanceFee: 5000,
        cableFee: 8000,
      })

      expect(result.validation.valid).toBe(true)
      expect(result.appliedRate).toBe(1404.9)
      expect(result.principalKRW).toBe(1404900)
      expect(result.remittanceFee).toBe(5000)
      expect(result.cableFee).toBe(8000)
      expect(result.totalWithdrawalKRW).toBe(1417900)
    })

    it('JPY 100엔 단위: 기준환율 980, 스프레드 1.75%, 우대 0%, 외화송금액 100000이면 적용환율 997.15, 송금원금 997150, 총출금액 1005150을 반환한다', () => {
      const result = createRemittanceCalculator({
        currencyCode: 'JPY',
        foreignAmount: 100000,
        baseRate: 980,
        spreadRate: 1.75,
        preferentialRate: 0,
        remittanceFee: 3000,
        cableFee: 5000,
      })

      expect(result.validation.valid).toBe(true)
      expect(result.appliedRate).toBe(997.15)
      expect(result.principalKRW).toBe(997150)
      expect(result.totalWithdrawalKRW).toBe(1005150)
    })

    it('우대율 100%이면 적용환율은 기준환율과 같다', () => {
      const result = createRemittanceCalculator({
        currencyCode: 'USD',
        foreignAmount: 500,
        baseRate: 1400,
        spreadRate: 1.75,
        preferentialRate: 100,
        remittanceFee: 2000,
        cableFee: 3000,
      })

      expect(result.validation.valid).toBe(true)
      expect(result.appliedRate).toBe(1400)
      expect(result.principalKRW).toBe(700000)
      expect(result.totalWithdrawalKRW).toBe(705000)
    })

    it('송금수수료와 전신료가 모두 0이면 총출금액은 송금원금과 같다', () => {
      const result = createRemittanceCalculator({
        currencyCode: 'USD',
        foreignAmount: 1000,
        baseRate: 1400,
        spreadRate: 1.75,
        preferentialRate: 80,
        remittanceFee: 0,
        cableFee: 0,
      })

      expect(result.validation.valid).toBe(true)
      expect(result.principalKRW).toBe(1404900)
      expect(result.remittanceFee).toBe(0)
      expect(result.cableFee).toBe(0)
      expect(result.totalWithdrawalKRW).toBe(1404900)
    })
  })

  describe('Boundary Test', () => {
    it('스프레드율 0%, 우대율 0%이면 적용환율은 기준환율과 같다', () => {
      const result = createRemittanceCalculator({
        currencyCode: 'USD',
        foreignAmount: 100,
        baseRate: 1300,
        spreadRate: 0,
        preferentialRate: 0,
        remittanceFee: 1000,
        cableFee: 1000,
      })

      expect(result.validation.valid).toBe(true)
      expect(result.appliedRate).toBe(1300)
    })

    it('기준환율 최소 경계값(0.01)에서도 정상 계산된다', () => {
      const result = createRemittanceCalculator({
        currencyCode: 'USD',
        foreignAmount: 100,
        baseRate: 0.01,
        spreadRate: 1.75,
        preferentialRate: 0,
        remittanceFee: 0,
        cableFee: 0,
      })

      expect(result.validation.valid).toBe(true)
      expect(result.appliedRate).toBe(0.01)
    })
  })

  describe('Validation', () => {
    it('외화송금액이 0이면 validation.valid는 false이고 모든 결과 필드는 null이다', () => {
      const result = createRemittanceCalculator({
        currencyCode: 'USD',
        foreignAmount: 0,
        baseRate: 1400,
        spreadRate: 1.75,
        preferentialRate: 80,
        remittanceFee: 5000,
        cableFee: 8000,
      })

      expect(result.validation.valid).toBe(false)
      expect(result.appliedRate).toBeNull()
      expect(result.principalKRW).toBeNull()
      expect(result.remittanceFee).toBeNull()
      expect(result.cableFee).toBeNull()
      expect(result.totalWithdrawalKRW).toBeNull()
    })

    it('기준환율이 0이면 validation.valid는 false이다', () => {
      const result = createRemittanceCalculator({
        currencyCode: 'USD',
        foreignAmount: 1000,
        baseRate: 0,
        spreadRate: 1.75,
        preferentialRate: 80,
        remittanceFee: 5000,
        cableFee: 8000,
      })

      expect(result.validation.valid).toBe(false)
    })

    it('스프레드율이 음수이면 validation.valid는 false이다', () => {
      const result = createRemittanceCalculator({
        currencyCode: 'USD',
        foreignAmount: 1000,
        baseRate: 1400,
        spreadRate: -1,
        preferentialRate: 80,
        remittanceFee: 5000,
        cableFee: 8000,
      })

      expect(result.validation.valid).toBe(false)
    })

    it('우대율이 100을 초과하면 validation.valid는 false이다', () => {
      const result = createRemittanceCalculator({
        currencyCode: 'USD',
        foreignAmount: 1000,
        baseRate: 1400,
        spreadRate: 1.75,
        preferentialRate: 150,
        remittanceFee: 5000,
        cableFee: 8000,
      })

      expect(result.validation.valid).toBe(false)
    })

    it('송금수수료가 음수이면 validation.valid는 false이다', () => {
      const result = createRemittanceCalculator({
        currencyCode: 'USD',
        foreignAmount: 1000,
        baseRate: 1400,
        spreadRate: 1.75,
        preferentialRate: 80,
        remittanceFee: -100,
        cableFee: 8000,
      })

      expect(result.validation.valid).toBe(false)
    })

    it('전신료가 음수이면 validation.valid는 false이다', () => {
      const result = createRemittanceCalculator({
        currencyCode: 'USD',
        foreignAmount: 1000,
        baseRate: 1400,
        spreadRate: 1.75,
        preferentialRate: 80,
        remittanceFee: 5000,
        cableFee: -100,
      })

      expect(result.validation.valid).toBe(false)
    })

    it('외화송금액이 NaN이면 validation.valid는 false이다', () => {
      const result = createRemittanceCalculator({
        currencyCode: 'USD',
        foreignAmount: NaN,
        baseRate: 1400,
        spreadRate: 1.75,
        preferentialRate: 80,
        remittanceFee: 5000,
        cableFee: 8000,
      })

      expect(result.validation.valid).toBe(false)
    })

    it('기준환율이 Infinity이면 validation.valid는 false이다', () => {
      const result = createRemittanceCalculator({
        currencyCode: 'USD',
        foreignAmount: 1000,
        baseRate: Infinity,
        spreadRate: 1.75,
        preferentialRate: 80,
        remittanceFee: 5000,
        cableFee: 8000,
      })

      expect(result.validation.valid).toBe(false)
    })
  })
})
