import { getCurrency } from '../../../entities/currency'
import {
  applyRemittanceRate,
  calculateRemittancePrincipal,
  calculateTotalWithdrawal,
  validateBaseRate,
  validateCableFee,
  validateForeignAmount,
  validatePreferentialRate,
  validateRemittanceFee,
  validateSpreadRate,
} from '../../../entities/remittance'
import type { ValidationResult } from '../../../entities/remittance'
import type {
  RemittanceCalculatorInput,
  RemittanceCalculatorResult,
} from '../model/types'

/**
 * 통화 조회 → entities validation → 적용환율 계산 → 송금 원금 계산 → 총 출금액 계산
 * 흐름을 오케스트레이션한다.
 * 검증 규칙 자체는 entities/remittance에 위임하며, 여기서는 검증 결과를 취합하고
 * 다음 단계(applyRemittanceRate, calculateRemittancePrincipal, calculateTotalWithdrawal)
 * 호출 여부만 결정한다.
 */
export function createRemittanceCalculator({
  currencyCode,
  foreignAmount,
  baseRate,
  spreadRate,
  preferentialRate,
  remittanceFee,
  cableFee,
}: RemittanceCalculatorInput): RemittanceCalculatorResult {
  const currency = getCurrency(currencyCode)

  const validation = combineValidationResults([
    validateForeignAmount(foreignAmount),
    validateBaseRate(baseRate),
    validateSpreadRate(spreadRate),
    validatePreferentialRate(preferentialRate),
    validateRemittanceFee(remittanceFee),
    validateCableFee(cableFee),
  ])

  if (!validation.valid) {
    return {
      appliedRate: null,
      principalKRW: null,
      remittanceFee: null,
      cableFee: null,
      totalWithdrawalKRW: null,
      validation,
    }
  }

  const appliedRate = applyRemittanceRate({
    baseRate,
    spreadRate,
    preferentialRate,
  })

  const principalKRW = calculateRemittancePrincipal({
    foreignAmount,
    appliedRate,
    unit: currency.unit,
  })

  const totalWithdrawalKRW = calculateTotalWithdrawal({
    principalKRW,
    remittanceFee,
    cableFee,
  })

  return {
    appliedRate,
    principalKRW,
    remittanceFee,
    cableFee,
    totalWithdrawalKRW,
    validation,
  }
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
