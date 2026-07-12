import { getCurrency } from '../../entities/currency'
import type { Transaction } from '../../features/add-transaction'
import { formatKRW, formatRate } from '../../shared/lib'
import { formatDateTime } from './lib/formatDateTime'

interface TransactionRowProps {
  transaction: Transaction
  onDelete: (id: string) => void
}

const TRANSACTION_TYPE_LABEL: Record<Transaction['transactionType'], string> = {
  buy: '매입',
  sell: '매도',
}

export function TransactionRow({ transaction, onDelete }: TransactionRowProps) {
  const currency = getCurrency(transaction.currencyCode)

  return (
    <li className="flex flex-col gap-3 rounded-md border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {currency.displayName} ({transaction.currencyCode}) ·{' '}
          {TRANSACTION_TYPE_LABEL[transaction.transactionType]}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {formatDateTime(transaction.createdAt)} · 적용환율{' '}
          {formatRate(transaction.appliedRate)} · 외화{' '}
          {transaction.amount.toLocaleString('ko-KR')}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center sm:gap-2">
        <span className="text-base font-semibold text-blue-700 dark:text-blue-400">
          {formatKRW(transaction.krwAmount)}
        </span>
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
