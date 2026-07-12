import { describe, expect, it } from 'vitest'
import { applyRemittanceRate } from './applyRemittanceRate'

describe('applyRemittanceRate', () => {
  describe('해외송금 계산기 시나리오', () => {
    it('기준환율 1400, 스프레드 1.75%, 우대 80%이면 적용환율 1404.9를 반환한다', () => {
      expect(
        applyRemittanceRate({
          baseRate: 1400,
          spreadRate: 1.75,
          preferentialRate: 80,
        }),
      ).toBe(1404.9)
    })

    it('기준환율 980, 스프레드 1.75%, 우대 0%이면 적용환율 997.15를 반환한다', () => {
      expect(
        applyRemittanceRate({
          baseRate: 980,
          spreadRate: 1.75,
          preferentialRate: 0,
        }),
      ).toBe(997.15)
    })
  })

  describe('Boundary Test', () => {
    it('우대율 100%이면 스프레드가 완전히 상쇄되어 적용환율은 기준환율과 같다', () => {
      expect(
        applyRemittanceRate({
          baseRate: 1400,
          spreadRate: 1.75,
          preferentialRate: 100,
        }),
      ).toBe(1400)
    })

    it('스프레드율 0%이면 적용환율은 기준환율과 같다', () => {
      expect(
        applyRemittanceRate({
          baseRate: 1400,
          spreadRate: 0,
          preferentialRate: 0,
        }),
      ).toBe(1400)
    })

    it('우대율 0%이면 스프레드가 그대로 적용된다', () => {
      expect(
        applyRemittanceRate({
          baseRate: 1000,
          spreadRate: 2,
          preferentialRate: 0,
        }),
      ).toBe(1020)
    })

    it('기준환율 최소 경계값(0.01)에서도 정상 계산된다', () => {
      expect(
        applyRemittanceRate({
          baseRate: 0.01,
          spreadRate: 1.75,
          preferentialRate: 0,
        }),
      ).toBe(0.01)
    })
  })

  describe('Validation', () => {
    it('기준환율이 0이면 에러를 던진다', () => {
      expect(() =>
        applyRemittanceRate({
          baseRate: 0,
          spreadRate: 1.75,
          preferentialRate: 80,
        }),
      ).toThrow()
    })

    it('기준환율이 음수이면 에러를 던진다', () => {
      expect(() =>
        applyRemittanceRate({
          baseRate: -1400,
          spreadRate: 1.75,
          preferentialRate: 80,
        }),
      ).toThrow()
    })

    it('스프레드율이 음수이면 에러를 던진다', () => {
      expect(() =>
        applyRemittanceRate({
          baseRate: 1400,
          spreadRate: -1,
          preferentialRate: 80,
        }),
      ).toThrow()
    })

    it('우대율이 100을 초과하면 에러를 던진다', () => {
      expect(() =>
        applyRemittanceRate({
          baseRate: 1400,
          spreadRate: 1.75,
          preferentialRate: 100.01,
        }),
      ).toThrow()
    })

    it('우대율이 음수이면 에러를 던진다', () => {
      expect(() =>
        applyRemittanceRate({
          baseRate: 1400,
          spreadRate: 1.75,
          preferentialRate: -1,
        }),
      ).toThrow()
    })
  })

  describe('Regression Test', () => {
    it('여러 검증 실패가 동시에 있으면 메시지를 결합해 에러를 던진다', () => {
      expect(() =>
        applyRemittanceRate({
          baseRate: 0,
          spreadRate: -1,
          preferentialRate: 200,
        }),
      ).toThrow(
        '전신환 매매기준율은 0보다 커야 합니다. 스프레드율은 0 이상이어야 합니다. 우대율은 0 이상 100 이하이어야 합니다.',
      )
    })

    it('NaN 기준환율은 에러를 던진다', () => {
      expect(() =>
        applyRemittanceRate({
          baseRate: NaN,
          spreadRate: 1.75,
          preferentialRate: 80,
        }),
      ).toThrow()
    })

    it('Infinity 스프레드율은 에러를 던진다', () => {
      expect(() =>
        applyRemittanceRate({
          baseRate: 1400,
          spreadRate: Infinity,
          preferentialRate: 80,
        }),
      ).toThrow()
    })
  })
})
