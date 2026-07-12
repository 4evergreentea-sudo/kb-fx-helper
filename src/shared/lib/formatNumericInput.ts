/**
 * 금액/환율 입력창에 실시간으로 천 단위 콤마를 적용한다.
 * `<input type="text" inputMode="decimal">`의 onChange 값을 그대로 전달해 사용한다
 * (예: `onChange={(e) => onChange(formatNumericInput(e.target.value))}`).
 *
 * - 숫자, 소수점(.), 맨 앞의 부호(-)만 허용하고 그 외 문자(콤마 포함)는 제거한다.
 * - 정수부에만 천 단위 콤마를 적용하고, 소수부는 입력한 그대로 유지한다(자릿수 반올림하지 않음).
 * - 소수점은 첫 번째 것만 유효하며, 이후에 입력된 소수점은 제거한다.
 * - 빈 문자열은 빈 문자열을 그대로 반환한다.
 *
 * 순수 문자열 변환 함수이며 숫자 변환/검증은 parseFormattedNumber()가 담당한다.
 */
export function formatNumericInput(value: string): string {
  if (value === '') {
    return ''
  }

  const isNegative = value.trimStart().startsWith('-')
  const sign = isNegative ? '-' : ''

  const digitsAndDot = value.replace(/[^0-9.]/g, '')

  if (digitsAndDot === '') {
    return sign
  }

  const firstDotIndex = digitsAndDot.indexOf('.')
  const hasDot = firstDotIndex !== -1
  const rawIntegerPart = hasDot ? digitsAndDot.slice(0, firstDotIndex) : digitsAndDot
  const fractionPart = hasDot
    ? digitsAndDot.slice(firstDotIndex + 1).replace(/\./g, '')
    : ''

  const integerPart = normalizeIntegerPart(rawIntegerPart)
  const groupedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  if (!hasDot) {
    return `${sign}${groupedIntegerPart}`
  }

  return `${sign}${groupedIntegerPart}.${fractionPart}`
}

/** 앞자리 불필요한 0을 제거한다. 예) '0100' → '100', '0' → '0', '' → '' */
function normalizeIntegerPart(integerPart: string): string {
  const withoutLeadingZeros = integerPart.replace(/^0+(?=\d)/, '')
  return withoutLeadingZeros
}
