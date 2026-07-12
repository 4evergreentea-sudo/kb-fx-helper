import { formatKRW, formatRate } from '../../shared/lib'

interface ExchangeResultProps {
  /** 적용환율. 계산 전이거나 검증 실패 시 null */
  appliedRate: number | null
  /** 원화금액. 계산 전이거나 검증 실패 시 null */
  krwAmount: number | null
}

/** 계산된 적용환율/원화금액 표시만 담당한다. 거래 저장은 TransactionSaveForm이 담당한다 */
export function ExchangeResult({ appliedRate, krwAmount }: ExchangeResultProps) {
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        환산 결과
      </h3>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
            적용환율
          </dt>
          <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {appliedRate !== null ? formatRate(appliedRate) : '-'}
          </dd>
        </div>

        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
            원화금액
          </dt>
          <dd className="mt-1 text-2xl font-semibold text-blue-700 dark:text-blue-400">
            {krwAmount !== null ? formatKRW(krwAmount) : '-'}
          </dd>
        </div>
      </div>
    </div>
  )
}
