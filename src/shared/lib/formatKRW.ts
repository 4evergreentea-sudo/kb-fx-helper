/**
 * 원화 금액을 "1,234원" 형식의 문자열로 포맷한다.
 */
export function formatKRW(value: number): string {
  return `${Math.round(value).toLocaleString('ko-KR')}원`
}
