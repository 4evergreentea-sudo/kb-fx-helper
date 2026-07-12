function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * ISO 8601 문자열을 CSV에 적합한 "YYYY-MM-DD HH:mm:ss" 형식으로 포맷한다.
 * 로케일에 의존하지 않는 고정 형식이라 Excel에서 정렬/파싱이 안정적이다.
 * 잘못된 값이 들어오면 '-'를 반환한다.
 */
export function formatTransactionDateTime(isoString: string): string {
  const date = new Date(isoString)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}
