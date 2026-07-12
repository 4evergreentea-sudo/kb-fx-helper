import type { ExchangeToKRWParams } from '../model/types'
import { validateAmount } from './validate'

/**
 * 외화금액, 적용환율, 통화단위를 이용해 원화 금액을 계산한다.
 *
 * Math.round((외화금액 / 통화단위) × 적용환율)
 */
export function exchangeToKRW({
  amount,
  appliedRate,
  unit,
}: ExchangeToKRWParams): number {
  const amountResult = validateAmount(amount)

  if (!amountResult.valid) {
    throw new Error(amountResult.message)
  }

  return Math.round((amount / unit) * appliedRate)
}
