import { roundToTwo } from '../../../shared/lib'
import type { ApplyExchangeRateParams } from '../model/types'
import {
  validateBaseRate,
  validatePreferentialRate,
  validateSpreadRate,
} from './validate'

/**
 * 기준환율, 스프레드율, 우대율, 거래구분을 이용해 적용환율을 계산한다.
 *
 * buy:  기준환율 × (1 + 스프레드 × (1 - 우대))
 * sell: 기준환율 × (1 - 스프레드 × (1 - 우대))
 *
 * 결과는 소수점 둘째 자리까지 반올림한다.
 */
export function applyExchangeRate({
  baseRate,
  spreadRate,
  preferentialRate,
  transactionType,
}: ApplyExchangeRateParams): number {
  const results = [
    validateBaseRate(baseRate),
    validateSpreadRate(spreadRate),
    validatePreferentialRate(preferentialRate),
  ]

  const invalidMessages = results
    .filter((result) => !result.valid)
    .map((result) => result.message)
    .filter((message): message is string => Boolean(message))

  if (invalidMessages.length > 0) {
    throw new Error(invalidMessages.join(' '))
  }

  const spread = spreadRate / 100
  const preferential = preferentialRate / 100

  const rate =
    transactionType === 'buy'
      ? baseRate * (1 + spread * (1 - preferential))
      : baseRate * (1 - spread * (1 - preferential))

  return roundToTwo(rate)
}
