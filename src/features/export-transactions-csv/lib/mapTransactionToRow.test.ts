import { describe, expect, it } from 'vitest'
import type {
  ConsultationRecord,
  ExchangeTransaction,
  RemittanceTransaction,
} from '../../../entities/transaction'
import { mapTransactionToRow } from './mapTransactionToRow'

const baseTransaction: ExchangeTransaction = {
  id: 'tx-1',
  createdAt: new Date(2026, 6, 12, 14, 30, 0).toISOString(),
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
  memo: '여행 환전',
}

const baseRemittance: RemittanceTransaction = {
  id: 'tx-remit-1',
  createdAt: new Date(2026, 6, 12, 16, 0, 0).toISOString(),
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
  memo: '유학 자금 송금',
}

const baseConsultation: ConsultationRecord = {
  id: 'tx-consult-1',
  createdAt: new Date(2026, 6, 12, 15, 0, 0).toISOString(),
  recordType: 'consultation',
  customerName: '테스트고객 B',
  currencyCode: 'JPY',
  amount: 100000,
  memo: '환전 상담 방문',
}

describe('mapTransactionToRow', () => {
  it('환전 기록은 16개 컬럼을 정해진 순서로 모두 채워 반환한다', () => {
    expect(mapTransactionToRow(baseTransaction)).toEqual([
      '환전',
      '테스트고객 A',
      '2026-07-12 14:30:00',
      'USD (미국 달러)',
      '매입',
      '500',
      '1540',
      '1.75',
      '80',
      '1545.39',
      '772695',
      '',
      '',
      '',
      '',
      '여행 환전',
    ])
    expect(mapTransactionToRow(baseTransaction)).toHaveLength(16)
  })

  it('거래구분 buy는 매입, sell은 매도로 매핑한다', () => {
    expect(mapTransactionToRow({ ...baseTransaction, transactionType: 'buy' })[4]).toBe('매입')
    expect(mapTransactionToRow({ ...baseTransaction, transactionType: 'sell' })[4]).toBe('매도')
  })

  it('통화 코드와 표시명을 함께 "코드 (표시명)" 형식으로 반환한다', () => {
    expect(mapTransactionToRow({ ...baseTransaction, currencyCode: 'JPY' })[3]).toBe(
      'JPY (일본 엔)',
    )
  })

  it('기록구분은 exchange → 환전, remittance → 해외송금, consultation → 상담으로 표시한다', () => {
    expect(mapTransactionToRow(baseTransaction)[0]).toBe('환전')
    expect(mapTransactionToRow(baseRemittance)[0]).toBe('해외송금')
    expect(mapTransactionToRow(baseConsultation)[0]).toBe('상담')
  })

  it('고객명은 원본 값을 그대로 반환한다', () => {
    expect(mapTransactionToRow(baseTransaction)[1]).toBe('테스트고객 A')
    expect(mapTransactionToRow(baseRemittance)[1]).toBe('테스트고객 C')
    expect(mapTransactionToRow(baseConsultation)[1]).toBe('테스트고객 B')
  })

  it(
    '해외송금 기록은 거래구분/원화금액 칸만 비우고, ' +
      '기준환율/스프레드율/우대율/적용환율과 송금원금/송금수수료/전신료/총출금액은 채워 반환한다',
    () => {
      expect(mapTransactionToRow(baseRemittance)).toEqual([
        '해외송금',
        '테스트고객 C',
        '2026-07-12 16:00:00',
        'USD (미국 달러)',
        '',
        '1000',
        '1400',
        '1.75',
        '80',
        '1404.9',
        '',
        '1404900',
        '5000',
        '8000',
        '1417900',
        '유학 자금 송금',
      ])
      expect(mapTransactionToRow(baseRemittance)).toHaveLength(16)
    },
  )

  it('해외송금 기록도 예외(throw) 없이 처리한다(recordType 분기 회귀 방지)', () => {
    expect(() => mapTransactionToRow(baseRemittance)).not.toThrow()
  })

  it(
    '상담 기록은 기록구분/고객명/거래일시/통화/외화금액/메모만 채우고, ' +
      '계산 전용 컬럼 10개는 빈 문자열로 반환한다',
    () => {
      const row = mapTransactionToRow(baseConsultation)

      expect(row).toEqual([
        '상담',
        '테스트고객 B',
        '2026-07-12 15:00:00',
        'JPY (일본 엔)',
        '',
        '100000',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '환전 상담 방문',
      ])
      expect(row).toHaveLength(16)

      const blankCells = row.slice(4, 15).filter((_cell, index) => index !== 1)
      expect(blankCells.every((cell) => cell === '')).toBe(true)
      expect(blankCells).toHaveLength(10)
    },
  )

  it('고객명/메모가 빈 문자열인 레거시 기록도 예외 없이 빈 문자열 셀로 반환한다', () => {
    const legacy: ExchangeTransaction = { ...baseTransaction, customerName: '', memo: '' }
    const row = mapTransactionToRow(legacy)

    expect(row[1]).toBe('')
    expect(row[15]).toBe('')
  })
})
