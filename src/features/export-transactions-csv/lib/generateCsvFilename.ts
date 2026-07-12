function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * 주어진 시각으로 "kb-fx-transactions-YYYYMMDD-HHmmss.csv" 파일명을 만든다.
 * 호출 시각을 인자로 받아 테스트에서 고정된 결과를 검증할 수 있게 한다.
 */
export function generateCsvFilename(now: Date): string {
  const year = now.getFullYear()
  const month = pad(now.getMonth() + 1)
  const day = pad(now.getDate())
  const hours = pad(now.getHours())
  const minutes = pad(now.getMinutes())
  const seconds = pad(now.getSeconds())

  return `kb-fx-transactions-${year}${month}${day}-${hours}${minutes}${seconds}.csv`
}
