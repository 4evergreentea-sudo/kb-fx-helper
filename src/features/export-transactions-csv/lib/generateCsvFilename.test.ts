import { describe, expect, it } from 'vitest'
import { generateCsvFilename } from './generateCsvFilename'

describe('generateCsvFilename', () => {
  it('kb-fx-transactions-YYYYMMDD-HHmmss.csv 형식으로 만든다', () => {
    const now = new Date(2026, 6, 12, 15, 4, 7)

    expect(generateCsvFilename(now)).toBe('kb-fx-transactions-20260712-150407.csv')
  })

  it('월/일/시/분/초가 한 자리여도 0으로 패딩한다', () => {
    const now = new Date(2026, 0, 2, 3, 4, 5)

    expect(generateCsvFilename(now)).toBe('kb-fx-transactions-20260102-030405.csv')
  })
})
