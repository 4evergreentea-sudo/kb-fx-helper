import { getCurrency } from '../../entities/currency'
import type { Transaction } from '../../entities/transaction'
import { formatKRW, formatOrPlaceholder, formatRate } from '../../shared/lib'
import type { TransactionType } from '../../shared/model'
import { formatDateTime } from './lib/formatDateTime'

interface TransactionRowProps {
  transaction: Transaction
  onDelete: (id: string) => void
}

const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  buy: '매입',
  sell: '매도',
}

/** recordType별로 목록에서 거래기록 종류를 구분해 보여주기 위한 한국어 라벨 */
const RECORD_TYPE_LABEL = {
  exchange: '환전',
  remittance: '해외송금',
  consultation: '상담',
} as const

/**
 * 거래기록 1건을 표시한다. recordType(환전/해외송금/상담)에 따라 보여주는 상세 정보가 다르다.
 * - 환전: 거래구분(매입/매도), 적용환율, 원화금액(krwAmount)
 * - 해외송금: 적용환율, 송금 원금, 송금수수료, 전신료, 총 출금액
 * - 상담: 계산 필드 없이 최소한의 정보만 표시
 * customerName/memo는 과거 데이터에 없을 수 있어 formatOrPlaceholder()로 '미입력'을 표시한다.
 */
export function TransactionRow({ transaction, onDelete }: TransactionRowProps) {
  const currency = getCurrency(transaction.currencyCode)

  return (
    <li className="flex flex-col gap-3 rounded-md border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {currency.displayName} ({transaction.currencyCode}) ·{' '}
          {RECORD_TYPE_LABEL[transaction.recordType]}
          {transaction.recordType === 'exchange' && (
            <> · {TRANSACTION_TYPE_LABEL[transaction.transactionType]}</>
          )}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          고객명 {formatOrPlaceholder(transaction.customerName)} ·{' '}
          {formatDateTime(transaction.createdAt)} · 외화{' '}
          {transaction.amount.toLocaleString('ko-KR')}
          {(transaction.recordType === 'exchange' ||
            transaction.recordType === 'remittance') && (
            <> · 적용환율 {formatRate(transaction.appliedRate)}</>
          )}
        </p>
        {transaction.recordType === 'remittance' && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            송금원금 {formatKRW(transaction.principalKRW)} · 송금수수료{' '}
            {formatKRW(transaction.remittanceFee)} · 전신료{' '}
            {formatKRW(transaction.cableFee)}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          메모 {formatOrPlaceholder(transaction.memo)}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center sm:gap-2">
        {transaction.recordType === 'exchange' && (
          <span className="text-base font-semibold text-blue-700 dark:text-blue-400">
            {formatKRW(transaction.krwAmount)}
          </span>
        )}
        {transaction.recordType === 'remittance' && (
          <span className="text-base font-semibold text-blue-700 dark:text-blue-400">
            {formatKRW(transaction.totalWithdrawalKRW)}
          </span>
        )}
        <button
          type="button"
          onClick={() => onDelete(transaction.id)}
          className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
        >
          삭제
        </button>
      </div>
    </li>
  )
}
