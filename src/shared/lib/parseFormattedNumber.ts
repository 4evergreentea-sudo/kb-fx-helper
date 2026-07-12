import { parseNumberOrNull } from './parseNumberOrNull'

/**
 * formatNumericInput()이 만든 천 단위 콤마 포함 문자열(또는 콤마 없는 일반 숫자 문자열)을
 * 계산에 사용할 숫자로 변환한다.
 * 콤마를 제거한 뒤 parseNumberOrNull()에 위임하므로, 빈 문자열/NaN/Infinity는 모두 null을 반환한다.
 */
export function parseFormattedNumber(value: string): number | null {
  return parseNumberOrNull(value.replace(/,/g, ''))
}
