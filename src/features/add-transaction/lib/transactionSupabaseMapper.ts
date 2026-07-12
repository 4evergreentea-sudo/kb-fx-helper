import type { Transaction } from '../../../entities/transaction'

/** `transactions` 테이블의 row 형태(snake_case). 클라이언트 컬럼 이름과 1:1 대응한다 */
export interface TransactionRow {
  id: string
  created_at: string
  currency_code: string
  transaction_type: string
  amount: number
  base_rate: number
  spread_rate: number
  preferential_rate: number
  applied_rate: number
  krw_amount: number
  user_id: string
}

/** 도메인 Transaction을 저장할 사용자(user_id)와 함께 테이블 row로 변환한다 */
export function toTransactionRow(transaction: Transaction, userId: string): TransactionRow {
  return {
    id: transaction.id,
    created_at: transaction.createdAt,
    currency_code: transaction.currencyCode,
    transaction_type: transaction.transactionType,
    amount: transaction.amount,
    base_rate: transaction.baseRate,
    spread_rate: transaction.spreadRate,
    preferential_rate: transaction.preferentialRate,
    applied_rate: transaction.appliedRate,
    krw_amount: transaction.krwAmount,
    user_id: userId,
  }
}

/**
 * 테이블 row를 도메인 Transaction으로 변환한다.
 * user_id는 도메인 모델에 포함하지 않는다(entities/transaction은 소유자 개념을 모른다).
 * 반환값의 형태 검증(유효성 검사)은 이 함수의 책임이 아니며, 호출하는 쪽에서 `isTransaction`으로 검증해야 한다.
 */
export function fromTransactionRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    createdAt: row.created_at,
    currencyCode: row.currency_code as Transaction['currencyCode'],
    transactionType: row.transaction_type as Transaction['transactionType'],
    amount: row.amount,
    baseRate: row.base_rate,
    spreadRate: row.spread_rate,
    preferentialRate: row.preferential_rate,
    appliedRate: row.applied_rate,
    krwAmount: row.krw_amount,
  }
}
