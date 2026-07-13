import { describe, expect, it } from 'vitest'
import { getCsvExportButtonLabel } from './getCsvExportButtonLabel'

describe('getCsvExportButtonLabel', () => {
  it('검색어가 비어 있으면 "전체 CSV로 내보내기"를 반환한다', () => {
    expect(getCsvExportButtonLabel('')).toBe('전체 CSV로 내보내기')
    expect(getCsvExportButtonLabel('   ')).toBe('전체 CSV로 내보내기')
  })

  it('검색어(trim 후)가 있으면 "검색 결과 CSV로 내보내기"를 반환한다', () => {
    expect(getCsvExportButtonLabel('홍길동')).toBe('검색 결과 CSV로 내보내기')
    expect(getCsvExportButtonLabel('  USD  ')).toBe('검색 결과 CSV로 내보내기')
  })
})
