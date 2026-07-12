import { getCurrency } from '../../../entities/currency'
import type { Transaction } from '../../../entities/transaction'

/**
 * 거래기록 목록을 키워드로 검색한다. 순수 함수이며 localStorage/Supabase/React/DOM에
 * 접근하지 않는다(entities/transaction, entities/currency의 public API만 사용).
 *
 * 검색 대상: customerName, currencyCode, 통화 표시명, memo
 * 규칙: 대소문자 구분 없음, 앞뒤 공백 제거, 빈 검색어면 전체 반환, 부분 일치
 */
export function filterTransactionRecords(
  records: Transaction[],
  keyword: string,
): Transaction[] {
  const normalizedKeyword = keyword.trim().toLowerCase()

  if (normalizedKeyword === '') {
    return records
  }

  return records.filter((record) => matchesKeyword(record, normalizedKeyword))
}

/** 정규화(trim + lowercase)된 키워드를 record의 검색 대상 필드들과 부분 일치시킨다 */
function matchesKeyword(record: Transaction, normalizedKeyword: string): boolean {
  const currency = getCurrency(record.currencyCode)

  const searchableFields = [
    record.customerName,
    record.currencyCode,
    currency.displayName,
    record.memo,
  ]

  return searchableFields.some((field) => field.toLowerCase().includes(normalizedKeyword))
}
