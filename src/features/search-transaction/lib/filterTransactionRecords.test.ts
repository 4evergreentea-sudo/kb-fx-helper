import { describe, expect, it } from 'vitest'
import type {
  ConsultationRecord,
  ExchangeTransaction,
  RemittanceTransaction,
} from '../../../entities/transaction'
import { filterTransactionRecords } from './filterTransactionRecords'

const exchangeRecord: ExchangeTransaction = {
  id: 'tx-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  recordType: 'exchange',
  customerName: '홍길동',
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

const remittanceRecord: RemittanceTransaction = {
  id: 'tx-2',
  createdAt: '2026-01-02T00:00:00.000Z',
  recordType: 'remittance',
  customerName: '김철수',
  currencyCode: 'JPY',
  amount: 100000,
  baseRate: 980,
  spreadRate: 1.75,
  preferentialRate: 0,
  appliedRate: 997.15,
  principalKRW: 997150,
  remittanceFee: 3000,
  cableFee: 5000,
  totalWithdrawalKRW: 1005150,
  memo: '유학 자금 송금',
}

const consultationRecord: ConsultationRecord = {
  id: 'tx-3',
  createdAt: '2026-01-03T00:00:00.000Z',
  recordType: 'consultation',
  customerName: '이영희',
  currencyCode: 'EUR',
  amount: 2000,
  memo: '환전 상담 방문, 다음 주 재방문 예정',
}

const allRecords = [exchangeRecord, remittanceRecord, consultationRecord]

describe('filterTransactionRecords', () => {
  it('고객명으로 검색한다', () => {
    expect(filterTransactionRecords(allRecords, '홍길동')).toEqual([exchangeRecord])
  })

  it('통화코드 USD로 검색한다', () => {
    expect(filterTransactionRecords(allRecords, 'USD')).toEqual([exchangeRecord])
  })

  it('통화 표시명(미국 달러)으로 검색한다', () => {
    expect(filterTransactionRecords(allRecords, '미국 달러')).toEqual([exchangeRecord])
  })

  it('메모로 검색한다', () => {
    expect(filterTransactionRecords(allRecords, '유학 자금')).toEqual([remittanceRecord])
  })

  it('영문 대소문자를 구분하지 않는다', () => {
    expect(filterTransactionRecords(allRecords, 'usd')).toEqual([exchangeRecord])
    expect(filterTransactionRecords(allRecords, 'Usd')).toEqual([exchangeRecord])
  })

  it('검색어 앞뒤 공백을 제거하고 검색한다', () => {
    expect(filterTransactionRecords(allRecords, '  홍길동  ')).toEqual([exchangeRecord])
  })

  it('빈 검색어면 전체를 반환한다', () => {
    expect(filterTransactionRecords(allRecords, '')).toEqual(allRecords)
    expect(filterTransactionRecords(allRecords, '   ')).toEqual(allRecords)
  })

  it('일치하는 기록이 없으면 빈 배열을 반환한다', () => {
    expect(filterTransactionRecords(allRecords, '존재하지않는키워드')).toEqual([])
  })

  it('환전/해외송금/상담 기록이 섞여 있어도 각 recordType을 모두 검색 대상으로 삼는다', () => {
    expect(filterTransactionRecords(allRecords, '김철수')).toEqual([remittanceRecord])
    expect(filterTransactionRecords(allRecords, '이영희')).toEqual([consultationRecord])
  })

  it('부분 일치로 검색한다', () => {
    expect(filterTransactionRecords(allRecords, '환전 상담')).toEqual([consultationRecord])
  })

  it('빈 배열을 검색해도 에러 없이 빈 배열을 반환한다', () => {
    expect(filterTransactionRecords([], '홍길동')).toEqual([])
    expect(filterTransactionRecords([], '')).toEqual([])
  })

  it('원본 배열을 변형하지 않는다(순수 함수)', () => {
    const original = [...allRecords]
    filterTransactionRecords(allRecords, '홍길동')
    expect(allRecords).toEqual(original)
  })
})
