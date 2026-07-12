import { describe, expect, it } from 'vitest'
import { parseTransactions } from './parseTransactions'
import type { Transaction } from '../model/types'

describe('parseTransactions', () => {
  const validTransaction: Transaction = {
    id: 'tx-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    currencyCode: 'USD',
    transactionType: 'buy',
    amount: 500,
    baseRate: 1540,
    spreadRate: 1.75,
    preferentialRate: 80,
    appliedRate: 1545.39,
    krwAmount: 772695,
  }

  it('정상적인 Transaction 배열은 그대로 반환한다', () => {
    expect(parseTransactions([validTransaction])).toEqual([validTransaction])
  })

  it('배열이 아니면 빈 배열을 반환한다', () => {
    expect(parseTransactions(null)).toEqual([])
    expect(parseTransactions(undefined)).toEqual([])
    expect(parseTransactions('broken')).toEqual([])
    expect(parseTransactions({})).toEqual([])
  })

  it('필수 필드가 누락된 항목만 제외하고 나머지는 유지한다', () => {
    const missingField = { ...validTransaction, krwAmount: undefined }
    const wrongType = { ...validTransaction, id: 'tx-2', amount: 'not-a-number' }
    const another: Transaction = { ...validTransaction, id: 'tx-3' }

    expect(parseTransactions([validTransaction, missingField, wrongType, another])).toEqual([
      validTransaction,
      another,
    ])
  })
})
