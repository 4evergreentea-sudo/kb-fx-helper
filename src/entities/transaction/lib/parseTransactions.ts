import { isTransaction } from './isTransaction'
import { migrateLegacyTransaction } from './migrateLegacyTransaction'
import type { Transaction } from '../model/types'

/**
 * 알 수 없는 값(localStorage에서 읽어온 값 등)을 Transaction 배열로 안전하게 변환한다.
 * 배열이 아니면 빈 배열을 반환한다.
 * 각 항목은 먼저 migrateLegacyTransaction()으로 정규화(레거시 필드 보강)한 뒤 검증하므로,
 * customerName/memo/recordType이 없는 과거 데이터도 깨지지 않고 살아남는다.
 * 정규화 후에도 형태가 올바르지 않은 항목만 제외한다.
 */
export function parseTransactions(value: unknown): Transaction[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map(migrateLegacyTransaction).filter(isTransaction)
}
