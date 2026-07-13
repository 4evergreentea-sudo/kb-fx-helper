import { describe, expect, it, vi } from 'vitest'
import { shouldApplyOfficialRateToInput } from '../../features/load-exchange-rates'

function applyPanelOfficialRate(
  requestedCurrency: 'USD' | 'JPY',
  currentCurrency: 'USD' | 'JPY',
  callResult: Parameters<typeof shouldApplyOfficialRateToInput>[2],
  callbacks: {
    setBaseRate: (value: string) => void
    setLastInput: (value: null) => void
    setResult: (value: null) => void
  },
): void {
  if (
    shouldApplyOfficialRateToInput(
      requestedCurrency,
      currentCurrency,
      callResult,
    )
  ) {
    callbacks.setBaseRate(String(callResult.baseRate))
    callbacks.setLastInput(null)
    callbacks.setResult(null)
  }
}

describe('remittance panel official rate guard', () => {
  it('초기화 후 늦게 도착한 stale 요청이 baseRate를 덮어쓰지 않는다', () => {
    const setBaseRate = vi.fn()
    const setLastInput = vi.fn()
    const setResult = vi.fn()

    applyPanelOfficialRate(
      'USD',
      'USD',
      {
        applied: false,
        requestId: 1,
        latestRequestId: 2,
        reason: 'stale',
      },
      { setBaseRate, setLastInput, setResult },
    )

    expect(setBaseRate).not.toHaveBeenCalled()
    expect(setLastInput).not.toHaveBeenCalled()
    expect(setResult).not.toHaveBeenCalled()
  })

  it('계산 결과가 있는 상태에서 공식 환율 적용 시 result와 lastInput을 초기화한다', () => {
    const setBaseRate = vi.fn()
    const setLastInput = vi.fn()
    const setResult = vi.fn()

    applyPanelOfficialRate(
      'USD',
      'USD',
      {
        applied: true,
        requestId: 1,
        latestRequestId: 1,
        baseRate: 1400,
      },
      { setBaseRate, setLastInput, setResult },
    )

    expect(setBaseRate).toHaveBeenCalledWith('1400')
    expect(setLastInput).toHaveBeenCalledWith(null)
    expect(setResult).toHaveBeenCalledWith(null)
  })

  it('통화 불일치 응답은 baseRate와 계산 결과를 변경하지 않는다', () => {
    const setBaseRate = vi.fn()
    const setLastInput = vi.fn()
    const setResult = vi.fn()

    applyPanelOfficialRate(
      'USD',
      'JPY',
      {
        applied: true,
        requestId: 1,
        latestRequestId: 1,
        baseRate: 1400,
      },
      { setBaseRate, setLastInput, setResult },
    )

    expect(setBaseRate).not.toHaveBeenCalled()
    expect(setLastInput).not.toHaveBeenCalled()
    expect(setResult).not.toHaveBeenCalled()
  })
})
