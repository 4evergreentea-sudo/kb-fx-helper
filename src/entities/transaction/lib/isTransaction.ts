import { SUPPORTED_CURRENCY_CODES } from '../../../shared/model'
import type { CurrencyCode } from '../../../shared/model'
import type {
  ConsultationRecord,
  ExchangeTransaction,
  RemittanceTransaction,
  Transaction,
} from '../model/types'

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
 * 모든 거래기록(환전/상담)이 공통으로 가져야 하는 필드를 검사한다.
 * customerName/memo는 "필수로 채워져 있어야 한다"가 아니라 "문자열이어야 한다"만 검사한다.
 * 빈 문자열도 유효하며, 화면에는 formatOrPlaceholder() 등으로 '미입력'을 보여주면 된다.
 */
function hasValidBaseFields(candidate: Record<string, unknown>): boolean {
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.createdAt === 'string' &&
    candidate.createdAt.length > 0 &&
    isSupportedCurrencyCode(candidate.currencyCode) &&
    typeof candidate.customerName === 'string' &&
    typeof candidate.memo === 'string' &&
    isFiniteNumber(candidate.amount)
  )
}

/**
 * 환전(exchange)·해외송금(remittance) 거래가 공통으로 갖는 환율 필드(기준환율/스프레드율/
 * 우대율/적용환율)가 모두 유한수인지 검사한다. 이 type guard는 "형태가 숫자다"만 검사할 뿐,
 * 양수/0 여부 같은 업무 규칙은 검사하지 않는다(0도 구조적으로는 유효한 finite number다).
 * 값의 범위(0 초과 등)를 강제하는 업무 검증은 validateTransactionRecord.ts가 별도로 담당한다.
 */
function hasValidRateFields(candidate: Record<string, unknown>): boolean {
  return (
    isFiniteNumber(candidate.baseRate) &&
    isFiniteNumber(candidate.spreadRate) &&
    isFiniteNumber(candidate.preferentialRate) &&
    isFiniteNumber(candidate.appliedRate)
  )
}

/**
 * localStorage/Supabase 등 외부에서 읽어온 값이 유효한 ExchangeTransaction 형태인지 검사한다.
 * migrateLegacyTransaction()으로 정규화된 값을 입력으로 받는 것을 전제로 한다.
 */
export function isExchangeTransaction(value: unknown): value is ExchangeTransaction {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    candidate.recordType === 'exchange' &&
    hasValidBaseFields(candidate) &&
    typeof candidate.transactionType === 'string' &&
    TRANSACTION_TYPES.includes(candidate.transactionType) &&
    hasValidRateFields(candidate) &&
    isFiniteNumber(candidate.krwAmount)
  )
}

/**
 * localStorage/Supabase 등 외부에서 읽어온 값이 유효한 RemittanceTransaction 형태인지 검사한다.
 * migrateLegacyTransaction()으로 정규화된 값을 입력으로 받는 것을 전제로 한다.
 */
export function isRemittanceTransaction(value: unknown): value is RemittanceTransaction {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    candidate.recordType === 'remittance' &&
    hasValidBaseFields(candidate) &&
    hasValidRateFields(candidate) &&
    isFiniteNumber(candidate.principalKRW) &&
    isFiniteNumber(candidate.remittanceFee) &&
    isFiniteNumber(candidate.cableFee) &&
    isFiniteNumber(candidate.totalWithdrawalKRW)
  )
}

/**
 * localStorage 등 외부에서 읽어온 값이 유효한 ConsultationRecord 형태인지 검사한다.
 * 계산 필드는 검사하지 않는다(존재하지 않아야 하는 것이 정상이다).
 */
export function isConsultationRecord(value: unknown): value is ConsultationRecord {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return candidate.recordType === 'consultation' && hasValidBaseFields(candidate)
}

/**
 * localStorage/Supabase 등 외부에서 읽어온 값이 유효한 Transaction(환전, 해외송금 또는 상담)
 * 형태인지 검사한다.
 * 손상되었거나 필수 필드가 누락된 값은 false를 반환해 화면에 렌더링되지 않도록 한다.
 */
export function isTransaction(value: unknown): value is Transaction {
  return (
    isExchangeTransaction(value) ||
    isRemittanceTransaction(value) ||
    isConsultationRecord(value)
  )
}
