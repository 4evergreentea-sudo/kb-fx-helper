import { describe, expect, it } from 'vitest'
import type {
  ConsultationRecord,
  ExchangeTransaction,
  RemittanceTransaction,
} from '../../../entities/transaction'
import { fromTransactionRow, toTransactionRow } from './transactionSupabaseMapper'
import type { TransactionRow } from './transactionSupabaseMapper'

const exchange: ExchangeTransaction = {
  id: 'tx-1',
  createdAt: '2026-07-12T00:00:00.000Z',
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

const remittance: RemittanceTransaction = {
  id: 'tx-2',
  createdAt: '2026-07-12T01:00:00.000Z',
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

const consultation: ConsultationRecord = {
  id: 'tx-3',
  createdAt: '2026-07-12T02:00:00.000Z',
  recordType: 'consultation',
  customerName: '테스트고객 B',
  currencyCode: 'JPY',
  amount: 100000,
  memo: '환전 상담 방문',
}

/** 마이그레이션 전 기존 exchange row(신규 컬럼이 아직 없는 형태를 흉내낸 것). null 대신 undefined로 컬럼 부재를 표현한다 */
const legacyExchangeRow = {
  id: 'legacy-1',
  created_at: '2025-01-01T00:00:00.000Z',
  currency_code: 'USD',
  transaction_type: 'sell',
  amount: 1000,
  base_rate: 1300,
  spread_rate: 1.5,
  preferential_rate: 50,
  applied_rate: 1298.05,
  krw_amount: 1298050,
  user_id: 'user-1',
} as unknown as TransactionRow

describe('transactionSupabaseMapper', () => {
  describe('exchange', () => {
    it('toTransactionRow는 record_type/customer_name/memo와 계산 필드를 채우고, 해당 없는 컬럼은 null이다', () => {
      const row = toTransactionRow(exchange, 'user-1')

      expect(row).toEqual({
        id: 'tx-1',
        created_at: '2026-07-12T00:00:00.000Z',
        record_type: 'exchange',
        customer_name: '테스트고객 A',
        memo: '여행 환전',
        currency_code: 'USD',
        amount: 500,
        transaction_type: 'buy',
        base_rate: 1540,
        spread_rate: 1.75,
        preferential_rate: 80,
        applied_rate: 1545.39,
        krw_amount: 772695,
        principal_krw: null,
        remittance_fee: null,
        cable_fee: null,
        total_withdrawal_krw: null,
        user_id: 'user-1',
      })
    })

    it('toTransactionRow → fromTransactionRow 왕복 변환은 원본과 동일한 값을 복원한다', () => {
      const row = toTransactionRow(exchange, 'user-1')

      expect(fromTransactionRow(row)).toEqual(exchange)
    })

    it('numeric 컬럼이 문자열로 내려와도 숫자로 안전하게 변환한다', () => {
      const row = toTransactionRow(exchange, 'user-1')
      const stringifiedRow: TransactionRow = {
        ...row,
        amount: String(row.amount),
        base_rate: String(row.base_rate),
        spread_rate: String(row.spread_rate),
        preferential_rate: String(row.preferential_rate),
        applied_rate: String(row.applied_rate),
        krw_amount: String(row.krw_amount),
      }

      expect(fromTransactionRow(stringifiedRow)).toEqual(exchange)
    })
  })

  describe('remittance', () => {
    it('toTransactionRow는 송금 전용 컬럼을 채우고 exchange 전용 컬럼은 null이다', () => {
      const row = toTransactionRow(remittance, 'user-1')

      expect(row).toEqual({
        id: 'tx-2',
        created_at: '2026-07-12T01:00:00.000Z',
        record_type: 'remittance',
        customer_name: '테스트고객 C',
        memo: '유학 자금 송금',
        currency_code: 'USD',
        amount: 1000,
        transaction_type: null,
        base_rate: 1400,
        spread_rate: 1.75,
        preferential_rate: 80,
        applied_rate: 1404.9,
        krw_amount: null,
        principal_krw: 1404900,
        remittance_fee: 5000,
        cable_fee: 8000,
        total_withdrawal_krw: 1417900,
        user_id: 'user-1',
      })
    })

    it('toTransactionRow → fromTransactionRow 왕복 변환은 원본과 동일한 값을 복원한다', () => {
      const row = toTransactionRow(remittance, 'user-1')

      expect(fromTransactionRow(row)).toEqual(remittance)
    })

    it('numeric 컬럼이 문자열로 내려와도 숫자로 안전하게 변환한다', () => {
      const row = toTransactionRow(remittance, 'user-1')
      const stringifiedRow: TransactionRow = {
        ...row,
        principal_krw: String(row.principal_krw),
        remittance_fee: String(row.remittance_fee),
        cable_fee: String(row.cable_fee),
        total_withdrawal_krw: String(row.total_withdrawal_krw),
      }

      expect(fromTransactionRow(stringifiedRow)).toEqual(remittance)
    })
  })

  describe('consultation', () => {
    it('toTransactionRow는 계산 관련 컬럼을 모두 null로 채운다', () => {
      const row = toTransactionRow(consultation, 'user-1')

      expect(row).toEqual({
        id: 'tx-3',
        created_at: '2026-07-12T02:00:00.000Z',
        record_type: 'consultation',
        customer_name: '테스트고객 B',
        memo: '환전 상담 방문',
        currency_code: 'JPY',
        amount: 100000,
        transaction_type: null,
        base_rate: null,
        spread_rate: null,
        preferential_rate: null,
        applied_rate: null,
        krw_amount: null,
        principal_krw: null,
        remittance_fee: null,
        cable_fee: null,
        total_withdrawal_krw: null,
        user_id: 'user-1',
      })
    })

    it('toTransactionRow → fromTransactionRow 왕복 변환은 원본과 동일한 값을 복원한다', () => {
      const row = toTransactionRow(consultation, 'user-1')

      expect(fromTransactionRow(row)).toEqual(consultation)
    })
  })

  describe('record_type 기반 타입 판별', () => {
    it('record_type 값에 따라 ExchangeTransaction/RemittanceTransaction/ConsultationRecord로 정확히 판별한다', () => {
      const exchangeResult = fromTransactionRow(toTransactionRow(exchange, 'user-1'))
      const remittanceResult = fromTransactionRow(toTransactionRow(remittance, 'user-1'))
      const consultationResult = fromTransactionRow(toTransactionRow(consultation, 'user-1'))

      expect(exchangeResult?.recordType).toBe('exchange')
      expect(remittanceResult?.recordType).toBe('remittance')
      expect(consultationResult?.recordType).toBe('consultation')
    })
  })

  describe('기존(마이그레이션 이전) Supabase row 호환', () => {
    it('record_type/customer_name/memo 컬럼이 없는 레거시 row는 exchange/빈 문자열로 안전하게 보정한다', () => {
      const result = fromTransactionRow(legacyExchangeRow)

      expect(result).toEqual({
        id: 'legacy-1',
        createdAt: '2025-01-01T00:00:00.000Z',
        recordType: 'exchange',
        customerName: '',
        memo: '',
        currencyCode: 'USD',
        transactionType: 'sell',
        amount: 1000,
        baseRate: 1300,
        spreadRate: 1.5,
        preferentialRate: 50,
        appliedRate: 1298.05,
        krwAmount: 1298050,
      })
    })

    it('record_type이 null인 row도 exchange로 취급한다', () => {
      const row: TransactionRow = { ...toTransactionRow(exchange, 'user-1'), record_type: null }

      expect(fromTransactionRow(row)?.recordType).toBe('exchange')
    })
  })

  describe('잘못된 row 처리', () => {
    it('숫자로 변환할 수 없는 계산 필드가 있으면 null을 반환한다(앱을 중단시키지 않음)', () => {
      const row: TransactionRow = {
        ...toTransactionRow(exchange, 'user-1'),
        base_rate: 'not-a-number',
      }

      expect(fromTransactionRow(row)).toBeNull()
    })

    it('지원하지 않는 currency_code를 가진 row는 null을 반환한다', () => {
      const row: TransactionRow = { ...toTransactionRow(exchange, 'user-1'), currency_code: 'XXX' }

      expect(fromTransactionRow(row)).toBeNull()
    })

    it('알 수 없는 record_type을 가진 row는 null을 반환한다', () => {
      const row: TransactionRow = {
        ...toTransactionRow(exchange, 'user-1'),
        record_type: 'unknown-type',
      }

      expect(fromTransactionRow(row)).toBeNull()
    })

    it('필수 필드(amount)가 숫자로 변환되지 않으면 null을 반환한다', () => {
      const row: TransactionRow = { ...toTransactionRow(exchange, 'user-1'), amount: 'invalid' }

      expect(fromTransactionRow(row)).toBeNull()
    })
  })
})
