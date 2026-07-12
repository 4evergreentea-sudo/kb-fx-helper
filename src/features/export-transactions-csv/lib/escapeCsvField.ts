/**
 * CSV 셀 값 하나를 RFC 4180 규칙과 CSV Injection 방지 규칙에 따라 escape한다.
 *
 * 1. 값이 `=`, `+`, `-`, `@`로 시작하면 앞에 `'`를 붙여 Excel 등에서 수식으로
 *    해석되지 않도록 한다.
 * 2. 값에 쉼표, 큰따옴표, 줄바꿈(`\n` 또는 `\r`)이 포함되어 있으면 전체를
 *    큰따옴표로 감싸고, 내부의 큰따옴표는 두 개로 이중화한다.
 */
export function escapeCsvField(value: string): string {
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value

  const needsQuoting = /[",\n\r]/.test(guarded)
  if (!needsQuoting) {
    return guarded
  }

  return `"${guarded.replace(/"/g, '""')}"`
}
