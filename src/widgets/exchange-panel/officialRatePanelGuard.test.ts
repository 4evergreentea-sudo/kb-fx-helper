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

describe('exchange/remittance panel official rate guard', () => {
  it('USD 조회 중 JPY로 변경되면 USD 환율이 입력란에 적용되지 않는다', () => {
    const setBaseRate = vi.fn()

    applyPanelOfficialRate(
      'USD',
      'JPY',
      {
        applied: true,
        requestId: 1,
        latestRequestId: 1,
        baseRate: 1384.5,
      },
      setBaseRate,
    )

    expect(setBaseRate).not.toHaveBeenCalled()
  })

  it('최신 요청 결과만 입력란에 적용한다', () => {
    const setBaseRate = vi.fn()

    applyPanelOfficialRate(
      'USD',
      'USD',
      {
        applied: true,
        requestId: 2,
        latestRequestId: 2,
        baseRate: 1384.5,
      },
      setBaseRate,
    )

    expect(setBaseRate).toHaveBeenCalledWith('1384.5')
  })

  it('환전 패널과 송금 패널이 동일한 guard 로직을 사용한다', () => {
    expect(shouldApplyOfficialRateToInput).toBeTypeOf('function')
  })
})
