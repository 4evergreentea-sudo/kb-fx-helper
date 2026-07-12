/** CSV 내보내기 결과. 실패 시(거래 0건 등) UI에 보여줄 한국어 메시지를 담는다 */
export interface CsvExportResult {
  success: boolean
  message?: string
}
