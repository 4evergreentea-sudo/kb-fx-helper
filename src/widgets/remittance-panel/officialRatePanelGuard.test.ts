import { describe, expect, it, vi } from 'vitest'
import { shouldApplyOfficialRateToInput } from '../../features/load-exchange-rates'

function applyPanelOfficialRate(
  requestedCurrency: 'USD' | 'JPY',
  currentCurrency: 'USD' | 'JPY',
  callResult: Parameters<typeof shouldApplyOfficialRateToInput>[2],
  setBaseRate: (value: string) => void,
): void {
  if (
    shouldApplyOfficialRateToInput(
      requestedCurrency,
      currentCurrency,
      callResult,
    )
  ) {
    setBaseRate(String(callResult.baseRate))
  }
}

describe('remittance panel official rate guard', () => {
  it('초기화 후 늦게 도착한 stale 요청이 baseRate를 덮어쓰지 않는다', () => {
    const setBaseRate = vi.fn()

    applyPanelOfficialRate(
      'USD',
      'USD',
      {
        applied: false,
        requestId: 1,
        latestRequestId: 2,
        reason: 'stale',
      },
      setBaseRate,
    )

    expect(setBaseRate).not.toHaveBeenCalled()
  })
})
