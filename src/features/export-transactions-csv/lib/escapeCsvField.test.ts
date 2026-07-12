import { describe, expect, it } from 'vitest'
import { escapeCsvField } from './escapeCsvField'

describe('escapeCsvField', () => {
  it('특수문자가 없는 일반 값은 그대로 반환한다', () => {
    expect(escapeCsvField('USD')).toBe('USD')
    expect(escapeCsvField('1234.56')).toBe('1234.56')
  })

  it('쉼표가 포함된 값은 큰따옴표로 감싼다', () => {
    expect(escapeCsvField('1,234')).toBe('"1,234"')
  })

  it('큰따옴표가 포함된 값은 이중화 후 전체를 큰따옴표로 감싼다', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""')
  })

  it('줄바꿈이 포함된 값은 큰따옴표로 감싼다', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"')
    expect(escapeCsvField('line1\r\nline2')).toBe('"line1\r\nline2"')
  })

  it.each(['=SUM(A1:A2)', '+1234', '-1234', '@SUM(A1)'])(
    '%s 처럼 =,+,-,@ 로 시작하는 값은 앞에 작은따옴표를 붙인다',
    (value) => {
      expect(escapeCsvField(value)).toBe(`'${value}`)
    },
  )

  it('수식 주입 문자로 시작하면서 쉼표도 포함된 값은 주입 방지 후 쿼팅한다', () => {
    expect(escapeCsvField('=SUM(A1,A2)')).toBe(`"'=SUM(A1,A2)"`)
  })

  it('빈 문자열은 그대로 반환한다', () => {
    expect(escapeCsvField('')).toBe('')
  })
})
