import { getCurrency } from '../../../entities/currency'
import {
  applyExchangeRate,
  exchangeToKRW,
  validateAmount,
  validateBaseRate,
  validatePreferentialRate,
  validateSpreadRate,
} from '../../../entities/rate'
import type { ValidationResult } from '../../../entities/rate'
import type {
  ExchangeCalculatorInput,
  ExchangeCalculatorResult,
} from '../model/types'

/**
 * 통화 조회 → entities validation → 적용환율 계산 → 원화 환산 흐름을 오케스트레이션한다.
 * 검증 규칙 자체는 entities/rate에 위임하며, 여기서는 검증 결과를 취합하고
 * 다음 단계(applyExchangeRate, exchangeToKRW) 호출 여부만 결정한다.
 */
export function createExchangeCalculator({
  currencyCode,
  baseRate,
  spreadRate,
  preferentialRate,
  transactionType,
  amount,
}: ExchangeCalculatorInput): ExchangeCalculatorResult {
  const currency = getCurrency(currencyCode)

  const validation = combineValidationResults([
    validateBaseRate(baseRate),
    validateSpreadRate(spreadRate),
    validatePreferentialRate(preferentialRate),
    validateAmount(amount),
  ])

  if (!validation.valid) {
    return { appliedRate: null, krwAmount: null, validation }
  }

  const appliedRate = applyExchangeRate({
    baseRate,
    spreadRate,
    preferentialRate,
    transactionType,
  })

  const krwAmount = exchangeToKRW({
    amount,
    appliedRate,
    unit: currency.unit,
  })

  return { appliedRate, krwAmount, validation }
}

/** 여러 ValidationResult를 하나로 취합한다. 검증 규칙은 재구현하지 않고 결과만 모은다. */
function combineValidationResults(
  results: ValidationResult[],
): ValidationResult {
  const invalidMessages = results
    .filter((result) => !result.valid)
    .map((result) => result.message)
    .filter((message): message is string => Boolean(message))

  if (invalidMessages.length > 0) {
    return { valid: false, message: invalidMessages.join(' ') }
  }

  return { valid: true }
}
