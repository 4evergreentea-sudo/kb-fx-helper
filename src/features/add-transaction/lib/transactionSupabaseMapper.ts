import { isTransaction } from '../../../entities/transaction'
import type { Transaction } from '../../../entities/transaction'

/**
 * `transactions` 테이블의 row 형태(snake_case). 클라이언트 컬럼 이름과 1:1 대응한다.
 * 환전/해외송금/상담 공통 컬럼과 각 recordType 전용 컬럼을 모두 포함하며, 해당하지 않는
 * 계산 컬럼은 null이다(예: 상담 기록의 base_rate는 항상 null).
 * numeric 컬럼은 Postgres/PostgREST가 정밀도 손실을 막기 위해 문자열로 내려줄 수 있어
 * `number | string | null`로 받아 toNumberOrNull()에서 안전하게 숫자로 변환한다.
 */
export interface TransactionRow {
  id: string
  created_at: string
  record_type: string | null
  customer_name: string | null
  memo: string | null
  currency_code: string
  amount: number | string
  transaction_type: string | null
  base_rate: number | string | null
  spread_rate: number | string | null
  preferential_rate: number | string | null
  applied_rate: number | string | null
  krw_amount: number | string | null
  principal_krw: number | string | null
  remittance_fee: number | string | null
  cable_fee: number | string | null
  total_withdrawal_krw: number | string | null
  user_id: string
}

/**
 * 도메인 Transaction(환전/해외송금/상담)을 저장할 사용자(user_id)와 함께 테이블 row로 변환한다.
 * recordType별로 해당하지 않는 계산 컬럼은 null로 채운다.
 */
export function toTransactionRow(transaction: Transaction, userId: string): TransactionRow {
  const common = {
    id: transaction.id,
    created_at: transaction.createdAt,
    record_type: transaction.recordType,
    customer_name: transaction.customerName,
    memo: transaction.memo,
    currency_code: transaction.currencyCode,
    amount: transaction.amount,
    user_id: userId,
  }

  if (transaction.recordType === 'exchange') {
    return {
      ...common,
      transaction_type: transaction.transactionType,
      base_rate: transaction.baseRate,
      spread_rate: transaction.spreadRate,
      preferential_rate: transaction.preferentialRate,
      applied_rate: transaction.appliedRate,
      krw_amount: transaction.krwAmount,
      principal_krw: null,
      remittance_fee: null,
      cable_fee: null,
      total_withdrawal_krw: null,
    }
  }

  if (transaction.recordType === 'remittance') {
    return {
      ...common,
      transaction_type: null,
      base_rate: transaction.baseRate,
      spread_rate: transaction.spreadRate,
      preferential_rate: transaction.preferentialRate,
      applied_rate: transaction.appliedRate,
      krw_amount: null,
      principal_krw: transaction.principalKRW,
      remittance_fee: transaction.remittanceFee,
      cable_fee: transaction.cableFee,
      total_withdrawal_krw: transaction.totalWithdrawalKRW,
    }
  }

  return {
    ...common,
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
  }
}

/**
 * numeric 컬럼 값을 숫자로 안전하게 변환한다.
 * Postgres numeric 컬럼은 정밀도 보존을 위해 문자열로 내려올 수 있고, 해당하지 않는
 * 계산 컬럼은 null일 수 있다. 숫자로 변환할 수 없으면 null을 반환한다(예외를 던지지 않음).
 */
function toNumberOrNull(value: number | string | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

/**
 * 테이블 row를 도메인 Transaction(환전/해외송금/상담)으로 변환한다.
 * user_id는 도메인 모델에 포함하지 않는다(entities/transaction은 소유자 개념을 모른다).
 * record_type/customer_name/memo 컬럼이 비어 있는 마이그레이션 이전 레거시 row는
 * record_type: 'exchange', customer_name/memo: ''로 안전하게 보정한다(마이그레이션 SQL이
 * 동일한 방식으로 백필하므로 실제 운영 환경에서는 방어적 처리에 해당한다).
 * 형태가 올바르지 않은 row(숫자로 변환할 수 없는 계산 필드, 알 수 없는 recordType 등)는
 * 앱을 중단시키지 않고 null을 반환해 호출하는 쪽에서 제외하도록 한다.
 */
export function fromTransactionRow(row: TransactionRow): Transaction | null {
  const raw = {
    id: row.id,
    createdAt: row.created_at,
    recordType: row.record_type ?? 'exchange',
    customerName: row.customer_name ?? '',
    memo: row.memo ?? '',
    currencyCode: row.currency_code,
    amount: toNumberOrNull(row.amount),
    transactionType: row.transaction_type,
    baseRate: toNumberOrNull(row.base_rate),
    spreadRate: toNumberOrNull(row.spread_rate),
    preferentialRate: toNumberOrNull(row.preferential_rate),
    appliedRate: toNumberOrNull(row.applied_rate),
    krwAmount: toNumberOrNull(row.krw_amount),
    principalKRW: toNumberOrNull(row.principal_krw),
    remittanceFee: toNumberOrNull(row.remittance_fee),
    cableFee: toNumberOrNull(row.cable_fee),
    totalWithdrawalKRW: toNumberOrNull(row.total_withdrawal_krw),
  }

  if (!isTransaction(raw)) {
    return null
  }

  const { id, createdAt, customerName, currencyCode, amount, memo } = raw

  if (raw.recordType === 'exchange') {
    return {
      id,
      createdAt,
      recordType: 'exchange',
      customerName,
      currencyCode,
      amount,
      memo,
      transactionType: raw.transactionType,
      baseRate: raw.baseRate,
      spreadRate: raw.spreadRate,
      preferentialRate: raw.preferentialRate,
      appliedRate: raw.appliedRate,
      krwAmount: raw.krwAmount,
    }
  }

  if (raw.recordType === 'remittance') {
    return {
      id,
      createdAt,
      recordType: 'remittance',
      customerName,
      currencyCode,
      amount,
      memo,
      baseRate: raw.baseRate,
      spreadRate: raw.spreadRate,
      preferentialRate: raw.preferentialRate,
      appliedRate: raw.appliedRate,
      principalKRW: raw.principalKRW,
      remittanceFee: raw.remittanceFee,
      cableFee: raw.cableFee,
      totalWithdrawalKRW: raw.totalWithdrawalKRW,
    }
  }

  return {
    id,
    createdAt,
    recordType: 'consultation',
    customerName,
    currencyCode,
    amount,
    memo,
  }
}
