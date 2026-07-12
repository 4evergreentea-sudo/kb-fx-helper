import { describe, expect, it } from 'vitest'
import type { Transaction } from '../../../entities/transaction'
import { mapTransactionToRow } from './mapTransactionToRow'

const baseTransaction: Transaction = {
  id: 'tx-1',
  createdAt: new Date(2026, 6, 12, 14, 30, 0).toISOString(),
  currencyCode: 'USD',
  transactionType: 'buy',
  amount: 500,
  baseRate: 1540,
  spreadRate: 1.75,
  preferentialRate: 80,
  appliedRate: 1545.39,
  krwAmount: 772695,
}

describe('mapTransactionToRow', () => {
  it('9개 컬럼을 정해진 순서로 반환한다', () => {
    expect(mapTransactionToRow(baseTransaction)).toEqual([
      '2026-07-12 14:30:00',
      'USD (미국 달러)',
      '매입',
      '500',
      '1540',
      '1.75',
      '80',
      '1545.39',
      '772695',
    ])
  })

  it('거래구분 buy는 매입, sell은 매도로 매핑한다', () => {
    expect(mapTransactionToRow({ ...baseTransaction, transactionType: 'buy' })[2]).toBe(
      '매입',
    )
    expect(mapTransactionToRow({ ...baseTransaction, transactionType: 'sell' })[2]).toBe(
      '매도',
    )
  })

  it('통화 코드와 표시명을 함께 "코드 (표시명)" 형식으로 반환한다', () => {
    expect(
      mapTransactionToRow({ ...baseTransaction, currencyCode: 'JPY' })[1],
    ).toBe('JPY (일본 엔)')
  })
})
