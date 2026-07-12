import { describe, expect, it } from 'vitest'
import { createExchangeTransaction } from './createExchangeTransaction'

describe('createExchangeTransaction', () => {
  const baseInput = {
    recordType: 'exchange' as const,
    customerName: '테스트고객 A',
    currencyCode: 'USD' as const,
    transactionType: 'buy' as const,
    amount: 500,
    baseRate: 1540,
    spreadRate: 1.75,
    preferentialRate: 80,
    appliedRate: 1545.39,
    krwAmount: 772695,
    memo: '',
  }

  it('주입한 clock을 사용해 id와 createdAt을 결정적으로 생성한다', () => {
    const transaction = createExchangeTransaction(baseInput, {
      createId: () => 'fixed-id',
      now: () => '2026-01-01T00:00:00.000Z',
    })

    expect(transaction).toEqual({
      ...baseInput,
      id: 'fixed-id',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
  })

  it('clock을 주입하지 않으면 실제 crypto.randomUUID/Date로 값을 생성한다', () => {
    const transaction = createExchangeTransaction(baseInput)

    expect(typeof transaction.id).toBe('string')
    expect(transaction.id.length).toBeGreaterThan(0)
    expect(() => new Date(transaction.createdAt)).not.toThrow()
    expect(Number.isNaN(new Date(transaction.createdAt).getTime())).toBe(false)
  })

  it('계산 필드가 그대로 보존된다', () => {
    const transaction = createExchangeTransaction(baseInput, {
      createId: () => 'fixed-id',
      now: () => '2026-01-01T00:00:00.000Z',
    })

    expect(transaction.recordType).toBe('exchange')
    expect(transaction.baseRate).toBe(1540)
    expect(transaction.krwAmount).toBe(772695)
  })
})
