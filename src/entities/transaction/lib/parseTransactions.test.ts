import { describe, expect, it } from 'vitest'
import { parseTransactions } from './parseTransactions'
import type { ConsultationRecord, ExchangeTransaction, RemittanceTransaction } from '../model/types'

describe('parseTransactions', () => {
  const validTransaction: ExchangeTransaction = {
    id: 'tx-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    recordType: 'exchange',
    customerName: '테스트고객 A',
    currencyCode: 'USD',
    transactionType: 'buy',
    amount: 500,
    baseRate: 1540,
    spreadRate: 1.75,
    preferentialRate: 80,
    appliedRate: 1545.39,
    krwAmount: 772695,
    memo: '',
  }

  const validConsultation: ConsultationRecord = {
    id: 'tx-consult-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    recordType: 'consultation',
    customerName: '테스트고객 B',
    currencyCode: 'JPY',
    amount: 100000,
    memo: '환전 상담 방문',
  }

  const validRemittance: RemittanceTransaction = {
    id: 'tx-remit-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    recordType: 'remittance',
    customerName: '테스트고객 C',
    currencyCode: 'USD',
    amount: 1000,
    baseRate: 1400,
    spreadRate: 1.75,
    preferentialRate: 80,
    appliedRate: 1404.9,
    principalKRW: 1404900,
    remittanceFee: 5000,
    cableFee: 8000,
    totalWithdrawalKRW: 1417900,
    memo: '',
  }

  it('정상적인 Transaction(환전/해외송금/상담) 배열은 그대로 반환한다(기존 환전/상담 회귀 방지)', () => {
    expect(
      parseTransactions([validTransaction, validRemittance, validConsultation]),
    ).toEqual([validTransaction, validRemittance, validConsultation])
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
    const another: ExchangeTransaction = { ...validTransaction, id: 'tx-3' }

    expect(parseTransactions([validTransaction, missingField, wrongType, another])).toEqual([
      validTransaction,
      another,
    ])
  })

  it('recordType/customerName/memo가 없는 레거시 데이터도 살아남는다(회귀 방지)', () => {
    const legacy = {
      id: 'legacy-1',
      createdAt: '2025-01-01T00:00:00.000Z',
      currencyCode: 'USD',
      transactionType: 'sell',
      amount: 1000,
      baseRate: 1300,
      spreadRate: 1.5,
      preferentialRate: 50,
      appliedRate: 1298.05,
      krwAmount: 1298050,
    }

    const result = parseTransactions([legacy, validTransaction])

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      ...legacy,
      recordType: 'exchange',
      customerName: '',
      memo: '',
    })
    expect(result[1]).toEqual(validTransaction)
  })
})
