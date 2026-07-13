import { describe, expect, it } from 'vitest'
import { shouldApplyOfficialRateToInput } from './applyOfficialRateResult'

describe('shouldApplyOfficialRateToInput', () => {
  it('통화가 같고 최신 요청이면 baseRate를 반영한다', () => {
    const result = shouldApplyOfficialRateToInput('USD', 'USD', {
      applied: true,
      requestId: 2,
      latestRequestId: 2,
      baseRate: 1384.5,
    })

    expect(result).toBe(true)
  })

  it('USD 조회 중 JPY로 변경되면 USD 환율을 반영하지 않는다', () => {
    const result = shouldApplyOfficialRateToInput('USD', 'JPY', {
      applied: true,
      requestId: 1,
      latestRequestId: 1,
      baseRate: 1384.5,
    })

    expect(result).toBe(false)
  })

  it('오래된 요청 결과는 반영하지 않는다', () => {
    const result = shouldApplyOfficialRateToInput('USD', 'USD', {
      applied: false,
      requestId: 1,
      latestRequestId: 2,
      reason: 'stale',
    })

    expect(result).toBe(false)
  })
})
