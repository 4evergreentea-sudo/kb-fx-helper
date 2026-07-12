import { getCurrency } from '../../../entities/currency'
import type { Transaction } from '../../../entities/transaction'
import { formatTransactionDateTime } from './formatTransactionDateTime'

const TRANSACTION_TYPE_LABEL: Record<Transaction['transactionType'], string> = {
  buy: '매입',
  sell: '매도',
}

/**
 * 거래 1건을 CSV 컬럼 순서(거래일시, 통화, 거래구분, 외화금액, 기준환율,
 * 스프레드율, 우대율, 적용환율, 원화금액)에 맞는 문자열 배열로 변환한다.
 * escape는 이 단계에서 하지 않고 원시 값만 만든다.
 */
export function mapTransactionToRow(transaction: Transaction): string[] {
  const currency = getCurrency(transaction.currencyCode)
  const currencyLabel = `${transaction.currencyCode} (${currency.displayName})`

  return [
    formatTransactionDateTime(transaction.createdAt),
    currencyLabel,
    TRANSACTION_TYPE_LABEL[transaction.transactionType],
    String(transaction.amount),
    String(transaction.baseRate),
    String(transaction.spreadRate),
    String(transaction.preferentialRate),
    String(transaction.appliedRate),
    String(transaction.krwAmount),
  ]
}
