import type { ValidationResult } from '../../../shared/model'

/**
 * 고객명이 비어 있거나 공백뿐이면 유효하지 않다.
 * 환전 기록과 상담 기록 모두 신규 저장 시 고객명이 필수다.
 */
export function validateCustomerName(customerName: string): ValidationResult {
  if (customerName.trim().length === 0) {
    return { valid: false, message: '고객명을 입력해주세요.' }
  }

  return { valid: true }
}

/**
 * 상담 기록은 메모가 비어 있거나 공백뿐이면 유효하지 않다.
 * 환전 기록은 메모가 선택 항목이라 이 검증을 거치지 않는다.
 */
export function validateConsultationMemo(memo: string): ValidationResult {
  if (memo.trim().length === 0) {
    return { valid: false, message: '상담 내용을 메모에 입력해주세요.' }
  }

  return { valid: true }
}

/**
 * 상담 기록의 외화금액은 유효한 숫자이면서 0보다 커야 한다.
 * NaN/Infinity/-Infinity를 포함한 값은 유효하지 않은 숫자로 취급한다.
 */
export function validateConsultationAmount(amount: number): ValidationResult {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, message: '외화금액은 0보다 커야 합니다.' }
  }

  return { valid: true }
}

/** validateRemittanceAmounts() 입력. 이미 계산이 끝난 값을 저장 직전에 다시 한번 검사한다 */
export interface RemittanceAmountsToValidate {
  /** 외화 송금액 */
  amount: number
  /** 전신환 적용환율 */
  appliedRate: number
  /** 송금 원금(원화) */
  principalKRW: number
  /** 송금수수료 */
  remittanceFee: number
  /** 전신료 */
  cableFee: number
  /** 총 출금액(원화) */
  totalWithdrawalKRW: number
}

/** NaN, Infinity, -Infinity를 포함한 값을 유효하지 않은 숫자로 취급한다 */
function isValidNumber(value: number): boolean {
  return Number.isFinite(value)
}

/**
 * 해외송금 거래를 저장하기 전, 계산된 금액 필드들이 여전히 유효한 범위인지 검사한다.
 * (raw 입력값 검증은 entities/remittance가 계산 시점에 이미 수행했으므로,
 * 여기서는 저장 직전의 최종 방어선 역할만 한다.)
 */
export function validateRemittanceAmounts(
  amounts: RemittanceAmountsToValidate,
): ValidationResult {
  if (!isValidNumber(amounts.amount) || amounts.amount <= 0) {
    return { valid: false, message: '외화 송금액은 0보다 커야 합니다.' }
  }

  if (!isValidNumber(amounts.appliedRate) || amounts.appliedRate <= 0) {
    return { valid: false, message: '적용환율은 0보다 커야 합니다.' }
  }

  if (!isValidNumber(amounts.principalKRW) || amounts.principalKRW < 0) {
    return { valid: false, message: '송금원금은 0 이상이어야 합니다.' }
  }

  if (!isValidNumber(amounts.remittanceFee) || amounts.remittanceFee < 0) {
    return { valid: false, message: '송금수수료는 0 이상이어야 합니다.' }
  }

  if (!isValidNumber(amounts.cableFee) || amounts.cableFee < 0) {
    return { valid: false, message: '전신료는 0 이상이어야 합니다.' }
  }

  if (!isValidNumber(amounts.totalWithdrawalKRW) || amounts.totalWithdrawalKRW < 0) {
    return { valid: false, message: '총 출금액은 0 이상이어야 합니다.' }
  }

  return { valid: true }
}
