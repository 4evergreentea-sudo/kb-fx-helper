/**
 * 소수점 둘째 자리까지 반올림한다.
 * 부동소수점 오차를 피하기 위해 100을 곱한 뒤 반올림하고 다시 나눈다.
 */
export function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100
}
