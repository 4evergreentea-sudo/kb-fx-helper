import { getCurrency } from '../../../entities/currency'
import type { Transaction } from '../../../entities/transaction'
import type { TransactionType } from '../../../shared/model'
import { formatTransactionDateTime } from './formatTransactionDateTime'

const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  buy: '매입',
  sell: '매도',
}

const RECORD_TYPE_LABEL = {
  exchange: '환전',
  remittance: '해외송금',
  consultation: '상담',
} as const

/** 해당 recordType에 대응하지 않는 계산/전용 컬럼에 쓰는 빈 셀 */
const BLANK_CELL = ''

/** 컴파일 타임에 recordType 분기가 누락되지 않았는지 확인한다 */
function assertNever(value: never): never {
  throw new Error(`지원하지 않는 recordType: ${String(value)}`)
}

/**
 * 거래(환전, 해외송금 또는 상담) 1건을 CSV 16개 컬럼 순서(기록구분, 고객명, 거래일시, 통화,
 * 거래구분, 외화금액, 기준환율, 스프레드율, 우대율, 적용환율, 원화금액, 송금원금, 송금수수료,
 * 전신료, 총출금액, 메모)에 맞는 문자열 배열로 변환한다.
 * escape는 이 단계에서 하지 않고 원시 값만 만든다.
 * recordType에 대해 예외 없이(no throw) 처리해야 하며, 어떤 recordType도 CSV에서
 * 제외하는 정책은 두지 않는다. 해당 recordType에 없는 필드는 빈 문자열로 채운다.
 *
 * - 환전(exchange): 거래구분/기준환율/스프레드율/우대율/적용환율/원화금액을 모두 채우고,
 *   송금원금/송금수수료/전신료/총출금액은 빈 칸이다.
 * - 해외송금(remittance): 거래구분(매입/매도 개념 없음)과 원화금액(환전 전용 개념)은 빈 칸이며,
 *   기준환율/스프레드율/우대율/적용환율과 송금원금/송금수수료/전신료/총출금액을 채운다.
 * - 상담(consultation): 계산 관련 컬럼(거래구분/기준환율/스프레드율/우대율/적용환율/원화금액/
 *   송금원금/송금수수료/전신료/총출금액) 10개는 모두 빈 칸이다.
 */
export function mapTransactionToRow(transaction: Transaction): string[] {
  const currency = getCurrency(transaction.currencyCode)
  const currencyLabel = `${transaction.currencyCode} (${currency.displayName})`
  const dateTime = formatTransactionDateTime(transaction.createdAt)
  const recordTypeLabel = RECORD_TYPE_LABEL[transaction.recordType]

  if (transaction.recordType === 'exchange') {
    return [
      recordTypeLabel,
      transaction.customerName,
      dateTime,
      currencyLabel,
      TRANSACTION_TYPE_LABEL[transaction.transactionType],
      String(transaction.amount),
      String(transaction.baseRate),
      String(transaction.spreadRate),
      String(transaction.preferentialRate),
      String(transaction.appliedRate),
      String(transaction.krwAmount),
      BLANK_CELL, // 송금원금
      BLANK_CELL, // 송금수수료
      BLANK_CELL, // 전신료
      BLANK_CELL, // 총출금액
      transaction.memo,
    ]
  }

  if (transaction.recordType === 'remittance') {
    return [
      recordTypeLabel,
      transaction.customerName,
      dateTime,
      currencyLabel,
      BLANK_CELL, // 거래구분(매입/매도 개념 없음)
      String(transaction.amount),
      String(transaction.baseRate),
      String(transaction.spreadRate),
      String(transaction.preferentialRate),
      String(transaction.appliedRate),
      BLANK_CELL, // 원화금액(환전 전용, 대신 송금원금 컬럼을 사용)
      String(transaction.principalKRW),
      String(transaction.remittanceFee),
      String(transaction.cableFee),
      String(transaction.totalWithdrawalKRW),
      transaction.memo,
    ]
  }

  if (transaction.recordType === 'consultation') {
    return [
      recordTypeLabel,
      transaction.customerName,
      dateTime,
      currencyLabel,
      BLANK_CELL, // 거래구분
      String(transaction.amount),
      BLANK_CELL, // 기준환율
      BLANK_CELL, // 스프레드율
      BLANK_CELL, // 우대율
      BLANK_CELL, // 적용환율
      BLANK_CELL, // 원화금액
      BLANK_CELL, // 송금원금
      BLANK_CELL, // 송금수수료
      BLANK_CELL, // 전신료
      BLANK_CELL, // 총출금액
      transaction.memo,
    ]
  }

  return assertNever(transaction)
}
