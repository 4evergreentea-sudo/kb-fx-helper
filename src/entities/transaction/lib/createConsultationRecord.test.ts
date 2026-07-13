import { describe, expect, it } from 'vitest'
import { createConsultationRecord } from './createConsultationRecord'

describe('createConsultationRecord', () => {
  const baseInput = {
    recordType: 'consultation' as const,
    customerName: '테스트고객 B',
    currencyCode: 'JPY' as const,
    amount: 100000,
    memo: '환전 상담 방문, 다음 주 재방문 예정',
  }

  it('주입한 clock을 사용해 id와 createdAt을 결정적으로 생성한다', () => {
    const record = createConsultationRecord(baseInput, {
      createId: () => 'fixed-id',
      now: () => '2026-01-01T00:00:00.000Z',
    })

    expect(record).toEqual({
      ...baseInput,
      id: 'fixed-id',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
  })

  it('clock을 주입하지 않으면 실제 crypto.randomUUID/Date로 값을 생성한다', () => {
    const record = createConsultationRecord(baseInput)

    expect(typeof record.id).toBe('string')
    expect(record.id.length).toBeGreaterThan(0)
    expect(() => new Date(record.createdAt)).not.toThrow()
  })

  it('계산 필드(baseRate 등)를 전혀 포함하지 않는다', () => {
    const record = createConsultationRecord(baseInput)

    expect(record).not.toHaveProperty('baseRate')
    expect(record).not.toHaveProperty('appliedRate')
    expect(record).not.toHaveProperty('krwAmount')
  })
})
