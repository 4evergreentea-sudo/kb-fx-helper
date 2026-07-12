import { isTransaction } from './isTransaction'
import type { Transaction } from '../model/types'

/**
 * 알 수 없는 값(localStorage에서 읽어온 값 등)을 Transaction 배열로 안전하게 변환한다.
 * 배열이 아니면 빈 배열을 반환하고, 배열 항목 중 형태가 올바르지 않은 항목만 제외한다.
 */
export function parseTransactions(value: unknown): Transaction[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isTransaction)
}
