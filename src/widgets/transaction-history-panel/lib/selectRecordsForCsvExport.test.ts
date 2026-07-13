import { describe, expect, it } from 'vitest'
import type { ConsultationRecord, ExchangeTransaction } from '../../../entities/transaction'
import { selectRecordsForCsvExport } from './selectRecordsForCsvExport'

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
  memo: '',
}

const consultationRecord: ConsultationRecord = {
  id: 'tx-2',
  createdAt: '2026-01-02T00:00:00.000Z',
  recordType: 'consultation',
  customerName: '김철수',
  currencyCode: 'JPY',
  amount: 100000,
  memo: '환전 상담 방문',
}

const allRecords = [exchangeRecord, consultationRecord]

describe('selectRecordsForCsvExport', () => {
  it('검색어가 비어 있으면 전체 기록을 그대로 반환한다', () => {
    expect(selectRecordsForCsvExport(allRecords, '')).toEqual(allRecords)
  })

  it('검색어가 있으면 검색 결과(일치하는 기록)만 반환한다(CSV로 전체가 아닌 검색 결과만 전달되는 구조 검증)', () => {
    const result = selectRecordsForCsvExport(allRecords, '홍길동')

    expect(result).toEqual([exchangeRecord])
    expect(result).not.toEqual(allRecords)
  })

  it('검색 결과가 없으면 빈 배열을 반환한다(CSV로 아무 기록도 전달되지 않음)', () => {
    expect(selectRecordsForCsvExport(allRecords, '존재하지않는키워드')).toEqual([])
  })

  it('검색어 앞뒤 공백을 trim한 뒤 필터링한다(filterTransactionRecords와 동일 규칙)', () => {
    expect(selectRecordsForCsvExport(allRecords, '  홍길동  ')).toEqual([exchangeRecord])
  })
})
