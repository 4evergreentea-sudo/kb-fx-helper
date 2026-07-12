/**
 * ISO 8601 문자열을 "2026. 07. 12. 14:30" 형식의 한국어 날짜/시각으로 포맷한다.
 * 잘못된 값이 들어오면 화면에 깨진 값을 보여주지 않도록 '-'를 반환한다.
 */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
