import { describe, expect, it } from 'vitest'
import { calculateRemittancePrincipal } from './calculateRemittancePrincipal'

describe('calculateRemittancePrincipal', () => {
  describe('해외송금 계산기 시나리오', () => {
    it('USD(통화단위 1) 외화송금액 1000, 적용환율 1404.9이면 송금원금 1404900을 반환한다', () => {
      expect(
        calculateRemittancePrincipal({
          foreignAmount: 1000,
          appliedRate: 1404.9,
          unit: 1,
        }),
      ).toBe(1404900)
    })

    it('JPY 100엔 단위: 외화송금액 100000, 적용환율 997.15, 통화단위 100이면 송금원금 997150을 반환한다', () => {
      expect(
        calculateRemittancePrincipal({
          foreignAmount: 100000,
          appliedRate: 997.15,
          unit: 100,
        }),
      ).toBe(997150)
    })
  })

  describe('기본 동작', () => {
    it('계산 결과 소수가 발생하면 정수로 반올림한다', () => {
      expect(
        calculateRemittancePrincipal({
          foreignAmount: 333,
          appliedRate: 1400.5,
          unit: 1,
        }),
      ).toBe(466367)
    })
  })

  describe('Validation', () => {
    it('외화송금액이 0이면 에러를 던진다', () => {
      expect(() =>
        calculateRemittancePrincipal({
          foreignAmount: 0,
          appliedRate: 1400,
          unit: 1,
        }),
      ).toThrow()
    })

    it('외화송금액이 음수이면 에러를 던진다', () => {
      expect(() =>
        calculateRemittancePrincipal({
          foreignAmount: -100,
          appliedRate: 1400,
          unit: 1,
        }),
      ).toThrow()
    })

    it('외화송금액이 NaN이면 에러를 던진다', () => {
      expect(() =>
        calculateRemittancePrincipal({
          foreignAmount: NaN,
          appliedRate: 1400,
          unit: 1,
        }),
      ).toThrow()
    })

    it('외화송금액이 Infinity이면 에러를 던진다', () => {
      expect(() =>
        calculateRemittancePrincipal({
          foreignAmount: Infinity,
          appliedRate: 1400,
          unit: 1,
        }),
      ).toThrow()
    })
  })
})
