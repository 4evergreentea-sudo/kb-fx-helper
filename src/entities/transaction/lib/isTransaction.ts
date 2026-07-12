import { SUPPORTED_CURRENCY_CODES } from '../../currency'
import type { CurrencyCode } from '../../currency'
import type { Transaction } from '../model/types'

const TRANSACTION_TYPES = ['buy', 'sell']

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isSupportedCurrencyCode(value: unknown): value is CurrencyCode {
  return (
    typeof value === 'string' &&
    SUPPORTED_CURRENCY_CODES.includes(value as CurrencyCode)
  )
}

/**
 * localStorage 등 외부에서 읽어온 값이 유효한 Transaction 형태인지 검사한다.
 * 손상되었거나 필수 필드가 누락된 값은 false를 반환해 화면에 렌더링되지 않도록 한다.
 */
export function isTransaction(value: unknown): value is Transaction {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.createdAt === 'string' &&
    candidate.createdAt.length > 0 &&
    isSupportedCurrencyCode(candidate.currencyCode) &&
    typeof candidate.transactionType === 'string' &&
    TRANSACTION_TYPES.includes(candidate.transactionType) &&
    isFiniteNumber(candidate.amount) &&
    isFiniteNumber(candidate.baseRate) &&
    isFiniteNumber(candidate.spreadRate) &&
    isFiniteNumber(candidate.preferentialRate) &&
    isFiniteNumber(candidate.appliedRate) &&
    isFiniteNumber(candidate.krwAmount)
  )
}
