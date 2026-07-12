import { describe, expect, it } from 'vitest'
import { createTransaction } from './createTransaction'

describe('createTransaction', () => {
  const baseInput = {
    currencyCode: 'USD' as const,
    transactionType: 'buy' as const,
    amount: 500,
    baseRate: 1540,
    spreadRate: 1.75,
    preferentialRate: 80,
    appliedRate: 1545.39,
    krwAmount: 772695,
  }

  it('주입한 clock을 사용해 id와 createdAt을 결정적으로 생성한다', () => {
    const transaction = createTransaction(baseInput, {
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
    const transaction = createTransaction(baseInput)

    expect(typeof transaction.id).toBe('string')
    expect(transaction.id.length).toBeGreaterThan(0)
    expect(() => new Date(transaction.createdAt)).not.toThrow()
    expect(Number.isNaN(new Date(transaction.createdAt).getTime())).toBe(false)
  })
})
