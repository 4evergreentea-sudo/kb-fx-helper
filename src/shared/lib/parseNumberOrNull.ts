/**
 * 입력 문자열을 숫자로 변환한다.
 * 빈 문자열, 숫자로 변환할 수 없는 값(NaN), 무한대(Infinity)는 null을 반환한다.
 *
 * 환율 계산식이 아닌 "문자열 → 숫자" 입력 포맷 변환만 담당한다.
 */
export function parseNumberOrNull(value: string): number | null {
  const trimmed = value.trim()

  if (trimmed === '') {
    return null
  }

  const parsed = Number(trimmed)

  if (!Number.isFinite(parsed)) {
    return null
  }

  return parsed
}
