import type { CurrencyCode } from '../../../shared/model'
import type { LoadOfficialRateCallResult } from '../model/types'

export type AppliedOfficialRateCallResult = LoadOfficialRateCallResult & {
  applied: true
  baseRate: number
}

/** 패널에서 불러온 환율을 입력값에 반영해도 되는지 판단한다 */
export function shouldApplyOfficialRateToInput(
  requestedCurrency: CurrencyCode,
  currentCurrency: CurrencyCode,
  callResult: LoadOfficialRateCallResult,
): callResult is AppliedOfficialRateCallResult {
  return (
    callResult.applied &&
    requestedCurrency === currentCurrency &&
    callResult.requestId === callResult.latestRequestId &&
    callResult.baseRate !== undefined
  )
}

export interface ApplyOfficialRateToPanelInput {
  requestedCurrency: CurrencyCode
  currentCurrency: CurrencyCode
  loadResult: LoadOfficialRateCallResult
  formatRate: (rate: number) => string
  setBaseRate: (value: string) => void
  clearLastInput: () => void
  clearResult: () => void
}

/** 공식 환율 조회 결과를 패널 입력/계산 상태에 반영한다 */
export function applyOfficialRateToPanel({
  requestedCurrency,
  currentCurrency,
  loadResult,
  formatRate,
  setBaseRate,
  clearLastInput,
  clearResult,
}: ApplyOfficialRateToPanelInput): boolean {
  if (
    !shouldApplyOfficialRateToInput(
      requestedCurrency,
      currentCurrency,
      loadResult,
    )
  ) {
    return false
  }

  setBaseRate(formatRate(loadResult.baseRate))
  clearLastInput()
  clearResult()
  return true
}
