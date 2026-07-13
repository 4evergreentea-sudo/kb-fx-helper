/**
 * CSV 내보내기 버튼 문구를 결정한다.
 * 검색어(trim 후)가 있으면 "검색 결과 CSV로 내보내기", 없으면 "전체 CSV로 내보내기"를 반환한다.
 * TransactionHistoryPanel과 동일한 trim 규칙을 사용해 버튼 문구와 실제 내보내기 대상이 일치한다.
 */
export function getCsvExportButtonLabel(keyword: string): string {
  return keyword.trim().length > 0
    ? '검색 결과 CSV로 내보내기'
    : '전체 CSV로 내보내기'
}
