/**
 * 값이 비어 있으면(공백만 있어도 포함) 화면에 보여줄 대체 문구를 반환한다.
 * 과거 데이터에 customerName/memo 등이 없는 경우 화면이 깨지지 않도록 사용한다.
 */
export function formatOrPlaceholder(value: string, placeholder = '미입력'): string {
  return value.trim().length > 0 ? value : placeholder
}
