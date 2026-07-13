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
