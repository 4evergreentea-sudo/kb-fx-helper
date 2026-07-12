import { useState } from 'react'
import { useTransactionHistory } from '../../features/add-transaction'
import { exportTransactionsToCsv } from '../../features/export-transactions-csv'
import { getSyncStatusLabel, getSyncStatusVariant } from './lib/getSyncStatusLabel'
import { TransactionRow } from './TransactionRow'

const SYNC_STATUS_BADGE_CLASSES: Record<string, string> = {
  idle: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  syncing: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  success: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
  error: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
}

export function TransactionHistoryPanel() {
  const {
    transactions,
    removeTransaction,
    isSupabaseEnabled,
    isSyncing,
    syncMessage,
    syncError,
    retrySync,
  } = useTransactionHistory()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const syncStatusLabel = getSyncStatusLabel({
    isSupabaseEnabled,
    isSyncing,
    syncMessage,
    syncError,
  })
  const syncStatusVariant = getSyncStatusVariant({
    isSupabaseEnabled,
    isSyncing,
    syncMessage,
    syncError,
  })

  function handleDelete(id: string) {
    const outcome = removeTransaction(id)
    setErrorMessage(
      outcome.success ? null : outcome.message ?? '거래를 삭제하지 못했습니다.',
    )
  }

  function handleExportCsv() {
    const outcome = exportTransactionsToCsv(transactions)
    setErrorMessage(
      outcome.success ? null : outcome.message ?? 'CSV로 내보내지 못했습니다.',
    )
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          거래기록
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            총 {transactions.length}건
          </span>
          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            CSV로 내보내기
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${SYNC_STATUS_BADGE_CLASSES[syncStatusVariant]}`}
        >
          {syncStatusLabel}
        </span>
        {syncStatusVariant === 'error' && (
          <button
            type="button"
            onClick={retrySync}
            className="text-xs font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
          >
            재동기화
          </button>
        )}
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-400"
        >
          {errorMessage}
        </p>
      )}

      {transactions.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          아직 저장된 거래가 없습니다. 환전을 계산한 뒤 저장해보세요.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {transactions.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
