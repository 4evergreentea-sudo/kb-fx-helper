import type { CalculateRemittancePrincipalParams } from '../model/types'
import { validateForeignAmount } from './validateRemittance'

/**
 * 외화 송금액, 적용환율, 통화단위를 이용해 송금 원금(원화)을 계산한다.
 *
 * 송금 원금 = Math.round((외화 송금액 / 통화단위) × 적용환율)
 */
export function calculateRemittancePrincipal({
  foreignAmount,
  appliedRate,
  unit,
}: CalculateRemittancePrincipalParams): number {
  const amountResult = validateForeignAmount(foreignAmount)

  if (!amountResult.valid) {
    throw new Error(amountResult.message)
  }

  return Math.round((foreignAmount / unit) * appliedRate)
}
