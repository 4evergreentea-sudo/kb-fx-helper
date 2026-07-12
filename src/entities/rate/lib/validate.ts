import type { ValidationResult } from '../model/types'

/** 기준환율은 0보다 커야 한다 */
export function validateBaseRate(baseRate: number): ValidationResult {
  if (baseRate <= 0) {
    return { valid: false, message: '기준환율은 0보다 커야 합니다.' }
  }

  return { valid: true }
}

/** 금액은 0보다 커야 한다 */
export function validateAmount(amount: number): ValidationResult {
  if (amount <= 0) {
    return { valid: false, message: '금액은 0보다 커야 합니다.' }
  }

  return { valid: true }
}

/** 우대율은 0 이상 100 이하여야 한다 */
export function validatePreferentialRate(
  preferentialRate: number,
): ValidationResult {
  if (preferentialRate < 0 || preferentialRate > 100) {
    return { valid: false, message: '우대율은 0 이상 100 이하이어야 합니다.' }
  }

  return { valid: true }
}

/** 스프레드율은 0 이상이어야 한다 */
export function validateSpreadRate(spreadRate: number): ValidationResult {
  if (spreadRate < 0) {
    return { valid: false, message: '스프레드율은 0 이상이어야 합니다.' }
  }

  return { valid: true }
}
