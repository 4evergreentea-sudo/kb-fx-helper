import type { CalculateTotalWithdrawalParams } from '../model/types'
import { validateCableFee, validateRemittanceFee } from './validateRemittance'

/**
 * 송금 원금, 송금수수료, 전신료를 합산해 총 출금액을 계산한다.
 *
 * 총 출금액 = 송금 원금 + 송금수수료 + 전신료
 */
export function calculateTotalWithdrawal({
  principalKRW,
  remittanceFee,
  cableFee,
}: CalculateTotalWithdrawalParams): number {
  const results = [
    validateRemittanceFee(remittanceFee),
    validateCableFee(cableFee),
  ]

  const invalidMessages = results
    .filter((result) => !result.valid)
    .map((result) => result.message)
    .filter((message): message is string => Boolean(message))

  if (invalidMessages.length > 0) {
    throw new Error(invalidMessages.join(' '))
  }

  return principalKRW + remittanceFee + cableFee
}
