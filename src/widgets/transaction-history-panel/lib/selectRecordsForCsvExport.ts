import { filterTransactionRecords } from '../../../features/search-transaction'
import type { Transaction } from '../../../entities/transaction'

/**
 * CSV 내보내기에 사용할 거래 목록을 결정한다.
 * TransactionHistoryPanel은 화면에 표시하는 필터링된 목록과 정확히 같은 결과를
 * 이 함수를 통해 얻어 CSV로 내보내므로, "전체 transactions가 아니라 현재 검색 결과만
 * CSV 함수에 전달"하는 구조가 항상 보장된다(검색어가 비어 있으면 전체 기록을 반환).
 */
export function selectRecordsForCsvExport(
  transactions: Transaction[],
  keyword: string,
): Transaction[] {
  return filterTransactionRecords(transactions, keyword)
}
