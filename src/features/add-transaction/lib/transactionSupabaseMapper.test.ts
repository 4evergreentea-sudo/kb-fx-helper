import { describe, expect, it } from 'vitest'
import type { Transaction } from '../../../entities/transaction'
import { fromTransactionRow, toTransactionRow } from './transactionSupabaseMapper'

const transaction: Transaction = {
  id: 'tx-1',
  createdAt: '2026-07-12T00:00:00.000Z',
  currencyCode: 'USD',
  transactionType: 'buy',
  amount: 500,
  baseRate: 1540,
  spreadRate: 1.75,
  preferentialRate: 80,
  appliedRate: 1545.39,
  krwAmount: 772695,
}

describe('transactionSupabaseMapper', () => {
  it('toTransactionRow는 user_id를 포함한 snake_case row를 만든다', () => {
    const row = toTransactionRow(transaction, 'user-1')

    expect(row).toEqual({
      id: 'tx-1',
      created_at: '2026-07-12T00:00:00.000Z',
      currency_code: 'USD',
      transaction_type: 'buy',
      amount: 500,
      base_rate: 1540,
      spread_rate: 1.75,
      preferential_rate: 80,
      applied_rate: 1545.39,
      krw_amount: 772695,
      user_id: 'user-1',
    })
  })

  it('fromTransactionRow는 user_id를 제외한 도메인 Transaction으로 되돌린다', () => {
    const row = toTransactionRow(transaction, 'user-1')

    expect(fromTransactionRow(row)).toEqual(transaction)
  })

  it('toTransactionRow → fromTransactionRow 왕복 변환은 원본과 동일하다(user_id만 다른 사용자로 바뀌어도 무관)', () => {
    const row = toTransactionRow(transaction, 'user-2')

    expect(fromTransactionRow(row)).toEqual(transaction)
  })
})
