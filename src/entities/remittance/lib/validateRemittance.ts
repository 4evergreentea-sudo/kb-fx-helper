import type { ValidationResult } from '../model/types'

/** NaN, Infinity, -Infinity를 포함한 값을 유효하지 않은 숫자로 취급한다 */
function isValidNumber(value: number): boolean {
  return Number.isFinite(value)
}

/** 외화 송금액은 유효한 숫자이면서 0보다 커야 한다 */
export function validateForeignAmount(foreignAmount: number): ValidationResult {
  if (!isValidNumber(foreignAmount)) {
    return { valid: false, message: '외화 송금액을 올바르게 입력해주세요.' }
  }

  if (foreignAmount <= 0) {
    return { valid: false, message: '외화 송금액은 0보다 커야 합니다.' }
  }

  return { valid: true }
}

/** 전신환 매매기준율은 유효한 숫자이면서 0보다 커야 한다 */
export function validateBaseRate(baseRate: number): ValidationResult {
  if (!isValidNumber(baseRate)) {
    return { valid: false, message: '전신환 매매기준율을 올바르게 입력해주세요.' }
  }

  if (baseRate <= 0) {
    return { valid: false, message: '전신환 매매기준율은 0보다 커야 합니다.' }
  }

  return { valid: true }
}

/** 스프레드율은 유효한 숫자이면서 0 이상이어야 한다 */
export function validateSpreadRate(spreadRate: number): ValidationResult {
  if (!isValidNumber(spreadRate)) {
    return { valid: false, message: '스프레드율을 올바르게 입력해주세요.' }
  }

  if (spreadRate < 0) {
    return { valid: false, message: '스프레드율은 0 이상이어야 합니다.' }
  }

  return { valid: true }
}

/** 우대율은 유효한 숫자이면서 0 이상 100 이하여야 한다 */
export function validatePreferentialRate(
  preferentialRate: number,
): ValidationResult {
  if (!isValidNumber(preferentialRate)) {
    return { valid: false, message: '우대율을 올바르게 입력해주세요.' }
  }

  if (preferentialRate < 0 || preferentialRate > 100) {
    return { valid: false, message: '우대율은 0 이상 100 이하이어야 합니다.' }
  }

  return { valid: true }
}

/** 송금수수료는 유효한 숫자이면서 0 이상이어야 한다 */
export function validateRemittanceFee(remittanceFee: number): ValidationResult {
  if (!isValidNumber(remittanceFee)) {
    return { valid: false, message: '송금수수료를 올바르게 입력해주세요.' }
  }

  if (remittanceFee < 0) {
    return { valid: false, message: '송금수수료는 0 이상이어야 합니다.' }
  }

  return { valid: true }
}

/** 전신료는 유효한 숫자이면서 0 이상이어야 한다 */
export function validateCableFee(cableFee: number): ValidationResult {
  if (!isValidNumber(cableFee)) {
    return { valid: false, message: '전신료를 올바르게 입력해주세요.' }
  }

  if (cableFee < 0) {
    return { valid: false, message: '전신료는 0 이상이어야 합니다.' }
  }

  return { valid: true }
}
