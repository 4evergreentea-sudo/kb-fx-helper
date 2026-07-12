import { roundToTwo } from '../../../shared/lib'
import type { ApplyRemittanceRateParams } from '../model/types'
import {
  validateBaseRate,
  validatePreferentialRate,
  validateSpreadRate,
} from './validateRemittance'

/**
 * 전신환 매매기준율, 스프레드율, 우대율을 이용해 전신환 적용환율을 계산한다.
 *
 * 적용환율 = 기준환율 × (1 + 스프레드율 × (1 - 우대율))
 * 스프레드율/우대율은 100으로 나눈 값으로 계산한다.
 *
 * 결과는 소수점 둘째 자리까지 반올림한다.
 */
export function applyRemittanceRate({
  baseRate,
  spreadRate,
  preferentialRate,
}: ApplyRemittanceRateParams): number {
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

  const rate = baseRate * (1 + spread * (1 - preferential))

  return roundToTwo(rate)
}
