import { roundToTwo } from './roundToTwo'

/**
 * 환율 값을 소수점 둘째 자리까지 "1,384.50" 형식의 문자열로 포맷한다.
 */
export function formatRate(value: number): string {
  return roundToTwo(value).toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
