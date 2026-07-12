import { describe, expect, it } from 'vitest'
import { calculateTotalWithdrawal } from './calculateTotalWithdrawal'

describe('calculateTotalWithdrawal', () => {
  describe('기본 동작', () => {
    it('송금원금, 송금수수료, 전신료를 합산한다', () => {
      expect(
        calculateTotalWithdrawal({
          principalKRW: 1404900,
          remittanceFee: 5000,
          cableFee: 8000,
        }),
      ).toBe(1417900)
    })
  })

  describe('Boundary Test', () => {
    it('송금수수료가 0이면 원금과 전신료만 합산한다', () => {
      expect(
        calculateTotalWithdrawal({
          principalKRW: 1000000,
          remittanceFee: 0,
          cableFee: 8000,
        }),
      ).toBe(1008000)
    })

    it('전신료가 0이면 원금과 송금수수료만 합산한다', () => {
      expect(
        calculateTotalWithdrawal({
          principalKRW: 1000000,
          remittanceFee: 5000,
          cableFee: 0,
        }),
      ).toBe(1005000)
    })

    it('송금수수료와 전신료가 모두 0이면 원금과 같다', () => {
      expect(
        calculateTotalWithdrawal({
          principalKRW: 1000000,
          remittanceFee: 0,
          cableFee: 0,
        }),
      ).toBe(1000000)
    })
  })

  describe('Validation', () => {
    it('송금수수료가 음수이면 에러를 던진다', () => {
      expect(() =>
        calculateTotalWithdrawal({
          principalKRW: 1000000,
          remittanceFee: -1,
          cableFee: 8000,
        }),
      ).toThrow()
    })

    it('전신료가 음수이면 에러를 던진다', () => {
      expect(() =>
        calculateTotalWithdrawal({
          principalKRW: 1000000,
          remittanceFee: 5000,
          cableFee: -1,
        }),
      ).toThrow()
    })
  })
})
